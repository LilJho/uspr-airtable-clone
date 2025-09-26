import { supabase } from '../supabaseClient';

export type Profile = {
  id: string;
  full_name: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export class ProfileService {
  static async getMyProfile(): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, middle_name, last_name, phone, created_at, updated_at')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .maybeSingle();
    if (error) throw error;
    return (data as Profile) ?? null;
  }

  static async updateMyProfile(updates: { first_name?: string | null; middle_name?: string | null; last_name?: string | null; phone?: string | null }): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    const uid = user.user?.id;
    if (!uid) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: uid, ...updates })
      .eq('id', uid);
    if (error) throw error;
  }

  static async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
}




