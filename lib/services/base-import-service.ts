import { supabase } from '../supabaseClient';
import { BaseDetailService } from './base-detail-service';
import type { ExportedBase } from './base-export-service';
import type { Automation, FieldType } from '../types/base-detail';

export class BaseImportService {
  /**
   * Import a base from exported JSON data
   */
  static async importBase(
    exported: ExportedBase,
    workspaceId: string,
    baseName?: string
  ): Promise<string> {
    // Validate the exported data
    if (!exported.base || !exported.tables || !exported.fields) {
      throw new Error('Invalid export format: missing required data');
    }
    
    // 1. Create the base
    const baseNameToUse = baseName || exported.base.name || 'Imported Base';
    const { data: baseData, error: baseError } = await supabase
      .from('bases')
      .insert({
        name: baseNameToUse,
        description: exported.base.description || null,
        workspace_id: workspaceId
      })
      .select('id')
      .single();
    
    if (baseError || !baseData) {
      throw new Error(baseError?.message || 'Failed to create base');
    }
    
    const newBaseId = baseData.id as string;
    
    // 2. Create tables and maintain mapping
    const tableNameToId = new Map<string, string>();
    
    for (const tableData of exported.tables) {
      const { data: tableResult, error: tableError } = await supabase
        .from('tables')
        .insert({
          base_id: newBaseId,
          name: tableData.name,
          order_index: tableData.order_index,
          is_master_list: tableData.is_master_list || false
        })
        .select('id, name')
        .single();
      
      if (tableError || !tableResult) {
        throw new Error(`Failed to create table "${tableData.name}": ${tableError?.message || 'Unknown error'}`);
      }
      
      tableNameToId.set(tableData.name, tableResult.id as string);
    }
    
    // 3. Create fields and maintain mapping
    const fieldMapping = new Map<string, string>(); // old field reference -> new field ID
    
    // Group fields by table
    const fieldsByTable = new Map<string, typeof exported.fields>();
    for (const fieldData of exported.fields) {
      if (!fieldsByTable.has(fieldData.table_name)) {
        fieldsByTable.set(fieldData.table_name, []);
      }
      fieldsByTable.get(fieldData.table_name)!.push(fieldData);
    }
    
    // Create fields for each table
    for (const [tableName, fields] of fieldsByTable) {
      const tableId = tableNameToId.get(tableName);
      if (!tableId) {
        console.warn(`Table "${tableName}" not found, skipping fields`);
        continue;
      }
      
      for (const fieldData of fields) {
        try {
          const newField = await BaseDetailService.createField({
            table_id: tableId,
            name: fieldData.name,
            type: fieldData.type as FieldType,
            order_index: fieldData.order_index,
            options: fieldData.options || undefined
          });
          
          // Create a unique key for mapping (table_name + field_name)
          const fieldKey = `${tableName}:${fieldData.name}`;
          fieldMapping.set(fieldKey, newField.id);
        } catch (error) {
          console.error(`Failed to create field "${fieldData.name}" in table "${tableName}":`, error);
          // Continue with other fields
        }
      }
    }
    
    // 4. Create automations
    for (const automationData of exported.automations || []) {
      const tableId = tableNameToId.get(automationData.table_name);
      if (!tableId) {
        console.warn(`Table "${automationData.table_name}" not found for automation "${automationData.name}", skipping`);
        continue;
      }
      
      // Get fields for the source table to map field names to IDs
      const sourceTableFields = await BaseDetailService.getFields(tableId);
      const sourceFieldNameToId = new Map(sourceTableFields.map(f => [f.name, f.id]));
      
      // Map trigger field_id using field_name
      let newTriggerFieldId: string | undefined;
      if (automationData.trigger.field_name) {
        newTriggerFieldId = sourceFieldNameToId.get(automationData.trigger.field_name);
        if (!newTriggerFieldId) {
          console.warn(`Trigger field "${automationData.trigger.field_name}" not found in table "${automationData.table_name}" for automation "${automationData.name}"`);
        }
      }
      
      // Map target_table_id using target_table_name
      const newTargetTableId = automationData.action.target_table_name
        ? tableNameToId.get(automationData.action.target_table_name)
        : undefined;
      
      if (!newTargetTableId) {
        console.warn(`Target table "${automationData.action.target_table_name}" not found for automation "${automationData.name}", skipping`);
        continue;
      }
      
      // Get fields for the target table
      const targetTableFields = await BaseDetailService.getFields(newTargetTableId);
      const targetFieldNameToId = new Map(targetTableFields.map(f => [f.name, f.id]));
      
      // Map action field_mappings using field names
      const newFieldMappings = (automationData.action.field_mappings || []).map(mapping => {
        const sourceFieldId = mapping.source_field_name
          ? sourceFieldNameToId.get(mapping.source_field_name)
          : undefined;
        const targetFieldId = mapping.target_field_name
          ? targetFieldNameToId.get(mapping.target_field_name)
          : undefined;
        
        if (sourceFieldId && targetFieldId) {
          return {
            source_field_id: sourceFieldId,
            target_field_id: targetFieldId
          };
        }
        return null;
      }).filter((m): m is { source_field_id: string; target_field_id: string } => m !== null);
      
      // Map visibility field if it exists
      let newVisibilityFieldId: string | undefined;
      if (automationData.action.visibility_field_name) {
        newVisibilityFieldId = targetFieldNameToId.get(automationData.action.visibility_field_name);
      }
      
      // Only create automation if we have valid mappings (or if it's a simple create_record without mappings)
      if (newFieldMappings.length > 0 || automationData.action.type === 'create_record') {
        try {
          const newAutomation: Omit<Automation, 'id' | 'created_at'> = {
            name: automationData.name,
            table_id: tableId,
            enabled: automationData.enabled !== false,
            trigger: {
              type: automationData.trigger.type,
              table_id: tableId,
              ...(newTriggerFieldId && { field_id: newTriggerFieldId }),
              ...(automationData.trigger.condition && { condition: automationData.trigger.condition })
            },
            action: {
              type: automationData.action.type,
              target_table_id: newTargetTableId,
              field_mappings: newFieldMappings,
              ...(automationData.action.preserve_original !== undefined && { preserve_original: automationData.action.preserve_original }),
              ...(automationData.action.sync_mode && { sync_mode: automationData.action.sync_mode as 'one_way' | 'two_way' }),
              ...(automationData.action.duplicate_handling && { duplicate_handling: automationData.action.duplicate_handling as 'skip' | 'update' | 'create_new' }),
              ...(newVisibilityFieldId && { visibility_field_id: newVisibilityFieldId }),
              ...(automationData.action.visibility_value !== undefined && { visibility_value: automationData.action.visibility_value })
            }
          };
          
          await BaseDetailService.createAutomation(newAutomation);
        } catch (error) {
          console.error(`Failed to create automation "${automationData.name}":`, error);
          // Continue with other automations
        }
      } else {
        console.warn(`Skipping automation "${automationData.name}" due to missing field mappings`);
      }
    }
    
    // 5. Optionally import records
    if (exported.records && exported.records.length > 0) {
      // Group records by table
      const recordsByTable = new Map<string, typeof exported.records>();
      for (const record of exported.records) {
        if (!recordsByTable.has(record.table_name)) {
          recordsByTable.set(record.table_name, []);
        }
        recordsByTable.get(record.table_name)!.push(record);
      }
      
      // Import records for each table
      for (const [tableName, records] of recordsByTable) {
        const tableId = tableNameToId.get(tableName);
        if (!tableId) {
          console.warn(`Table "${tableName}" not found, skipping records`);
          continue;
        }
        
        // Get fields for this table to map field names to IDs
        const tableFields = await BaseDetailService.getFields(tableId);
        const fieldNameToId = new Map(tableFields.map(f => [f.name, f.id]));
        
        // Map record values from field IDs/names to new field IDs
        // Records are exported with field IDs, but we need to map them to new field IDs
        // We'll need to match by field name since we don't have a direct mapping
        // For this, we need to get the original field names from the export
        // But since records are exported with field IDs, we need a different approach
        
        const recordsToCreate = records.map(record => {
          const mappedValues: Record<string, unknown> = {};
          
          // Try to map values - if the key is a field name, use it directly
          // If it's a UUID (field ID), we can't map it reliably without additional metadata
          for (const [key, value] of Object.entries(record.values)) {
            // Check if key is a UUID (old field ID)
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
            
            if (isUUID) {
              // This is an old field ID - we can't map it directly
              // Skip this value as we don't have a reliable way to map old IDs to new IDs
              console.warn(`Cannot map field value for old field ID "${key}" in table "${tableName}" - field IDs are not preserved in export`);
            } else {
              // This might be a field name - try to find the field
              const fieldId = fieldNameToId.get(key);
              if (fieldId) {
                mappedValues[fieldId] = value;
              } else {
                console.warn(`Field "${key}" not found in table "${tableName}", skipping value`);
              }
            }
          }
          
          return {
            table_id: tableId,
            values: mappedValues
          };
        });
        
        // Batch insert records
        const batchSize = 100;
        for (let i = 0; i < recordsToCreate.length; i += batchSize) {
          const batch = recordsToCreate.slice(i, i + batchSize);
          try {
            await BaseDetailService.bulkCreateRecords(tableId, batch.map(r => r.values));
          } catch (error) {
            console.error(`Failed to import batch of records for table "${tableName}":`, error);
            // Continue with next batch
          }
        }
      }
    }
    
    return newBaseId;
  }
  
  /**
   * Parse JSON file and validate it's a valid export
   */
  static parseExportFile(file: File): Promise<ExportedBase> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text) as ExportedBase;
          
          // Validate structure
          if (!parsed.base || !parsed.tables || !parsed.fields) {
            reject(new Error('Invalid export format: missing required sections'));
            return;
          }
          
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
}

