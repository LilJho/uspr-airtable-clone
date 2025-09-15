import { useState, useCallback } from 'react';
import { WorkspaceService } from '../services/workspace-service';
import type { WorkspaceRecord, CreateWorkspaceFormData } from '../types/dashboard';

export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const workspaceList = await WorkspaceService.getWorkspaces();
      
      if (workspaceList.length === 0) {
        // Create a default workspace for first-time users
        const defaultWorkspace = await WorkspaceService.createDefaultWorkspace();
        setWorkspaces([defaultWorkspace]);
        return defaultWorkspace.id;
      }
      
      setWorkspaces(workspaceList);
      return workspaceList[0]?.id ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workspaces';
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
      const newWorkspace = await WorkspaceService.createWorkspace(formData);
      setWorkspaces(prev => [...prev, newWorkspace]);
      return newWorkspace;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(message);
      throw err;
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
      const message = err instanceof Error ? err.message : 'Failed to delete workspace';
      setError(message);
      throw err;
    }
  }, []);

  return {
    workspaces,
    loading,
    error,
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    clearError: () => setError(null)
  };
};
