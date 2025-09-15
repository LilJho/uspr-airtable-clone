import { supabase } from '../supabaseClient';
import type { SupabaseUser } from '../types/dashboard';

export class AuthService {
  static async getCurrentUser(): Promise<SupabaseUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email ?? undefined
    };
  }

  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}
