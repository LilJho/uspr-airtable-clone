import { supabase } from '../supabaseClient';
import type { BaseRecord, CreateBaseFormData } from '../types/dashboard';

export class BaseService {
  static async getRecentBases(limit = 12): Promise<BaseRecord[]> {
    const { data, error } = await supabase
      .from("bases")
      .select("id, name, description, created_at, last_opened_at, is_starred")
      .order("last_opened_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    
    if (error) throw error;
    return (data ?? []) as BaseRecord[];
  }

  static async getWorkspaceBases(workspaceId: string): Promise<BaseRecord[]> {
    const { data, error } = await supabase
      .from('bases')
      .select('id, name, description, created_at, last_opened_at, is_starred')
      .eq('workspace_id', workspaceId)
      .order('last_opened_at', { ascending: false, nullsFirst: false });
    
    if (error) throw error;
    return (data ?? []) as BaseRecord[];
  }

  static async getStarredBases(): Promise<BaseRecord[]> {
    const { data, error } = await supabase
      .from('bases')
      .select('id, name, description, created_at, last_opened_at, is_starred')
      .eq('is_starred', true)
      .order('last_opened_at', { ascending: false, nullsFirst: false });
    
    if (error) throw error;
    return (data ?? []) as BaseRecord[];
  }

  static async createBase(formData: CreateBaseFormData): Promise<string> {
    // Validate that we have a workspace ID
    if (!formData.workspaceId) {
      throw new Error("A workspace is required to create a base");
    }

    // 1) Create Base
    const { data: baseInsertData, error: baseInsertError } = await supabase
      .from("bases")
      .insert({ 
        name: formData.name.trim(), 
        description: formData.description || null, 
        workspace_id: formData.workspaceId 
      })
      .select("id")
      .single();

    if (baseInsertError || !baseInsertData) {
      throw new Error(baseInsertError?.message || "Failed to create database");
    }

    const baseId = baseInsertData.id as string;

    // 2) Create default Table
    const { data: tableInsertData, error: tableInsertError } = await supabase
      .from("tables")
      .insert({ base_id: baseId, name: "Table 1", order_index: 0 })
      .select("id")
      .single();

    if (tableInsertError || !tableInsertData) {
      throw new Error(tableInsertError?.message || "Failed to create default table");
    }

    const tableId = tableInsertData.id as string;

    // 3) Create default Fields
    const { error: fieldsInsertError } = await supabase.from("fields").insert([
      {
        table_id: tableId,
        name: "Name",
        type: "text",
        order_index: 0,
        options: {},
      },
      {
        table_id: tableId,
        name: "Notes",
        type: "text",
        order_index: 1,
        options: {},
      },
      {
        table_id: tableId,
        name: "Assignee",
        type: "text",
        order_index: 2,
        options: { inputType: "email" },
      },
      {
        table_id: tableId,
        name: "Status",
        type: "single_select",
        order_index: 3,
        options: { choices: ["Todo", "In progress", "Done"] },
      },
      {
        table_id: tableId,
        name: "Attachments",
        type: "text",
        order_index: 4,
        options: {},
      },
      {
        table_id: tableId,
        name: "Attachment Summary",
        type: "text",
        order_index: 5,
        options: {},
      },
    ]);

    if (fieldsInsertError) {
      throw new Error(fieldsInsertError.message || "Failed to create default fields");
    }

    return baseId;
  }

  static async renameBase(baseId: string, newName: string): Promise<void> {
    const { error } = await supabase
      .from("bases")
      .update({ name: newName })
      .eq("id", baseId);

    if (error) throw error;
  }

  static async toggleStar(baseId: string, isStarred: boolean): Promise<void> {
    const { error } = await supabase
      .from("bases")
      .update({ is_starred: !isStarred })
      .eq("id", baseId);

    if (error) throw error;
  }

  static async deleteBase(baseId: string): Promise<void> {
    const { error } = await supabase
      .from("bases")
      .delete()
      .eq("id", baseId);

    if (error) throw error;
  }
}
