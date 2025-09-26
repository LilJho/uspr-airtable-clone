import { supabase } from '../supabaseClient';

export type RoleType = 'member' | 'admin';

export type WorkspaceMember = {
  membership_id: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  role: RoleType;
  created_at: string;
};

export type BaseMember = {
  membership_id: string;
  user_id: string;
  email?: string | null;
  role: RoleType;
  created_at: string;
};

export type Invite = {
  id: string;
  email: string;
  invited_by: string;
  workspace_id?: string | null;
  base_id?: string | null;
  role: RoleType;
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  created_at: string;
};

export class MembershipService {
  // Workspace membership
  static async listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data, error } = await supabase
      .from('workspace_memberships')
      .select('id, user_id, role, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const memberships = (data ?? []).map((m: any) => ({
      membership_id: m.id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
    })) as WorkspaceMember[];

    // Fetch profile names in one batch for all user_ids
    const userIds = Array.from(new Set(memberships.map(m => m.user_id)));
    if (userIds.length === 0) return memberships;

    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    if (pErr) {
      // Non-fatal: return without names
      console.warn('Failed to load profile names for workspace members:', pErr);
      return memberships;
    }
    const idToName = new Map<string, string | null>((profiles ?? []).map((p: any) => [p.id, p.full_name ?? null]));
    return memberships.map(m => ({ ...m, full_name: idToName.get(m.user_id) ?? null }));
  }

  static async addWorkspaceMember(workspaceId: string, userId: string, role: RoleType = 'member'): Promise<void> {
    const { error } = await supabase
      .from('workspace_memberships')
      .insert({ workspace_id: workspaceId, user_id: userId, role });
    if (error) throw error;
  }

  static async updateWorkspaceMemberRole(membershipId: string, role: RoleType): Promise<void> {
    const { error } = await supabase
      .from('workspace_memberships')
      .update({ role })
      .eq('id', membershipId);
    if (error) throw error;
  }

  static async removeWorkspaceMember(membershipId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_memberships')
      .delete()
      .eq('id', membershipId);
    if (error) throw error;
  }

  // Base membership
  static async listBaseMembers(baseId: string): Promise<BaseMember[]> {
    const { data, error } = await supabase
      .from('base_memberships')
      .select('id, user_id, role, created_at')
      .eq('base_id', baseId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((m: any) => ({
      membership_id: m.id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
    }));
  }

  static async addBaseMember(baseId: string, userId: string, role: RoleType = 'member'): Promise<void> {
    const { error } = await supabase
      .from('base_memberships')
      .insert({ base_id: baseId, user_id: userId, role });
    if (error) throw error;
  }

  static async updateBaseMemberRole(membershipId: string, role: RoleType): Promise<void> {
    const { error } = await supabase
      .from('base_memberships')
      .update({ role })
      .eq('id', membershipId);
    if (error) throw error;
  }

  static async removeBaseMember(membershipId: string): Promise<void> {
    const { error } = await supabase
      .from('base_memberships')
      .delete()
      .eq('id', membershipId);
    if (error) throw error;
  }

  // Invites
  static async createInvite(params: { email: string; role: RoleType; workspaceId?: string; baseId?: string; token: string; redirectTo?: string; }): Promise<Invite> {
    const payload: any = {
      email: params.email,
      role: params.role,
      token: params.token,
      workspace_id: params.workspaceId ?? null,
      base_id: params.baseId ?? null,
    };
    const { data, error } = await supabase
      .from('invites')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;

    // Send email via magic link (works for both registered and unregistered users)
    // Redirect user back to accept page with this invite token after auth
    try {
      const redirectUrl = params.redirectTo ?? `${window.location.origin}/invites/accept/${params.token}`;
      await supabase.auth.signInWithOtp({
        email: params.email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
        },
      });
    } catch (e) {
      // Non-fatal: invite row exists; email may still be delivered by Supabase config
      console.warn('Failed to send magic link for invite:', e);
    }
    return data as Invite;
  }

  static async listMyInvites(): Promise<Invite[]> {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString());
    if (error) throw error;
    return (data ?? []) as Invite[];
  }

  static async acceptInvite(token: string, currentUserId: string, currentUserEmail?: string | null): Promise<void> {
    // Read the invite by token
    const { data: invite, error: fetchError } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .single();
    if (fetchError) throw fetchError;
    if (!invite) throw new Error('Invite not found');
    if (invite.status !== 'pending') throw new Error('Invite is not pending');
    if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired');
    if (currentUserEmail && invite.email && invite.email.toLowerCase() !== currentUserEmail.toLowerCase()) {
      throw new Error('Invite email does not match current user');
    }

    // Create membership based on scope
    if (invite.workspace_id) {
      const { error } = await supabase
        .from('workspace_memberships')
        .insert({ workspace_id: invite.workspace_id, user_id: currentUserId, role: invite.role });
      if (error) throw error;
    } else if (invite.base_id) {
      const { error } = await supabase
        .from('base_memberships')
        .insert({ base_id: invite.base_id, user_id: currentUserId, role: invite.role });
      if (error) throw error;
    } else {
      throw new Error('Invite scope is invalid');
    }

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from('invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);
    if (updateError) throw updateError;
  }

  static async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from('invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);
    if (error) throw error;
  }
}


