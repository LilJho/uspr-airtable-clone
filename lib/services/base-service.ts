import { supabase } from '../supabaseClient';
import type { BaseRecord, CreateBaseFormData } from '../types/dashboard';
import type { Automation } from '../types/base-detail';
import { BaseDetailService } from './base-detail-service';

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

  static async updateBase(baseId: string, updates: { name?: string; description?: string | null }): Promise<void> {
    const { error } = await supabase
      .from('bases')
      .update({
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
      })
      .eq('id', baseId);

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

  static async duplicateBase(baseId: string): Promise<string> {
    // 1. Get the original base
    const originalBase = await BaseDetailService.getBase(baseId);
    if (!originalBase) {
      throw new Error('Base not found');
    }

    // Get workspace_id from the original base
    const { data: baseData, error: baseDataError } = await supabase
      .from("bases")
      .select("workspace_id")
      .eq("id", baseId)
      .single();

    if (baseDataError || !baseData) {
      throw new Error('Failed to get base workspace');
    }

    // 2. Create new base with "(Copy)" suffix
    const newBaseName = `${originalBase.name} (Copy)`;
    const { data: newBaseData, error: newBaseError } = await supabase
      .from("bases")
      .insert({
        name: newBaseName,
        description: originalBase.description,
        workspace_id: baseData.workspace_id
      })
      .select("id")
      .single();

    if (newBaseError || !newBaseData) {
      throw new Error(newBaseError?.message || 'Failed to create duplicated base');
    }

    const newBaseId = newBaseData.id as string;

    // 3. Get all tables from the original base
    const originalTables = await BaseDetailService.getTables(baseId);

    // Mapping: old table_id -> new table_id
    const tableIdMapping = new Map<string, string>();

    // 4. Create new tables (maintaining order_index and is_master_list)
    for (const originalTable of originalTables) {
      const { data: newTableData, error: tableError } = await supabase
        .from("tables")
        .insert({
          base_id: newBaseId,
          name: originalTable.name,
          order_index: originalTable.order_index,
          is_master_list: originalTable.is_master_list
        })
        .select("id")
        .single();

      if (tableError || !newTableData) {
        throw new Error(tableError?.message || `Failed to create table: ${originalTable.name}`);
      }

      tableIdMapping.set(originalTable.id, newTableData.id as string);
    }

    // Mapping: old field_id -> new field_id (scoped per table)
    const fieldIdMapping = new Map<string, string>();

    // 5. For each table, copy all fields
    for (const originalTable of originalTables) {
      const newTableId = tableIdMapping.get(originalTable.id);
      if (!newTableId) continue;

      // Get all fields from the original table
      const originalFields = await BaseDetailService.getFields(originalTable.id);

      // Create new fields in the new table (maintaining order_index, type, and options)
      for (const originalField of originalFields) {
        const { data: newFieldData, error: fieldError } = await supabase
          .from("fields")
          .insert({
            table_id: newTableId,
            name: originalField.name,
            type: originalField.type,
            order_index: originalField.order_index,
            options: originalField.options || {}
          })
          .select("id")
          .single();

        if (fieldError || !newFieldData) {
          throw new Error(fieldError?.message || `Failed to create field: ${originalField.name}`);
        }

        fieldIdMapping.set(originalField.id, newFieldData.id as string);
      }
    }

    // 6. Copy all automations
    // Get all automations for all tables in the original base
    const allAutomations: Array<{ automation: Automation; tableId: string }> = [];
    
    for (const originalTable of originalTables) {
      try {
        const automations = await BaseDetailService.getAutomations(originalTable.id);
        for (const automation of automations) {
          allAutomations.push({ automation, tableId: originalTable.id });
        }
      } catch (error) {
        // Continue if no automations found
        console.warn(`No automations found for table ${originalTable.id}`);
      }
    }

    // Create new automations with updated references
    for (const { automation, tableId } of allAutomations) {
      const newTableId = tableIdMapping.get(tableId);
      if (!newTableId) continue;

      // Update trigger field_id if it exists
      const newTriggerFieldId = automation.trigger?.field_id 
        ? fieldIdMapping.get(automation.trigger.field_id) || undefined
        : undefined;

      // Update action field_mappings with new field IDs
      const newFieldMappings = automation.action?.field_mappings?.map((mapping) => {
        const newSourceFieldId = fieldIdMapping.get(mapping.source_field_id);
        const newTargetFieldId = fieldIdMapping.get(mapping.target_field_id);
        
        // Only include mapping if both fields exist in the new base
        if (newSourceFieldId && newTargetFieldId) {
          return {
            source_field_id: newSourceFieldId,
            target_field_id: newTargetFieldId
          };
        }
        return null;
      }).filter((m): m is { source_field_id: string; target_field_id: string } => m !== null) || [];

      // Update target_table_id in action
      const newTargetTableId = automation.action?.target_table_id
        ? tableIdMapping.get(automation.action.target_table_id) || automation.action.target_table_id
        : undefined;

      // Skip automation if target_table_id is missing
      if (!newTargetTableId) {
        console.warn(`Skipping automation ${automation.name}: target_table_id not found`);
        continue;
      }

      // Create the new automation
      const newAutomation: Omit<Automation, 'id' | 'created_at'> = {
        name: automation.name,
        table_id: newTableId,
        enabled: automation.enabled || false,
        trigger: {
          ...automation.trigger,
          table_id: newTableId,
          field_id: newTriggerFieldId
        },
        action: {
          ...automation.action,
          target_table_id: newTargetTableId,
          field_mappings: newFieldMappings
        }
      };

      try {
        await BaseDetailService.createAutomation(newAutomation);
      } catch (error) {
        console.warn(`Failed to create automation: ${automation.name}`, error);
        // Continue with other automations even if one fails
      }
    }

    return newBaseId;
  }
}
