import { useState, useCallback } from 'react';
import { BaseService } from '../services/base-service';
import type { BaseRecord, CreateBaseFormData } from '../types/dashboard';

export const useBases = () => {
  const [recentBases, setRecentBases] = useState<BaseRecord[]>([]);
  const [workspaceBases, setWorkspaceBases] = useState<BaseRecord[]>([]);
  const [starredBases, setStarredBases] = useState<BaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecentBases = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const bases = await BaseService.getRecentBases();
      setRecentBases(bases);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load recent bases';
      setError(message);
      console.error('Error loading recent bases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWorkspaceBases = useCallback(async (workspaceId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const bases = await BaseService.getWorkspaceBases(workspaceId);
      setWorkspaceBases(bases);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workspace bases';
      setError(message);
      console.error('Error loading workspace bases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStarredBases = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const bases = await BaseService.getStarredBases();
      setStarredBases(bases);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load starred bases';
      setError(message);
      console.error('Error loading starred bases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBase = useCallback(async (formData: CreateBaseFormData): Promise<string> => {
    try {
      setError(null);
      const baseId = await BaseService.createBase(formData);
      // Refresh relevant lists
      await loadRecentBases();
      if (formData.workspaceId) {
        await loadWorkspaceBases(formData.workspaceId);
      }
      return baseId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create base';
      setError(message);
      throw err;
    }
  }, [loadRecentBases, loadWorkspaceBases]);

  const renameBase = useCallback(async (baseId: string, newName: string): Promise<void> => {
    try {
      setError(null);
      await BaseService.renameBase(baseId, newName);
      
      // Update local state
      const updateBase = (base: BaseRecord) => 
        base.id === baseId ? { ...base, name: newName } : base;
      
      setRecentBases(prev => prev.map(updateBase));
      setWorkspaceBases(prev => prev.map(updateBase));
      setStarredBases(prev => prev.map(updateBase));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename base';
      setError(message);
      throw err;
    }
  }, []);

  const toggleStar = useCallback(async (base: BaseRecord): Promise<void> => {
    try {
      setError(null);
      await BaseService.toggleStar(base.id, base.is_starred ?? false);
      
      const newStarredState = !base.is_starred;
      const updateBase = (b: BaseRecord) => 
        b.id === base.id ? { ...b, is_starred: newStarredState } : b;
      
      // Update local state
      setRecentBases(prev => prev.map(updateBase));
      setWorkspaceBases(prev => prev.map(updateBase));
      
      // Update starred bases list
      if (newStarredState) {
        setStarredBases(prev => {
          const exists = prev.some(b => b.id === base.id);
          if (!exists) {
            return [...prev, { ...base, is_starred: newStarredState }];
          }
          return prev.map(updateBase);
        });
      } else {
        setStarredBases(prev => prev.filter(b => b.id !== base.id));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle star';
      setError(message);
      throw err;
    }
  }, []);

  const deleteBase = useCallback(async (baseId: string): Promise<void> => {
    try {
      setError(null);
      await BaseService.deleteBase(baseId);
      
      // Update local state
      setRecentBases(prev => prev.filter(b => b.id !== baseId));
      setWorkspaceBases(prev => prev.filter(b => b.id !== baseId));
      setStarredBases(prev => prev.filter(b => b.id !== baseId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete base';
      setError(message);
      throw err;
    }
  }, []);

  return {
    recentBases,
    workspaceBases,
    starredBases,
    loading,
    error,
    loadRecentBases,
    loadWorkspaceBases,
    loadStarredBases,
    createBase,
    renameBase,
    toggleStar,
    deleteBase,
    clearError: () => setError(null)
  };
};
