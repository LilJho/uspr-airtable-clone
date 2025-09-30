import { useState, useCallback } from 'react';
import { WorkspaceService } from '../services/workspace-service';
import type { WorkspaceRecord, CreateWorkspaceFormData } from '../types/dashboard';
import { supabase } from '../supabaseClient';

export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [sharedWorkspaces, setSharedWorkspaces] = useState<Array<WorkspaceRecord & { owner_name?: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp.user?.id;
      
      // First get owned workspaces only (avoid duplicates with shared)
      const { data: ownerList, error: ownerError } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("owner", uid)
        .order("created_at", { ascending: true });
        
      if (ownerError) throw ownerError;
      
      // Handle first-time users with no workspaces
      if (!ownerList || ownerList.length === 0) {
        try {
          // Create a default workspace for first-time users
          const defaultWorkspace = await WorkspaceService.createDefaultWorkspace();
          setWorkspaces([defaultWorkspace]);
          
          // Still try to get shared workspaces
          const sharedWorkspaces = await getSharedWorkspaces(uid);
          setSharedWorkspaces(sharedWorkspaces);
          
          return defaultWorkspace.id;
        } catch (createErr) {
          console.error('Error creating default workspace:', createErr);
          throw createErr;
        }
      }
      
      // Get shared workspaces
      const sharedWorkspaces = await getSharedWorkspaces(uid);
      
      // Set state with results
      setWorkspaces(ownerList);
      setSharedWorkspaces(sharedWorkspaces);
      
      return ownerList[0]?.id ?? null;
      
      // Helper function to get shared workspaces
      async function getSharedWorkspaces(userId: string | undefined) {
        if (!userId) return [];
        
        try {
          // Get workspace IDs where user is a member
          const { data: memberships, error: mErr } = await supabase
            .from('workspace_memberships')
            .select('workspace_id')
            .eq('user_id', userId);
            
          if (mErr) {
            console.error('Error fetching memberships:', mErr);
            return [];
          }
          
          const ids = (memberships || []).map((m: any) => m.workspace_id);
          if (ids.length === 0) return [];
          
          // Get workspace details
          const { data: ws, error: wErr } = await supabase
            .from('workspaces')
            .select('id, name, owner')
            .in('id', ids)
            .neq('owner', userId);
            
          if (wErr) {
            console.error('Error fetching shared workspaces:', wErr);
            return [];
          }
          
          // Normalize and deduplicate results
          const normalized = (ws || []).map((w: any) => ({ id: w.id, name: w.name }));
          const uniqMap = new Map<string, { id: string; name: string }>();
          normalized.forEach((w) => uniqMap.set(w.id, w));
          return Array.from(uniqMap.values());
        } catch (err) {
          console.error('Error in getSharedWorkspaces:', err);
          return [];
        }
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Failed to load workspaces';
      setError(message);
      console.error('Error loading workspaces:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkspace = useCallback(async (formData: CreateWorkspaceFormData): Promise<WorkspaceRecord> => {
    try {
      setError(null);
      
      // Direct Supabase query for better error handling
      const { data, error } = await supabase
        .from("workspaces")
        .insert({ name: formData.name.trim() })
        .select("id, name")
        .single();
      
      if (error) {
        console.error('Supabase error creating workspace:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No workspace data returned after creation');
      }
      
      const newWorkspace = data as WorkspaceRecord;
      setWorkspaces(prev => [...prev, newWorkspace]);
      return newWorkspace;
    } catch (err: any) {
      // Detailed error handling with proper message extraction
      const message = err instanceof Error 
        ? err.message 
        : (typeof err === 'object' && err && 'message' in err) 
          ? String(err.message)
          : (typeof err === 'object' && err && 'details' in err)
            ? String(err.details)
            : 'Failed to create workspace';
      
      setError(message);
      console.error('Error creating workspace:', err);
      throw new Error(message); // Re-throw as proper Error
    }
  }, []);

  const updateWorkspace = useCallback(async (workspaceId: string, name: string): Promise<void> => {
    try {
      setError(null);
      await WorkspaceService.updateWorkspace(workspaceId, name);
      setWorkspaces(prev => prev.map(w => 
        w.id === workspaceId ? { ...w, name: name.trim() } : w
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update workspace';
      setError(message);
      throw err;
    }
  }, []);

  const deleteWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    try {
      setError(null);
      await WorkspaceService.deleteWorkspace(workspaceId);
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : (typeof err === 'object' && err && 'message' in (err as any) && (err as any).message)
          ? String((err as any).message)
          : (typeof err === 'object' && err && 'details' in (err as any) && (err as any).details)
            ? String((err as any).details)
            : 'Failed to delete workspace';
      setError(message);
      // Re-throw as a proper Error so upstream handlers receive a meaningful message
      throw new Error(message);
    }
  }, []);

  return {
    workspaces,
    sharedWorkspaces,
    loading,
    error,
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    clearError: () => setError(null)
  };
};
