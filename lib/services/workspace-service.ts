import { supabase } from '../supabaseClient';
import type { WorkspaceRecord, CreateWorkspaceFormData } from '../types/dashboard';

export class WorkspaceService {
  static async getWorkspaces(): Promise<WorkspaceRecord[]> {
    const { data, error } = await supabase
      .from("workspaces")
      .select("id, name")
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    return (data ?? []) as WorkspaceRecord[];
  }

  static async createWorkspace(formData: CreateWorkspaceFormData): Promise<WorkspaceRecord> {
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name: formData.name.trim() })
      .select("id, name")
      .single();
    
    if (error) throw error;
    return data as WorkspaceRecord;
  }

  static async createDefaultWorkspace(): Promise<WorkspaceRecord> {
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name: "My First Workspace" })
      .select("id, name")
      .single();
    
    if (error) throw error;
    return data as WorkspaceRecord;
  }

  static async updateWorkspace(workspaceId: string, name: string): Promise<void> {
    const { error } = await supabase
      .from("workspaces")
      .update({ name: name.trim() })
      .eq("id", workspaceId);
    
    if (error) throw error;
  }

  static async deleteWorkspace(workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId);
    
    if (error) throw error;
  }
}
