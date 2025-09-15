import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '../services/auth-service';
import type { SupabaseUser } from '../types/dashboard';

export const useAuth = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkUser = useCallback(async (): Promise<void> => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const signOut = useCallback(async () => {
    try {
      await AuthService.signOut();
      router.push("/");
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [router]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  return {
    user,
    loading,
    signOut,
    checkUser
  };
};
