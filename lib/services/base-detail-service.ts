import { supabase } from '../supabaseClient';
import type { 
  BaseRow, 
  TableRow, 
  FieldRow, 
  RecordRow, 
  Automation,
  CreateTableData,
  CreateFieldData,
  UpdateCellData
} from '../types/base-detail';

export class BaseDetailService {
  // Base operations
  static async getBase(baseId: string): Promise<BaseRow> {
    const { data, error } = await supabase
      .from("bases")
      .select("id, name, description, created_at")
      .eq("id", baseId)
      .single();

    if (error) throw error;
    return data as BaseRow;
  }

  static async updateBase(baseId: string, updates: Partial<BaseRow>): Promise<void> {
    const { error } = await supabase
      .from("bases")
      .update(updates)
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

  // Table operations
  static async getTables(baseId: string): Promise<TableRow[]> {
    const { data, error } = await supabase
      .from("tables")
      .select("id, base_id, name, order_index, is_master_list")
      .eq("base_id", baseId)
      .order("order_index");

    if (error) throw error;
    return (data ?? []) as TableRow[];
  }

  static async createTable(tableData: CreateTableData): Promise<TableRow> {
    const { data, error } = await supabase
      .from("tables")
      .insert(tableData)
      .select("id, base_id, name, order_index, is_master_list")
      .single();

    if (error) throw error;
    return data as TableRow;
  }

  static async updateTable(tableId: string, updates: Partial<TableRow>): Promise<void> {
    const { error } = await supabase
      .from("tables")
      .update(updates)
      .eq("id", tableId);

    if (error) throw error;
  }

  static async deleteTable(tableId: string): Promise<void> {
    const { error } = await supabase
      .from("tables")
      .delete()
      .eq("id", tableId);

    if (error) throw error;
  }

  // Field operations
  static async getFields(tableId: string): Promise<FieldRow[]> {
    const { data, error } = await supabase
      .from("fields")
      .select("id, table_id, name, type, order_index, options")
      .eq("table_id", tableId)
      .order("order_index");

    if (error) throw error;
    return (data ?? []) as FieldRow[];
  }

  static async getAllFields(baseId: string): Promise<FieldRow[]> {
    const { data, error } = await supabase
      .from("fields")
      .select(`
        id, table_id, name, type, order_index, options,
        tables!inner(base_id)
      `)
      .eq("tables.base_id", baseId)
      .order("order_index");

    if (error) throw error;
    return (data ?? []) as FieldRow[];
  }

  static async createField(fieldData: CreateFieldData): Promise<FieldRow> {
    const { data, error } = await supabase
      .from("fields")
      .insert(fieldData)
      .select("id, table_id, name, type, order_index, options")
      .single();

    if (error) throw error;
    return data as FieldRow;
  }

  static async updateField(fieldId: string, updates: Partial<FieldRow>): Promise<void> {
    const { error } = await supabase
      .from("fields")
      .update(updates)
      .eq("id", fieldId);

    if (error) throw error;
  }

  static async deleteField(fieldId: string): Promise<void> {
    const { error } = await supabase
      .from("fields")
      .delete()
      .eq("id", fieldId);

    if (error) throw error;
  }

  // Record operations
  static async getRecords(tableId: string): Promise<RecordRow[]> {
    const { data, error } = await supabase
      .from("records")
      .select("id, table_id, values, created_at")
      .eq("table_id", tableId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as RecordRow[];
  }

  static async createRecord(tableId: string, values: Record<string, unknown> = {}): Promise<RecordRow> {
    const { data, error } = await supabase
      .from("records")
      .insert({ table_id: tableId, values })
      .select("id, table_id, values, created_at")
      .single();

    if (error) throw error;
    return data as RecordRow;
  }

  static async updateRecord(recordId: string, values: Record<string, unknown>): Promise<void> {
    const { error } = await supabase
      .from("records")
      .update({ values })
      .eq("id", recordId);

    if (error) throw error;
  }

  static async deleteRecord(recordId: string): Promise<void> {
    const { error } = await supabase
      .from("records")
      .delete()
      .eq("id", recordId);

    if (error) throw error;
  }

  static async updateCell(recordId: string, fieldId: string, value: unknown): Promise<void> {
    // Get current record values
    const { data: record, error: fetchError } = await supabase
      .from("records")
      .select("values")
      .eq("id", recordId)
      .single();

    if (fetchError) throw fetchError;

    // Update the specific field value
    const updatedValues = {
      ...record.values,
      [fieldId]: value
    };

    // Save back to database
    const { error: updateError } = await supabase
      .from("records")
      .update({ values: updatedValues })
      .eq("id", recordId);

    if (updateError) throw updateError;
  }

  // CSV Import operations
  static async importCsvData(
    tableId: string, 
    csvText: string, 
    fieldMappings: Record<string, string>
  ): Promise<{ imported: number; errors: string[] }> {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1);
    
    const recordsToCreate: Array<{ table_id: string; values: Record<string, unknown> }> = [];
    const errors: string[] = [];

    // Get field types for validation
    const fields = await this.getFields(tableId);
    const fieldTypeMap = new Map(fields.map(f => [f.id, f.type]));

    dataRows.forEach((row, rowIndex) => {
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length !== headers.length) {
        errors.push(`Row ${rowIndex + 2}: Column count mismatch`);
        return;
      }

      const recordValues: Record<string, unknown> = {};
      let hasValidData = false;

      headers.forEach((header, colIndex) => {
        const fieldId = fieldMappings[header];
        if (!fieldId) return; // Skip unmapped columns

        const value = values[colIndex];
        const fieldType = fieldTypeMap.get(fieldId);
        
        if (!fieldType) {
          errors.push(`Row ${rowIndex + 2}: Unknown field for column "${header}"`);
          return;
        }

        // Convert value based on field type
        let convertedValue: unknown = value;
        
        if (value === '' || value === null || value === undefined) {
          convertedValue = null;
        } else {
          switch (fieldType) {
            case 'number':
              const numValue = parseFloat(value);
              if (isNaN(numValue)) {
                errors.push(`Row ${rowIndex + 2}: Invalid number "${value}" for field "${header}"`);
                return;
              }
              convertedValue = numValue;
              break;
            case 'checkbox':
              convertedValue = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
              break;
            case 'date':
              const dateValue = new Date(value);
              if (isNaN(dateValue.getTime())) {
                errors.push(`Row ${rowIndex + 2}: Invalid date "${value}" for field "${header}"`);
                return;
              }
              convertedValue = dateValue.toISOString();
              break;
            case 'email':
              if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errors.push(`Row ${rowIndex + 2}: Invalid email "${value}" for field "${header}"`);
                return;
              }
              convertedValue = value;
              break;
            default: // text, single_select, multi_select, link
              convertedValue = value;
              break;
          }
        }

        recordValues[fieldId] = convertedValue;
        if (convertedValue !== null && convertedValue !== '') {
          hasValidData = true;
        }
      });

      if (hasValidData) {
        recordsToCreate.push({
          table_id: tableId,
          values: recordValues
        });
      }
    });

    if (recordsToCreate.length === 0) {
      throw new Error('No valid data found to import');
    }

    // Bulk insert records
    const { error } = await supabase
      .from("records")
      .insert(recordsToCreate);

    if (error) {
      throw new Error(`Failed to import records: ${error.message}`);
    }

    return {
      imported: recordsToCreate.length,
      errors
    };
  }

  static async bulkCreateRecords(
    tableId: string, 
    records: Array<Record<string, unknown>>
  ): Promise<RecordRow[]> {
    const recordsToCreate = records.map(values => ({
      table_id: tableId,
      values
    }));

    const { data, error } = await supabase
      .from("records")
      .insert(recordsToCreate)
      .select("id, table_id, values, created_at");

    if (error) throw error;
    return data as RecordRow[];
  }

  // Automation operations
  static async getAutomations(tableId: string): Promise<Automation[]> {
    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .eq("table_id", tableId)
      .order("created_at");

    if (error) throw error;
    return (data ?? []) as Automation[];
  }

  static async createAutomation(automation: Omit<Automation, 'id' | 'created_at'>): Promise<Automation> {
    const { data, error } = await supabase
      .from("automations")
      .insert(automation)
      .select("*")
      .single();

    if (error) throw error;
    return data as Automation;
  }

  static async updateAutomation(automationId: string, updates: Partial<Automation>): Promise<void> {
    const { error } = await supabase
      .from("automations")
      .update(updates)
      .eq("id", automationId);

    if (error) throw error;
  }

  static async deleteAutomation(automationId: string): Promise<void> {
    const { error } = await supabase
      .from("automations")
      .delete()
      .eq("id", automationId);

    if (error) throw error;
  }
}
