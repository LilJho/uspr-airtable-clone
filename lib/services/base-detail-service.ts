import { supabase } from '../supabaseClient';
import type { 
  BaseRow, 
  TableRow, 
  FieldRow, 
  RecordRow, 
  Automation,
  AutomationAction,
  CreateTableData,
  CreateFieldData,
  UpdateCellData,
  FieldType
} from '../types/base-detail';

// Helper function to clean and extract valid email from malformed input
function cleanEmailValue(value: string): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // Remove extra whitespace
  let cleaned = value.trim();
  
  // Remove common delimiters and extract the first valid email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = cleaned.match(emailRegex);
  
  if (matches && matches.length > 0) {
    // Return the first valid email found
    return matches[0];
  }
  
  // If no valid email found, try to clean up common issues
  // Remove extra characters that might be before/after email
  cleaned = cleaned.replace(/^[^a-zA-Z0-9._%+-]*/, ''); // Remove leading non-email chars
  cleaned = cleaned.replace(/[^a-zA-Z0-9._%+-@]*$/, ''); // Remove trailing non-email chars
  
  // Check if the cleaned string is now a valid email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return cleaned;
  }
  
  return null;
}

// Helper function to parse date/datetime values from various formats
function parseDateValue(value: string): Date | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const cleaned = value.trim();
  
  // Handle common CSV date formats
  const dateFormats = [
    // ISO formats
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, // ISO with time
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    
    // US formats
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{2}$/, // MM/DD/YY
    
    // European formats
    /^\d{1,2}\.\d{1,2}\.\d{4}$/, // DD.MM.YYYY
    /^\d{1,2}-\d{1,2}-\d{4}$/, // DD-MM-YYYY
    
    // Other common formats
    /^\d{4}\/\d{1,2}\/\d{1,2}$/, // YYYY/MM/DD
  ];
  
  // Check if the value matches any known format
  const matchesFormat = dateFormats.some(format => format.test(cleaned));
  
  if (!matchesFormat) {
    // Try parsing as-is (handles relative dates, etc.)
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  }
  
  // Parse the date
  const parsed = new Date(cleaned);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  
  return parsed;
}

// Helper function to generate random colors for single select options
function getRandomColor(): string {
  const colors = [
    'blue', 'cyan', 'teal', 'green', 'yellow', 'orange', 'red', 'pink', 
    'purple', 'gray', 'indigo', 'lime', 'amber', 'emerald', 'violet'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export class BaseDetailService {
  // Base operations
  static async getBase(baseId: string): Promise<BaseRow> {
    const { data, error } = await supabase
      .from("bases")
      .select("id, name, description, created_at, last_opened_at")
      .eq("id", baseId)
      .single();

    if (error) throw error;
    return data as BaseRow;
  }

  static async markBaseOpened(baseId: string): Promise<void> {
    const { error } = await supabase
      .from("bases")
      .update({ last_opened_at: new Date().toISOString() })
      .eq("id", baseId);

    if (error) throw error;
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
    console.log('Creating field with data:', JSON.stringify(fieldData, null, 2));
    console.log('Field type:', fieldData.type, 'Type of type:', typeof fieldData.type);
    
    // Check if target table is masterlist - prevent field creation in masterlist
    const { data: tableData, error: tableCheckError } = await supabase
      .from("tables")
      .select("is_master_list, name")
      .eq("id", fieldData.table_id)
      .single();
    
    if (tableCheckError) {
      throw new Error(`Failed to verify table: ${tableCheckError.message}`);
    }
    
    if (tableData?.is_master_list) {
      throw new Error('Cannot create fields in masterlist table. Masterlist automatically displays fields from all other tables.');
    }
    
    // Validate and sanitize field type
    const allowedTypes = ['text', 'number', 'date', 'datetime', 'email', 'phone', 'single_select', 'multi_select', 'checkbox', 'link'];
    
    // Sanitize the field type - remove any whitespace and ensure it's lowercase
    const sanitizedType = fieldData.type.trim().toLowerCase();
    
    if (!allowedTypes.includes(sanitizedType)) {
      throw new Error(`Invalid field type: "${fieldData.type}" (sanitized: "${sanitizedType}"). Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    // Create a sanitized version of the field data
    const sanitizedFieldData = {
      ...fieldData,
      type: sanitizedType
    };
    
    console.log('Sanitized field data:', JSON.stringify(sanitizedFieldData, null, 2));
    console.log('Creating field in table:', tableData.name, 'table_id:', fieldData.table_id);
    
    const { data, error } = await supabase
      .from("fields")
      .insert(sanitizedFieldData)
      .select("id, table_id, name, type, order_index, options")
      .single();

    if (error) {
      console.error('Field creation error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      throw error;
    }
    
    console.log('✅ Field created successfully in table:', tableData.name);
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

  static async deleteAllFields(tableId: string): Promise<void> {
    const { error } = await supabase
      .from("fields")
      .delete()
      .eq("table_id", tableId);

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

  static async getAllRecordsFromBase(baseId: string): Promise<RecordRow[]> {
    const { data, error } = await supabase
      .from("records")
      .select(`
        id, 
        table_id, 
        values, 
        created_at,
        tables!inner(base_id)
      `)
      .eq("tables.base_id", baseId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as RecordRow[];
  }

  static async createRecord(tableId: string, values: Record<string, unknown> = {}): Promise<RecordRow> {
    // Get base_id and check if this is masterlist
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("base_id, is_master_list")
      .eq("id", tableId)
      .single();

    if (tableError) throw tableError;

    const { data, error } = await supabase
      .from("records")
      .insert({ table_id: tableId, values })
      .select("id, table_id, values, created_at")
      .single();

    if (error) throw error;
    
    // If not creating in masterlist, ensure record also exists in masterlist
    // BUT: Only include values for fields that actually exist in the masterlist
    // This prevents creating records with field IDs from other tables
    if (!table.is_master_list) {
      try {
        // Get masterlist table
        const { data: masterlistTable, error: masterlistError } = await supabase
          .from("tables")
          .select("id")
          .eq("base_id", table.base_id)
          .eq("is_master_list", true)
          .single();

        if (!masterlistError && masterlistTable) {
          // Get masterlist fields to filter values
          const masterlistFields = await this.getFields(masterlistTable.id);
          const masterlistFieldIds = new Set(masterlistFields.map(f => f.id));
          
          // Filter values to only include fields that exist in masterlist
          const masterlistValues: Record<string, unknown> = {};
          for (const [fieldId, value] of Object.entries(values)) {
            if (masterlistFieldIds.has(fieldId)) {
              masterlistValues[fieldId] = value;
            }
          }
          
          // Only create record in masterlist if there are valid values
          if (Object.keys(masterlistValues).length > 0) {
          await supabase
            .from("records")
              .insert({ table_id: masterlistTable.id, values: masterlistValues });
            console.log('📋 Record also created in masterlist with filtered field values');
          } else {
            console.log('⚠️ Skipping masterlist record creation - no matching fields found');
          }
        }
      } catch (masterlistError) {
        console.error('Failed to create record in masterlist:', masterlistError);
        // Don't throw - the main record was created successfully
      }
    }
    
    // Check and execute automations for new record
    try {
      await this.checkAndExecuteAutomations(tableId, data.id, values);
    } catch (automationError) {
      console.error('Automation execution failed for new record:', automationError);
      // Don't throw here as the record creation was successful
    }
    
    return data as RecordRow;
  }

  static async updateRecord(recordId: string, values: Record<string, unknown>): Promise<void> {
    // Get table_id for automation checks
    const { data: record, error: fetchError } = await supabase
      .from("records")
      .select("table_id")
      .eq("id", recordId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from("records")
      .update({ values })
      .eq("id", recordId);

    if (error) throw error;

    // Check and execute automations after record update
    try {
      await this.checkAndExecuteAutomations(record.table_id, recordId, values);
    } catch (automationError) {
      console.error('Automation execution failed for record update:', automationError);
      // Don't throw here as the record update was successful
    }
  }

  static async deleteRecord(recordId: string): Promise<void> {
    const { error } = await supabase
      .from("records")
      .delete()
      .eq("id", recordId);

    if (error) throw error;
  }

  static async updateCell(recordId: string, fieldId: string, value: unknown): Promise<void> {
    console.log(`🔄 CELL UPDATE: Updating cell for record ${recordId}, field ${fieldId}, value:`, value);
    
    // Get current record values
    const { data: record, error: fetchError } = await supabase
      .from("records")
      .select("values, table_id")
      .eq("id", recordId)
      .single();

    if (fetchError) throw fetchError;

    // Get table info to check if it's masterlist and get base_id
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("base_id, is_master_list")
      .eq("id", record.table_id)
      .single();

    if (tableError) throw tableError;

    const isMasterlist = table.is_master_list;
    const baseId = table.base_id;

    // Update the specific field value
    const updatedValues = {
      ...record.values,
      [fieldId]: value
    };

    console.log(`📝 UPDATED VALUES:`, updatedValues);

    // Save back to database
    const { error: updateError } = await supabase
      .from("records")
      .update({ values: updatedValues })
      .eq("id", recordId);

    if (updateError) throw updateError;

    console.log(`✅ CELL SAVED: Cell update successful`);

    // If updating a non-masterlist table, also sync to masterlist
    if (!isMasterlist && baseId) {
      try {
        // Get masterlist table
        const { data: masterlistTable, error: masterlistError } = await supabase
          .from("tables")
          .select("id")
          .eq("base_id", baseId)
          .eq("is_master_list", true)
          .single();

        if (!masterlistError && masterlistTable) {
          // Get the field that was updated to find its name
          const { data: updatedField, error: fieldError } = await supabase
            .from("fields")
            .select("name")
            .eq("id", fieldId)
            .single();

          if (!fieldError && updatedField) {
            // Find the corresponding field in masterlist with the same name
            const { data: masterlistFields, error: masterlistFieldsError } = await supabase
              .from("fields")
              .select("id")
              .eq("table_id", masterlistTable.id)
              .eq("name", updatedField.name)
              .limit(1);

            if (!masterlistFieldsError && masterlistFields.length > 0) {
              const masterlistFieldId = masterlistFields[0].id;
              
              // Get or create masterlist record
              const { data: masterlistRecord, error: masterlistRecordError } = await supabase
                .from("records")
                .select("values")
                .eq("id", recordId)
                .eq("table_id", masterlistTable.id)
                .maybeSingle();

              if (masterlistRecordError && masterlistRecordError.code !== 'PGRST116') {
                console.error('❌ Error checking masterlist record:', masterlistRecordError);
              } else {
                const masterlistValues = masterlistRecord?.values || {};
                const updatedMasterlistValues = {
                  ...masterlistValues,
                  [masterlistFieldId]: value
                };

                // Update or create masterlist record (always check first, then update or create)
                // Get current masterlist record values to merge
                const { data: currentMasterlistRecord, error: masterlistCheckError } = await supabase
                  .from("records")
                  .select("values")
                  .eq("id", recordId)
                  .eq("table_id", masterlistTable.id)
                  .maybeSingle();

                if (masterlistCheckError && masterlistCheckError.code !== 'PGRST116') {
                  console.error('❌ Error checking masterlist record:', masterlistCheckError);
                } else {
                  // Merge with existing masterlist values to preserve other fields
                  const mergedMasterlistValues = {
                    ...(currentMasterlistRecord?.values || {}),
                    ...updatedMasterlistValues  // Override with new value
                  };

                  if (currentMasterlistRecord) {
                    // Update existing masterlist record
                    const { error: updateMasterlistError } = await supabase
                      .from("records")
                      .update({ values: mergedMasterlistValues })
                      .eq("id", recordId)
                      .eq("table_id", masterlistTable.id);

                    if (updateMasterlistError) {
                      console.error('❌ Failed to update masterlist record:', updateMasterlistError);
                    } else {
                      console.log('✅ Masterlist record updated with new value');
                    }
                  } else {
                    // Create masterlist record if it doesn't exist (merge with current record values)
                    const allRecordValues = {
                      ...record.values,  // Start with all current record values
                      ...updatedMasterlistValues  // Override with the updated value
                    };

                    const { error: createMasterlistError } = await supabase
                      .from("records")
                      .insert({
                        id: recordId,
                        table_id: masterlistTable.id,
                        values: allRecordValues
                      });

                    if (createMasterlistError) {
                      // If conflict occurs (record was created in the meantime), update instead
                      if (createMasterlistError.code === '23505') {
                        console.log('⚠️ Masterlist record conflict during create, updating instead');
                        const { error: updateError } = await supabase
                          .from("records")
                          .update({ values: allRecordValues })
                          .eq("id", recordId)
                          .eq("table_id", masterlistTable.id);
                        
                        if (updateError) {
                          console.error('❌ Failed to update masterlist record after conflict:', updateError);
                        } else {
                          console.log('✅ Masterlist record updated (after conflict)');
                        }
                      } else {
                        console.error('❌ Failed to create masterlist record:', createMasterlistError);
                      }
                    } else {
                      console.log('✅ Masterlist record created with updated value');
                    }
                  }
                }
              }
            }
          }
        }
      } catch (syncError) {
        console.error('❌ Failed to sync to masterlist:', syncError);
        // Don't throw - the main update was successful
      }
    }

    // Check and execute automations after successful cell update
    try {
      await this.checkAndExecuteAutomations(record.table_id, recordId, updatedValues);
    } catch (automationError) {
      console.error('❌ AUTOMATION EXECUTION FAILED:', automationError);
      // Don't throw here as the cell update was successful
    }
  }

  // CSV Import operations
  static async importCsvData(
    tableId: string, 
    csvText: string, 
    fieldMappings: Record<string, string | { type: 'create', fieldType: string, fieldName: string }>
  ): Promise<{ imported: number; errors: string[] }> {
    // Parse CSV into lines while respecting quoted fields that may contain newlines
    const parseCSVLines = (text: string): string[] => {
      const lines: string[] = [];
      let currentLine = '';
      let inQuotes = false;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"') {
          currentLine += char;
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentLine += nextChar;
            i++;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
          // End of line (not inside quotes)
          if (currentLine.trim()) {
            lines.push(currentLine);
          }
          currentLine = '';
          if (char === '\r' && nextChar === '\n') {
            i++; // Skip the \n after \r
          }
        } else if (char !== '\r') {
          // Add character (skip standalone \r)
          currentLine += char;
        }
      }
      
      // Add the last line if it exists
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      
      return lines;
    };
    
    const lines = parseCSVLines(csvText);
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    // Parse CSV properly to handle quoted fields with commas and escaped quotes
    const parseCsvRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote - add one quote and skip the next
            current += '"';
            i++;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add the last field
      result.push(current.trim());
      return result;
    };

    const headers = parseCsvRow(lines[0]);
    const dataRows = lines.slice(1);
    
    console.log('CSV Headers:', headers);
    console.log('CSV Data Rows:', dataRows);
    console.log('Field Mappings:', fieldMappings);
    console.log('Field Mappings Keys:', Object.keys(fieldMappings));
    console.log('Field Mappings Count:', Object.keys(fieldMappings).length);
    
    const recordsToCreate: Array<{ table_id: string; values: Record<string, unknown> }> = [];
    const errors: string[] = [];

    // Check if table is masterlist
    const { data: tableData, error: tableCheckError } = await supabase
      .from("tables")
      .select("is_master_list, base_id")
      .eq("id", tableId)
      .single();
    
    if (tableCheckError) {
      throw new Error(`Failed to verify table: ${tableCheckError.message}`);
    }
    
    const isMasterlist = tableData?.is_master_list || false;
    const baseId = tableData?.base_id;
    
    if (!baseId) {
      throw new Error('Table does not have a base_id');
    }

    // Get existing fields and their types
    const fields = await this.getFields(tableId);
    const fieldTypeMap = new Map(fields.map(f => [f.id, f.type]));
    
    // If importing to masterlist, get all fields from the base to find existing fields by name
    let allBaseFields: FieldRow[] = [];
    const fieldNameToIdMap = new Map<string, string>();
    
    if (isMasterlist) {
      console.log('📋 Importing to masterlist - will map to existing fields by name across the base');
      allBaseFields = await this.getAllFields(baseId);
      // Create a map of field name -> field ID (use first match if duplicate names exist)
      for (const field of allBaseFields) {
        if (!fieldNameToIdMap.has(field.name)) {
          fieldNameToIdMap.set(field.name, field.id);
        }
      }
      console.log(`📋 Found ${allBaseFields.length} fields across the base (${fieldNameToIdMap.size} unique names)`);
    }
    
    // Create new fields for mappings that specify field creation
    const fieldsToCreate = new Map<string, { fieldType: string, fieldName: string, options?: Record<string, unknown> }>();
    const createdFieldIds = new Map<string, string>();
    
    // Collect unique values for single_select fields
    const singleSelectOptions = new Map<string, Set<string>>();
    
    // First pass: analyze all columns to detect select fields
    const columnAnalysis = new Map<string, { uniqueValues: Set<string>, totalRows: number }>();
    
    for (const [csvColumn, mapping] of Object.entries(fieldMappings)) {
      if (typeof mapping === 'object' && mapping.type === 'create') {
        const columnIndex = headers.findIndex(h => h === csvColumn);
        if (columnIndex !== -1) {
          const uniqueValues = new Set<string>();
          let totalRows = 0;
          
          // Analyze all data rows for this column
          for (const row of dataRows) {
            const parsedRow = parseCsvRow(row);
            if (parsedRow[columnIndex]) {
              let value = parsedRow[columnIndex].trim();
              // Remove surrounding quotes if present
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              }
              // Unescape double quotes
              value = value.replace(/""/g, '"');
              
              if (value && value !== '(empty)') {
                uniqueValues.add(value);
                totalRows++;
              }
            }
          }
          
          columnAnalysis.set(csvColumn, { uniqueValues, totalRows });
        }
      }
    }
    
    // Second pass: determine field types and create select options
    for (const [csvColumn, mapping] of Object.entries(fieldMappings)) {
      if (typeof mapping === 'object' && mapping.type === 'create') {
        const analysis = columnAnalysis.get(csvColumn);
        
        if (analysis) {
          const { uniqueValues, totalRows } = analysis;
          const uniqueCount = uniqueValues.size;
          
          // Smart detection for select fields
          // Updated threshold: only detect as select if 5 or fewer unique values
          if (mapping.fieldType === 'text' && uniqueCount >= 2 && uniqueCount <= 5 && totalRows >= 2) {
            const valuesArray = Array.from(uniqueValues);
            
            // Criteria for detecting select fields:
            // 1. Limited number of unique values (2-5 values)
            // 2. Values are not purely numeric (to avoid confusing with number fields)
            // 3. Values don't look like emails, dates, or phone numbers
            // 4. Values are reasonable length (not too long)
            const isNotNumeric = valuesArray.some(v => isNaN(Number(v)) || v.trim() === '');
            const isNotEmail = valuesArray.every(v => !v.includes('@') || !v.includes('.'));
            const isNotDate = valuesArray.every(v => 
              !/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(v) && 
              !/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(v)
            );
            const isNotPhone = valuesArray.every(v => !/^[\+]?[\d\s\-\(\)]+$/.test(v));
            const reasonableLength = valuesArray.every(v => v.length <= 50);
            
            if (isNotNumeric && isNotEmail && isNotDate && isNotPhone && reasonableLength) {
              console.log(`🎯 SELECT FIELD DETECTED: ${mapping.fieldName} with ${uniqueCount} unique values:`, valuesArray);
              
              // Upgrade field type to single_select
              mapping.fieldType = 'single_select';
              
              // Create options object for the field
              const options: Record<string, { name: string; color: string }> = {};
              Array.from(uniqueValues).forEach((value, index) => {
                const optionId = `option_${index + 1}`;
                options[optionId] = {
                  name: value,
                  color: getRandomColor() // Generate a random color for each option
                };
              });
              
              fieldsToCreate.set(csvColumn, { 
                fieldType: 'single_select', 
                fieldName: mapping.fieldName,
                options 
              });
              
              singleSelectOptions.set(csvColumn, uniqueValues);
              continue; // Skip the normal field creation below
            }
          }
          
          // Handle single_select fields that were already detected
          if (mapping.fieldType === 'single_select') {
            // Create options object for the field
            const options: Record<string, { name: string; color: string }> = {};
            Array.from(uniqueValues).forEach((value, index) => {
              const optionId = `option_${index + 1}`;
              options[optionId] = {
                name: value,
                color: getRandomColor() // Generate a random color for each option
              };
            });
            
            fieldsToCreate.set(csvColumn, { 
              fieldType: mapping.fieldType, 
              fieldName: mapping.fieldName,
              options 
            });
            
            singleSelectOptions.set(csvColumn, uniqueValues);
          } else {
            fieldsToCreate.set(csvColumn, { fieldType: mapping.fieldType, fieldName: mapping.fieldName });
          }
        } else {
          fieldsToCreate.set(csvColumn, { fieldType: mapping.fieldType, fieldName: mapping.fieldName });
        }
      }
    }
    
    // Create all new fields (or map to existing fields if masterlist)
    console.log('🔧 PROCESSING FIELDS:', fieldsToCreate.size, 'fields to process');
    console.log('🔧 Is masterlist?', isMasterlist);
    console.log('🔧 Total fieldMappings with type "create":', Object.entries(fieldMappings).filter(([_, m]) => typeof m === 'object' && m.type === 'create').length);
    console.log('🔧 Fields to create:', Array.from(fieldsToCreate.entries()).map(([col, config]) => `${col} -> ${config.fieldName}`));
    
    if (fieldsToCreate.size === 0) {
      console.warn('⚠️ WARNING: fieldsToCreate is empty! This means no fields were added to the map. Check fieldMappings.');
      console.log('📋 Field mappings sample:', Object.entries(fieldMappings).slice(0, 3).map(([k, v]) => ({ key: k, value: v })));
    }
    
    if (isMasterlist) {
      // For masterlist, map to existing fields by name, or create in first non-masterlist table
      console.log('📋 Masterlist import: Mapping to existing fields or creating in first non-masterlist table');
      
      // Find the first non-masterlist table to create fields in
      let tables = await this.getTables(baseId);
      let firstNonMasterlistTable = tables.find(t => !t.is_master_list);
      let targetTableIdForNewFields = firstNonMasterlistTable?.id;
      
      if (!targetTableIdForNewFields) {
        // No non-masterlist table exists - create one automatically for field creation
        console.log('📋 No non-masterlist table found - creating one automatically for field creation');
        try {
          // Find the highest order_index to place the new table after existing tables
          const maxOrderIndex = tables.length > 0 
            ? Math.max(...tables.map(t => t.order_index || 0))
            : -1;
          
          // Create table directly with is_master_list set to false
          const { data: newTableData, error: tableError } = await supabase
            .from("tables")
            .insert({
              base_id: baseId,
              name: 'Data Table', // Default name for the table
              order_index: maxOrderIndex + 1,
              is_master_list: false
            })
            .select("id, base_id, name, order_index, is_master_list")
            .single();
          
          if (tableError || !newTableData) {
            throw new Error(tableError?.message || 'Failed to create table');
          }
          
          const newTable = newTableData as TableRow;
          
          targetTableIdForNewFields = newTable.id;
          firstNonMasterlistTable = newTable;
          
          // Refresh tables list
          tables = await this.getTables(baseId);
          
          console.log(`✅ Created new table "${newTable.name}" (${targetTableIdForNewFields}) for field creation`);
        } catch (error) {
          const errorMsg = `❌ CRITICAL: Failed to create non-masterlist table for field creation: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      } else {
        console.log(`📋 Will create new fields in existing table: "${firstNonMasterlistTable?.name}" (${targetTableIdForNewFields})`);
      }
      
      // Process fields sequentially to ensure proper tracking
      console.log(`🔄 Starting field processing loop with ${fieldsToCreate.size} fields`);
      let processedCount = 0;
      
      for (const [csvColumn, fieldConfig] of fieldsToCreate) {
        processedCount++;
        console.log(`[${processedCount}/${fieldsToCreate.size}] Processing field: "${fieldConfig.fieldName}" for column: "${csvColumn}"`);
        const existingFieldId = fieldNameToIdMap.get(fieldConfig.fieldName);
        
        if (existingFieldId) {
          // Field already exists in the base - use it
          const existingField = allBaseFields.find(f => f.id === existingFieldId);
          if (existingField) {
            console.log(`✅ Using existing field "${fieldConfig.fieldName}": ${existingFieldId}`);
            createdFieldIds.set(csvColumn, existingFieldId);
            fieldTypeMap.set(existingFieldId, existingField.type);
            
            // Add to fields array if not already there
            if (!fields.find(f => f.id === existingFieldId)) {
              fields.push(existingField);
            }
          } else {
            console.warn(`⚠️ Found field ID ${existingFieldId} for "${fieldConfig.fieldName}" but field not found in allBaseFields`);
            errors.push(`Field "${fieldConfig.fieldName}" exists but could not be accessed`);
          }
        } else {
          // Field doesn't exist - create it in first non-masterlist table
          if (targetTableIdForNewFields) {
            try {
              console.log(`🔧 Creating field "${fieldConfig.fieldName}" (type: ${fieldConfig.fieldType}) in table "${firstNonMasterlistTable?.name}" (masterlist import)`);
              
              // Get fields in target table to determine order_index
              const targetTableFields = await this.getFields(targetTableIdForNewFields);
              
              const newField = await this.createField({
                name: fieldConfig.fieldName,
                type: fieldConfig.fieldType as FieldType,
                table_id: targetTableIdForNewFields,
                order_index: targetTableFields.length,
                options: fieldConfig.options
              });
              
              console.log(`✅ Field created in "${firstNonMasterlistTable?.name}": "${fieldConfig.fieldName}" (${newField.id})`);
              
              // CRITICAL: Set the field ID using csvColumn as the key
              createdFieldIds.set(csvColumn, newField.id);
              fieldTypeMap.set(newField.id, newField.type);
              
              // Verify the field ID was set correctly
              const verifyId = createdFieldIds.get(csvColumn);
              if (!verifyId || verifyId !== newField.id) {
                console.error(`❌ CRITICAL: Field ID not set correctly for "${csvColumn}": expected ${newField.id}, got ${verifyId || 'undefined'}`);
              } else {
                console.log(`✅ Verified: createdFieldIds["${csvColumn}"] = ${verifyId}`);
              }
              
              // Add to allBaseFields so subsequent checks can find it
              allBaseFields.push(newField);
              fieldNameToIdMap.set(fieldConfig.fieldName, newField.id);
              
              // Add to fields array for masterlist view
              if (!fields.find(f => f.id === newField.id)) {
                fields.push(newField);
              }
            } catch (error) {
              console.error(`❌ Failed to create field "${fieldConfig.fieldName}" for column "${csvColumn}":`, error);
              const errorMsg = `Failed to create field "${fieldConfig.fieldName}" in table "${firstNonMasterlistTable?.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
              errors.push(errorMsg);
              // Don't add to createdFieldIds - validation will catch this
            }
          } else {
            // No non-masterlist table available
            console.error(`❌ CRITICAL: Field "${fieldConfig.fieldName}" cannot be created - no non-masterlist table available`);
            console.error(`❌ Available tables:`, tables.map(t => ({ name: t.name, is_master_list: t.is_master_list })));
            errors.push(`Field "${fieldConfig.fieldName}" does not exist. Please create a non-masterlist table first to enable field creation during masterlist import.`);
          }
        }
      }
      
      console.log(`✅ Completed field processing loop. Processed ${processedCount} fields.`);
      console.log(`📊 createdFieldIds now has ${createdFieldIds.size} entries`);
    } else {
      // For non-masterlist tables, create new fields as usual
    for (const [csvColumn, fieldConfig] of fieldsToCreate) {
      try {
        console.log(`🔧 Creating field: ${fieldConfig.fieldName} (${fieldConfig.fieldType}) for column: ${csvColumn}`);
        const newField = await this.createField({
          name: fieldConfig.fieldName,
          type: fieldConfig.fieldType as FieldType,
          table_id: tableId,
          order_index: fields.length,
          options: fieldConfig.options
        });
        console.log(`✅ Field created successfully:`, { id: newField.id, name: newField.name, type: newField.type });
        fields.push(newField);
        fieldTypeMap.set(newField.id, newField.type);
        createdFieldIds.set(csvColumn, newField.id);
        console.log(`📝 Updated createdFieldIds:`, { csvColumn, fieldId: newField.id });
      } catch (error) {
        console.error(`❌ Failed to create field "${fieldConfig.fieldName}":`, error);
        errors.push(`Failed to create field "${fieldConfig.fieldName}" for column "${csvColumn}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    console.log('🔧 FIELD CREATION SUMMARY:');
    console.log('📊 Total fields after creation:', fields.length);
    console.log('📊 Created field IDs map:', Object.fromEntries(createdFieldIds));
    console.log('📊 Field type map:', Object.fromEntries(fieldTypeMap));
    
    // Validate that all fields to create have been successfully mapped/created
    // This ensures we don't start processing rows with missing field IDs
    const missingFieldIds: string[] = [];
    for (const [csvColumn, mapping] of Object.entries(fieldMappings)) {
      if (typeof mapping === 'object' && mapping.type === 'create') {
        const fieldId = createdFieldIds.get(csvColumn);
        if (!fieldId) {
          missingFieldIds.push(csvColumn);
          console.error(`❌ CRITICAL: Field "${mapping.fieldName}" for column "${csvColumn}" was not created or mapped`);
        }
      }
    }
    
    // If any required fields are missing, throw an error before processing rows
    if (missingFieldIds.length > 0) {
      const missingFieldNames = missingFieldIds.map(col => {
        const mapping = fieldMappings[col];
        return typeof mapping === 'object' && mapping.type === 'create' ? mapping.fieldName : col;
      });
      const errorMessage = `Cannot proceed with import: ${missingFieldIds.length} field(s) failed to create: ${missingFieldNames.join(', ')}. Please check the errors above.`;
      console.error('❌', errorMessage);
      errors.push(errorMessage);
      return { imported: 0, errors };
    }

    dataRows.forEach((row, rowIndex) => {
      try {
        // Parse the row
        const values = parseCsvRow(row).map(v => {
          // Remove surrounding quotes if present
          let cleaned = v.trim();
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
          }
          // Unescape double quotes
          return cleaned.replace(/""/g, '"');
        });
        
        console.log(`Processing row ${rowIndex + 2}:`, { valueCount: values.length, headerCount: headers.length });
        
        // Handle column count mismatch - pad with empty values or truncate
        if (values.length !== headers.length) {
          console.warn(`Row ${rowIndex + 2}: Column count mismatch (${values.length} vs ${headers.length})`);
          
          // If row has too few columns, pad with empty strings
          while (values.length < headers.length) {
            values.push('');
          }
          
          // If row has too many columns, truncate (but log warning)
          if (values.length > headers.length) {
            errors.push(`Row ${rowIndex + 2}: Too many columns (${values.length} vs ${headers.length}), extra data ignored`);
            values.length = headers.length;
          }
        }

        const recordValues: Record<string, unknown> = {};
        let hasValidData = false;

        headers.forEach((header, colIndex) => {
          const mapping = fieldMappings[header];
          console.log(`Processing header "${header}":`, { mapping, colIndex });
          if (!mapping) {
            console.log(`❌ NO MAPPING: No mapping found for header "${header}" - skipping column`);
            return; // Skip unmapped columns
          }

          // Get field ID - either from existing mapping or from newly created field
          let fieldId: string;
          if (typeof mapping === 'string') {
            fieldId = mapping;
            console.log(`📋 Using existing field ID: ${fieldId} for header: ${header}`);
          } else if (typeof mapping === 'object' && mapping.type === 'create') {
            fieldId = createdFieldIds.get(header) || '';
            console.log(`🔧 Looking for created field ID for header "${header}":`, { 
              fieldId, 
              createdFieldIds: Object.fromEntries(createdFieldIds),
              mapping 
            });
            if (!fieldId) {
              console.error(`❌ MISSING FIELD ID: Failed to get field ID for newly created field "${mapping.fieldName}" for header "${header}"`);
              errors.push(`Row ${rowIndex + 2}: Failed to get field ID for newly created field "${mapping.fieldName}"`);
              return;
            }
          } else {
            console.log(`❌ INVALID MAPPING: Invalid mapping type for header "${header}":`, mapping);
            return;
          }

          const value = values[colIndex];
          const fieldType = fieldTypeMap.get(fieldId);
          
          if (!fieldType) {
            errors.push(`Row ${rowIndex + 2}: Unknown field for column "${header}"`);
            return;
          }

          // Convert value based on field type
          let convertedValue: unknown = value;
          
          if (value === '' || value === null || value === undefined) {
            convertedValue = ''; // Use empty string instead of null
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
                const dateValue = parseDateValue(value);
                if (!dateValue) {
                  errors.push(`Row ${rowIndex + 2}: Invalid date "${value}" for field "${header}"`);
                  return;
                }
                // Format as YYYY-MM-DD for date fields (date only, no time)
                convertedValue = dateValue.toISOString().split('T')[0];
                break;
              case 'datetime':
                const datetimeValue = parseDateValue(value);
                if (!datetimeValue) {
                  errors.push(`Row ${rowIndex + 2}: Invalid datetime "${value}" for field "${header}"`);
                  return;
                }
                // Store full ISO string for datetime fields (includes time)
                convertedValue = datetimeValue.toISOString();
                break;
              case 'email':
                if (value && value.trim()) {
                  // Clean and extract valid email from potentially malformed input
                  const cleanedEmail = cleanEmailValue(value);
                  if (cleanedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
                    errors.push(`Row ${rowIndex + 2}: Invalid email "${value}" for field "${header}"`);
                    return;
                  }
                  convertedValue = cleanedEmail;
                } else {
                  convertedValue = ''; // Empty string for empty email
                }
                break;
              case 'single_select':
                // Map CSV value to option ID for single_select fields
                if (value && value.trim()) {
                  // Find the field to get its options
                  const field = fields.find(f => f.id === fieldId);
                  if (field && field.options) {
                    // Find the option that matches this value
                    const optionEntry = Object.entries(field.options).find(([_, optionData]) => {
                      const option = optionData as { name: string; color: string };
                      return option.name === value.trim();
                    });
                    
                    if (optionEntry) {
                      convertedValue = optionEntry[0]; // Use the option ID
                    } else {
                      // Value doesn't match any option - this shouldn't happen with our new logic
                      errors.push(`Row ${rowIndex + 2}: Value "${value}" does not match any option for single_select field "${header}"`);
                      return;
                    }
                  } else {
                    convertedValue = value;
                  }
                } else {
                  convertedValue = ''; // Empty string for empty single_select
                }
                break;
              default: // text, multi_select, link, phone
                convertedValue = value;
                break;
            }
          }

          recordValues[fieldId] = convertedValue;
          // Consider any non-null value as valid data (including empty strings)
          if (convertedValue !== null && convertedValue !== undefined) {
            hasValidData = true;
          }
          
          console.log(`Processed field "${header}":`, { 
            value, 
            convertedValue, 
            fieldId, 
            fieldType, 
            hasValidData 
          });
        });

        console.log(`Row ${rowIndex + 2} summary:`, { 
          recordValues, 
          hasValidData, 
          willCreateRecord: hasValidData 
        });

        if (hasValidData) {
          const recordToCreate = {
            table_id: tableId,
            values: recordValues
          };
          console.log(`✅ Adding record to create:`, recordToCreate);
          recordsToCreate.push(recordToCreate);
        } else {
          console.log(`❌ Skipping row ${rowIndex + 2} - no valid data`);
        }
      } catch (error) {
        // Log error but continue processing other rows
        const errorMsg = `Row ${rowIndex + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    });

    console.log('Records to create:', recordsToCreate.length, 'records');

    if (recordsToCreate.length === 0) {
      throw new Error('No valid data found to import');
    }

    // Batch insert records to avoid hitting Supabase limits
    // Insert in batches of 100 records at a time
    const batchSize = 100;
    let totalImported = 0;
    
    for (let i = 0; i < recordsToCreate.length; i += batchSize) {
      const batch = recordsToCreate.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(recordsToCreate.length / batchSize);
      
      console.log(`Inserting batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
      console.log(`📊 Batch data sample:`, batch.slice(0, 2)); // Show first 2 records for debugging
      
      const { data, error } = await supabase
        .from("records")
        .insert(batch)
        .select('id, table_id, values');

      if (error) {
        console.error(`❌ Database insertion error:`, error);
        throw new Error(`Failed to import batch ${batchNum}: ${error.message}`);
      }
      
      console.log(`✅ Batch ${batchNum} inserted successfully:`, data?.length, 'records');
      totalImported += batch.length;
    }

    console.log(`Successfully imported ${totalImported} records`);

    return {
      imported: totalImported,
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
  static async getAutomations(baseId: string): Promise<Automation[]> {
    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .eq("base_id", baseId)
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

  // Manual automation trigger for testing
  static async triggerAutomationManually(automationId: string, recordId: string): Promise<void> {
    console.log('🧪 MANUAL AUTOMATION TRIGGER: Testing automation', automationId, 'for record', recordId);
    
    const { data: automation, error: fetchError } = await supabase
      .from("automations")
      .select("*")
      .eq("id", automationId)
      .single();

    if (fetchError) throw fetchError;

    console.log('🔍 Manual trigger - Automation details:', JSON.stringify(automation, null, 2));
    await this.executeAutomation(automation, recordId);
  }

  // Debug function to check automation configuration
  static async debugAutomation(automationId: string): Promise<void> {
    console.log('🔍 DEBUGGING AUTOMATION:', automationId);
    
    const { data: automation, error: fetchError } = await supabase
      .from("automations")
      .select("*")
      .eq("id", automationId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching automation:', fetchError);
      return;
    }

    console.log('🔍 Automation Configuration:');
    console.log('  - Name:', automation.name);
    console.log('  - Enabled:', automation.enabled);
    console.log('  - Trigger Type:', automation.trigger.type);
    console.log('  - Trigger Field:', automation.trigger.field_id);
    console.log('  - Trigger Condition:', automation.trigger.condition);
    console.log('  - Action Type:', automation.action.type);
    console.log('  - Target Table:', automation.action.target_table_id);
    console.log('  - Preserve Original:', automation.action.preserve_original);
    console.log('  - Field Mappings:', automation.action.field_mappings);
  }

  // Debug function to test automation execution with a specific record
  static async debugAutomationExecution(automationId: string, recordId: string): Promise<void> {
    console.log('🧪 DEBUGGING AUTOMATION EXECUTION:', automationId, 'with record:', recordId);
    
    try {
      const { data: automation, error: fetchError } = await supabase
        .from("automations")
        .select("*")
        .eq("id", automationId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching automation:', fetchError);
        return;
      }

      console.log('🔍 Testing automation execution...');
      await this.executeAutomation(automation, recordId);
      console.log('✅ Automation execution completed successfully');
    } catch (error) {
      console.error('❌ Automation execution failed:', error);
      console.error('🔍 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorType: typeof error,
        fullError: error
      });
    }
  }

  // Automation execution
  static async executeAutomation(automation: Automation, recordId: string, newValues?: Record<string, unknown>, baseId?: string): Promise<void> {
    console.log('🎯 EXECUTING AUTOMATION:', automation.name, 'enabled:', automation.enabled, 'recordId:', recordId);
    
    if (!automation.enabled) {
      console.log('⏸️ Automation disabled, skipping');
      return;
    }

    // Check if record still exists (might have been deleted by another automation)
    const { data: recordExists, error: recordCheckError } = await supabase
      .from("records")
      .select("id")
      .eq("id", recordId)
      .single();

    if (recordCheckError && recordCheckError.code === 'PGRST116') {
      console.log('⚠️ RECORD NOT FOUND: Record has been deleted, skipping automation:', automation.name);
      return;
    } else if (recordCheckError) {
      console.error('❌ ERROR CHECKING RECORD EXISTENCE:', recordCheckError);
      throw new Error(`Failed to check if record exists: ${recordCheckError.message}`);
    }

    console.log('✅ RECORD EXISTS: Record found, proceeding with automation');

    // Validate automation configuration
    if (!automation.trigger) {
      throw new Error(`Automation ${automation.name} has no trigger configuration`);
    }
    
    if (!automation.action) {
      throw new Error(`Automation ${automation.name} has no action configuration`);
    }
    
    if (!automation.action.target_table_name) {
      throw new Error(`Automation ${automation.name} has no target table configured`);
    }
    
    if (!automation.action.field_mappings || automation.action.field_mappings.length === 0) {
      throw new Error(`Automation ${automation.name} has no field mappings configured`);
    }

    // Resolve target_table_name to target_table_id
    if (!baseId) {
      // Get base_id from automation
      baseId = automation.base_id;
    }
    
    const { data: targetTable, error: tableError } = await supabase
      .from("tables")
      .select("id, name, is_master_list")
      .eq("base_id", baseId)
      .eq("name", automation.action.target_table_name)
      .single();

    if (tableError || !targetTable) {
      throw new Error(`Target table "${automation.action.target_table_name}" not found in base`);
    }

    const targetTableId = targetTable.id;
    const isTargetMasterlist = targetTable.is_master_list;

    // Get masterlist table for this base
    const { data: masterlistTable, error: masterlistError } = await supabase
      .from("tables")
      .select("id")
      .eq("base_id", baseId)
      .eq("is_master_list", true)
      .single();

    if (masterlistError || !masterlistTable) {
      throw new Error(`Masterlist table not found in base`);
    }

    const masterlistTableId = masterlistTable.id;

    const { trigger, action } = automation;
    console.log('🔧 Trigger config:', trigger);
    console.log('🎬 Action config:', action);
    console.log('🎯 Target table ID:', targetTableId, 'Name:', automation.action.target_table_name);
    console.log('📋 Masterlist table ID:', masterlistTableId);

    // Check if trigger condition is met
    const triggerFieldName = trigger.field_name;
    const triggerFieldId = trigger.field_id; // Backward compatibility
    
    console.log('🔍 TRIGGER CHECK START:', {
      automationName: automation.name,
      triggerType: trigger.type,
      triggerFieldName,
      triggerFieldId,
      hasCondition: !!trigger.condition,
      condition: trigger.condition
    });
    
    if (trigger.type === 'field_change' && (triggerFieldName || triggerFieldId) && trigger.condition) {
      console.log('✅ Field change trigger detected - checking condition for field:', triggerFieldName || triggerFieldId);
      console.log('📋 Trigger condition:', trigger.condition);
      
      // Get current record values and table_id
      // Use newValues if provided (from the cell update), otherwise fetch from database
      let record: { values: Record<string, unknown>; table_id: string } | null = null;
      let currentRecordValues: Record<string, unknown> | undefined = newValues;
      
      if (currentRecordValues) {
        // Get table_id from the record in database
        const { data: recordData, error: fetchError } = await supabase
        .from("records")
          .select("table_id")
        .eq("id", recordId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.log('⚠️ RECORD DELETED DURING TRIGGER CHECK: Record no longer exists, skipping automation:', automation.name);
          return;
        }
        throw fetchError;
      }

        record = {
          values: currentRecordValues,
          table_id: recordData.table_id
        };
        console.log('✅ Using newValues from cell update:', currentRecordValues);
      } else {
        // Fetch full record from database
        const { data: recordData, error: fetchError } = await supabase
          .from("records")
          .select("values, table_id")
          .eq("id", recordId)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            console.log('⚠️ RECORD DELETED DURING TRIGGER CHECK: Record no longer exists, skipping automation:', automation.name);
            return;
          }
          throw fetchError;
        }
        
        record = recordData;
        currentRecordValues = recordData.values;
        console.log('✅ Fetched record from database:', recordData);
      }

      // Find the field in the record's table by name (preferred) or by ID (backward compatibility)
      let fieldIdToCheck: string | undefined;
      let currentValue: unknown;
      
      if (triggerFieldName) {
        // New way: Find field by name in the record's table
        console.log('🔍 Finding field by name in record table:', triggerFieldName, 'for table:', record.table_id);
        const { data: matchingFields, error: matchingError } = await supabase
          .from("fields")
          .select("id")
          .eq("table_id", record.table_id)
          .eq("name", triggerFieldName)
          .limit(1);
        
        if (!matchingError && matchingFields && matchingFields.length > 0) {
          fieldIdToCheck = matchingFields[0].id;
          if (fieldIdToCheck && currentRecordValues) {
            currentValue = currentRecordValues[fieldIdToCheck];
          }
          console.log('✅ Found field by name in record table:', {
            fieldId: fieldIdToCheck,
            fieldName: triggerFieldName,
            currentValue: currentValue,
            valueType: typeof currentValue,
            allRecordValues: Object.keys(currentRecordValues || {}),
            recordValues: currentRecordValues
          });
        } else {
          console.log('⚠️ Field not found in record table:', {
            fieldName: triggerFieldName,
            tableId: record.table_id,
            error: matchingError,
            availableFields: 'Will check in all base fields'
          });
          // Field doesn't exist in this table - skip automation for this table
          // This is expected behavior: automation only runs when the field exists
          console.log('⚠️ Skipping automation - field', triggerFieldName, 'does not exist in this table');
          return; // Field doesn't exist in this table, skip automation
        }
      } else if (triggerFieldId) {
        // Backward compatibility: Use field_id
        fieldIdToCheck = triggerFieldId;
        currentValue = currentRecordValues?.[triggerFieldId];
        
        // If value not found, try to find by field name (from the original field)
        if (currentValue === undefined) {
          const { data: triggerField, error: triggerFieldError } = await supabase
            .from("fields")
            .select("id, name, table_id")
            .eq("id", triggerFieldId)
            .single();

          if (!triggerFieldError && triggerField && triggerField.table_id !== record.table_id) {
            console.log('🔍 Trigger field is from different table, finding field by name:', triggerField.name);
            
            const { data: matchingFields, error: matchingError } = await supabase
              .from("fields")
              .select("id")
              .eq("table_id", record.table_id)
              .eq("name", triggerField.name)
              .limit(1);
            
            if (!matchingError && matchingFields && matchingFields.length > 0) {
              fieldIdToCheck = matchingFields[0].id;
              if (fieldIdToCheck && currentRecordValues) {
                currentValue = currentRecordValues[fieldIdToCheck];
              }
              console.log('✅ Found matching field in record table:', fieldIdToCheck, 'Value:', currentValue);
            }
          }
        }
      }
      
      if (!fieldIdToCheck) {
        console.log('⚠️ Could not determine field to check, skipping automation');
        return;
      }

      const triggerValue = trigger.condition.value;
      
      console.log('📊 Current value:', currentValue, 'Trigger value:', triggerValue, 'Operator:', trigger.condition.operator);

      // Check condition - handle option IDs for single_select fields
      let conditionMet = false;
      
      // For single_select fields, we need to check if the current value is an option ID
      // and if the trigger value matches the display text
      let currentValueToCheck = currentValue;
      const triggerValueToCheck = triggerValue;
        
        // Get the field to check if it's a single_select and get the options
      // Use fieldIdToCheck (the actual field in the record's table) instead of trigger.field_id
        const { data: field, error: fieldError } = await supabase
          .from("fields")
          .select("type, options")
        .eq("id", fieldIdToCheck)
          .single();

      if (!fieldError && field && field.type === 'single_select' && field.options) {
        console.log('🔍 SINGLE_SELECT FIELD DETECTED: Checking option values');
        console.log("🔍 FIELD DATA:", JSON.stringify(field, null, 2));
        console.log("🔍 Current value:", currentValue);
        console.log("🔍 Trigger value:", triggerValue);
        
        const options = field.options as Record<string, { name?: string; label?: string; color: string }>;
        
        // If current value looks like an option ID (starts with 'option_'), we need to resolve it
        if (currentValue && String(currentValue).startsWith('option_')) {
          console.log('🔍 OPTION ID DETECTED: Current value is an option ID, need to resolve display text');
          const optionKey = String(currentValue);
          
          console.log("🔍 ALL OPTIONS:", JSON.stringify(options, null, 2));
          console.log("🔍 Looking for option key:", optionKey);
          console.log("🔍 Option exists:", optionKey in options);
          
          if (options[optionKey]) {
            const optionData = options[optionKey];
            console.log("🔍 OPTION DATA:", JSON.stringify(optionData, null, 2));
            
            // Support both 'name' and 'label' properties for backward compatibility
            if (optionData && (optionData.name || optionData.label)) {
              currentValueToCheck = optionData.name || optionData.label || '';
              console.log('✅ RESOLVED OPTION: Option ID', currentValue, 'resolves to display text:', currentValueToCheck);
            } else {
              console.log('⚠️ OPTION HAS NO NAME/LABEL:', optionKey, optionData);
            }
          } else {
            console.log('⚠️ OPTION KEY NOT FOUND in options:', optionKey);
            console.log('⚠️ Available keys:', Object.keys(options));
          }
        } else if (currentValue) {
          // Current value might already be a display name - check if it matches any option name/label
          const currentValueStr = String(currentValue);
          console.log('🔍 Checking if current value matches any option name/label:', currentValueStr);
          
          // Try to find the option by name or label
          for (const [optionKey, optionData] of Object.entries(options)) {
            const optionName = optionData.name || optionData.label || '';
            if (optionName === currentValueStr) {
              // Value is already the display name, use it as-is
              currentValueToCheck = optionName;
              console.log('✅ Current value matches option name/label:', currentValueToCheck);
              break;
            }
          }
        }
      } else if (fieldError) {
          console.log('⚠️ FIELD RESOLUTION FAILED:', {
            hasError: !!fieldError,
          error: fieldError,
          fieldId: fieldIdToCheck
          });
      }
      
      switch (trigger.condition.operator) {
        case 'equals':
          conditionMet = String(currentValueToCheck) === String(triggerValueToCheck);
          break;
        case 'not_equals':
          conditionMet = String(currentValueToCheck) !== String(triggerValueToCheck);
          break;
        case 'contains':
          conditionMet = String(currentValueToCheck).includes(String(triggerValueToCheck));
          break;
        case 'greater_than':
          conditionMet = Number(currentValueToCheck) > Number(triggerValueToCheck);
          break;
        case 'less_than':
          conditionMet = Number(currentValueToCheck) < Number(triggerValueToCheck);
          break;
        case 'greater_than_or_equal':
          conditionMet = Number(currentValueToCheck) >= Number(triggerValueToCheck);
          break;
        case 'less_than_or_equal':
          conditionMet = Number(currentValueToCheck) <= Number(triggerValueToCheck);
          break;
      }

      console.log('✅ Condition met:', conditionMet);
      console.log('🔍 FINAL COMPARISON:', {
        currentValueToCheck,
        triggerValueToCheck,
        operator: trigger.condition.operator,
        originalCurrentValue: currentValue,
        originalTriggerValue: triggerValue
      });
      
      if (!conditionMet) {
        console.log('❌ TRIGGER CONDITION NOT MET: Automation trigger condition not satisfied, skipping automation');
        console.log('🔍 Trigger details:', {
          currentValue,
          triggerValue,
          currentValueToCheck,
          triggerValueToCheck,
          operator: trigger.condition.operator,
          fieldId: trigger.field_id
        });
        return; // Trigger condition not met, skip automation
      }
    }

    // Execute action based on type
    console.log('🎬 Executing action:', action.type);
    console.log('🔍 Full action configuration:', JSON.stringify(action, null, 2));
    
    try {
      switch (action.type) {
        case 'copy_to_table':
          console.log('📋 COPYING TO TABLE:', automation.action.target_table_name);
          await this.executeCopyToTable(recordId, action, targetTableId, masterlistTableId, isTargetMasterlist);
          console.log('✅ Copy to table completed');
          break;
        case 'move_to_table':
          console.log('🔄 MOVING TO TABLE:', automation.action.target_table_name);
          await this.executeMoveToTable(recordId, action, targetTableId, masterlistTableId, baseId);
          console.log('✅ Move to table completed');
          break;
        case 'sync_to_table':
          console.log('🔄 Syncing to table:', automation.action.target_table_name);
          await this.executeSyncToTable(recordId, action, targetTableId, masterlistTableId);
          console.log('✅ Sync to table completed');
          break;
        case 'show_in_table':
          console.log('👁️ Showing in table:', automation.action.target_table_name);
          await this.executeShowInTable(recordId, action, targetTableId, masterlistTableId);
          console.log('✅ Show in table completed');
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (actionError) {
      console.error('❌ ACTION EXECUTION FAILED:', {
        automationName: automation.name,
        actionType: action.type,
        recordId,
        error: actionError
      });
      throw actionError;
    }
  }

  private static async executeCopyToTable(
    recordId: string, 
    action: AutomationAction, 
    targetTableId: string,
    masterlistTableId: string,
    isTargetMasterlist: boolean
  ): Promise<void> {
    console.log('📋 Starting copy to table for record:', recordId);
    
    // Get source record
    const { data: sourceRecord, error: fetchError } = await supabase
      .from("records")
      .select("values")
      .eq("id", recordId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('⚠️ SOURCE RECORD DELETED: Record no longer exists, skipping copy operation');
        return;
      }
      throw fetchError;
    }
    console.log('📄 Source record values:', sourceRecord.values);

    // Map field values based on field mappings
    const targetValues: Record<string, unknown> = {};
    console.log('🔗 Field mappings:', action.field_mappings);
    
    if (action.field_mappings.length === 0) {
      console.log('⚠️ NO FIELD MAPPINGS: Automation has no field mappings configured');
      return;
    }
    
    for (const mapping of action.field_mappings) {
      const sourceValue = sourceRecord.values[mapping.source_field_id];
      targetValues[mapping.target_field_id] = sourceValue;
      console.log(`📝 Mapping ${mapping.source_field_id} -> ${mapping.target_field_id}: ${sourceValue}`);
    }
    
    console.log('🎯 Target values to create:', targetValues);

    // Check for duplicates and handle appropriately
    if (action.duplicate_handling === 'skip') {
      // Get existing records in target table
      const { data: existingRecords, error: existingError } = await supabase
        .from("records")
        .select("id, values")
        .eq("table_id", targetTableId);

      if (existingError) throw existingError;

      // Simple duplicate check based on first field mapping
      if (action.field_mappings.length > 0) {
        const firstMapping = action.field_mappings[0];
        const targetFieldValue = targetValues[firstMapping.target_field_id];
        
        const existingRecord = existingRecords?.find(record => 
          record.values && record.values[firstMapping.target_field_id] === targetFieldValue
        );

        if (existingRecord) {
          console.log(`⚠️ DUPLICATE FOUND: Automation found duplicate record in target table for record ${recordId}.`);
          console.log(`🔍 Duplicate check details:`, {
            targetFieldValue,
            firstMapping,
            existingRecordId: existingRecord.id,
            existingRecordsCount: existingRecords?.length || 0
          });
          
          // Instead of skipping, let's update the existing record
          console.log(`🔄 UPDATING EXISTING RECORD: Instead of skipping, updating existing record ${existingRecord.id}`);
          await this.updateRecord(existingRecord.id, targetValues);
          console.log(`✅ AUTOMATION SUCCESS: Updated existing record in target table:`, existingRecord.id);
          return;
        }
      }
    }

    // Note: Records are created per-table, so we don't need to check masterlist here
    // The masterlist will be maintained separately when records are created/updated

    // Create record in target table
    console.log('💾 Creating record in target table:', targetTableId);
    const newRecord = await this.createRecord(targetTableId, targetValues);
    console.log('✅ AUTOMATION SUCCESS: Record created successfully in target table:', newRecord.id);
  }

  private static async executeMoveToTable(
    recordId: string, 
    action: AutomationAction, 
    targetTableId: string,
    masterlistTableId: string,
    baseId: string
  ): Promise<void> {
    console.log('🔄 MOVING RECORD: Moving record', recordId, 'to table', targetTableId);
    console.log('🔍 Action type:', action.type);
    console.log('🔍 Preserve original setting:', action.preserve_original);
    
    // Get source record to find its current table
    const { data: sourceRecord, error: fetchError } = await supabase
      .from("records")
      .select("table_id, values")
      .eq("id", recordId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('⚠️ SOURCE RECORD NOT FOUND: Record no longer exists, skipping move');
        return;
      }
      throw fetchError;
    }

    const sourceTableId = sourceRecord.table_id;
    const isSourceMasterlist = sourceTableId === masterlistTableId;
    const isTargetMasterlist = targetTableId === masterlistTableId;

    console.log('🔍 Source table ID:', sourceTableId, 'Is masterlist:', isSourceMasterlist);
    console.log('🔍 Target table ID:', targetTableId, 'Is masterlist:', isTargetMasterlist);
    console.log('📄 Source record values:', sourceRecord.values);

    // Handle target table operation (if target is not masterlist)
    if (!isTargetMasterlist) {
      // Map field values from source to target using field mappings
      const targetValues: Record<string, unknown> = {};
      console.log('🔗 Mapping fields to target table:', action.field_mappings);
      console.log('📋 Available source field IDs:', Object.keys(sourceRecord.values));
      
      if (!action.field_mappings || action.field_mappings.length === 0) {
        console.log('⚠️ NO FIELD MAPPINGS: Cannot copy data without field mappings');
        return;
      }
      
      // Build target values by mapping source fields to target fields
      console.log('🔍 Analyzing field mappings...');
      console.log('   Total mappings:', action.field_mappings.length);
      
      for (let i = 0; i < action.field_mappings.length; i++) {
        const mapping = action.field_mappings[i];
        console.log(`   Mapping ${i + 1}:`, JSON.stringify(mapping));
        
        // Check if mapping object has the required properties
        if (!mapping || typeof mapping !== 'object') {
          console.log(`  ⚠️ Skipping invalid mapping at index ${i}: Not an object`);
          continue;
        }
        
        if (!mapping.source_field_id || !mapping.target_field_id) {
          console.log(`  ⚠️ Skipping invalid mapping at index ${i}: Missing field IDs`);
          console.log(`     Has source_field_id:`, !!mapping.source_field_id, mapping.source_field_id);
          console.log(`     Has target_field_id:`, !!mapping.target_field_id, mapping.target_field_id);
          continue;
        }
        
        // Check if source field ID exists in source record
        if (!(mapping.source_field_id in sourceRecord.values)) {
          console.log(`  ⚠️ Source field ID not found in source record: ${mapping.source_field_id}`);
          console.log(`     Target field ID: ${mapping.target_field_id}`);
          continue;
        }
        
        const sourceValue = sourceRecord.values[mapping.source_field_id];
        
        // Copy the value regardless of whether it's empty - empty values are valid and should be copied
        // This allows the target table to have the same structure as source
        targetValues[mapping.target_field_id] = sourceValue;
        
        if (sourceValue === null || sourceValue === '') {
          console.log(`  ✓ ${mapping.source_field_id} -> ${mapping.target_field_id}: '' (empty value copied)`);
        } else {
          console.log(`  ✓ ${mapping.source_field_id} -> ${mapping.target_field_id}: ${sourceValue}`);
        }
      }
      
      // Only proceed if we have at least one mapped field (even if values are empty)
      if (Object.keys(targetValues).length === 0) {
        console.log('⚠️ NO VALUES TO COPY: No valid field mappings found');
        console.log('   Field mappings array length:', action.field_mappings.length);
        console.log('   Field mappings sample:', action.field_mappings.slice(0, 3));
        console.log('   Source record field IDs:', Object.keys(sourceRecord.values));
        
        // If field mappings are empty/invalid but we have source values, try to map by field name
        console.log('🔄 Attempting fallback: Mapping fields by name...');
        
        if (Object.keys(sourceRecord.values).length > 0) {
          // Get source and target fields to map by name
          const sourceFields = await this.getFields(sourceTableId);
          const targetFields = await this.getFields(targetTableId);
          
          const sourceFieldMap = new Map(sourceFields.map(f => [f.id, f]));
          const targetFieldMap = new Map(targetFields.map(f => [f.name, f]));
          
          // Map fields by matching names
          for (const [sourceFieldId, sourceValue] of Object.entries(sourceRecord.values)) {
            const sourceField = sourceFieldMap.get(sourceFieldId);
            if (sourceField && sourceValue !== undefined) {
              const targetField = targetFieldMap.get(sourceField.name);
              if (targetField) {
                targetValues[targetField.id] = sourceValue;
                console.log(`  ✓ Mapped by name: ${sourceField.name} (${sourceFieldId} -> ${targetField.id})`);
              }
            }
          }
          
          if (Object.keys(targetValues).length === 0) {
            console.log('❌ Fallback failed: No fields matched by name');
            return;
          }
          
          console.log('✅ Fallback successful: Mapped fields by name');
        } else {
          console.log('❌ Cannot proceed: No source values and no valid mappings');
          return;
        }
      }
      
      console.log('📦 Target values to copy:', targetValues);

      if (isSourceMasterlist) {
        // Source is masterlist: COPY - create a NEW record in target table (don't reuse ID, don't delete from masterlist)
        console.log('📝 COPY: Source is masterlist - creating NEW record in target table');
        
        const { data: newRecord, error: createError } = await supabase
        .from("records")
          .insert({ table_id: targetTableId, values: targetValues })
        .select("id")
          .single();
        
        if (createError) {
          console.error('❌ Failed to create new record in target table:', createError);
          throw createError;
        }
        console.log('✅ COPY COMPLETED: New record created in target table:', newRecord.id);
        console.log('📋 Masterlist record preserved (not deleted)');
      } else {
        // Source is NOT masterlist: MOVE - create/update in target, update masterlist, delete from source
        console.log('🔄 MOVE: Source is not masterlist - moving record to target table');
        
        // First, update/create masterlist record with ALL source values
        const { data: masterlistRecord, error: masterlistCheckError } = await supabase
          .from("records")
          .select("id, values")
        .eq("table_id", masterlistTableId)
        .eq("id", recordId)
          .maybeSingle();

        if (masterlistCheckError && masterlistCheckError.code !== 'PGRST116') {
          console.error('❌ Error checking masterlist record:', masterlistCheckError);
          throw masterlistCheckError;
        }

        // Merge masterlist values with source values
        const masterlistValues = {
          ...(masterlistRecord?.values || {}),
          ...sourceRecord.values
        };

        if (masterlistRecord) {
          // Update existing masterlist record
          console.log('📋 Updating masterlist record with source values');
          const { error: updateMasterlistError } = await supabase
            .from("records")
            .update({ values: masterlistValues })
            .eq("id", recordId)
            .eq("table_id", masterlistTableId);
          
          if (updateMasterlistError) {
            console.error('❌ Failed to update masterlist record:', updateMasterlistError);
            throw updateMasterlistError;
          }
          console.log('✅ Masterlist record updated');
        } else {
          // Create masterlist record if it doesn't exist
          console.log('📋 Creating record in masterlist');
          const { error: createMasterlistError } = await supabase
            .from("records")
            .insert({ id: recordId, table_id: masterlistTableId, values: masterlistValues });
          
          if (createMasterlistError) {
            if (createMasterlistError.code === '23505') {
              // Conflict - update instead
              console.log('⚠️ Masterlist record conflict, updating instead');
              const { error: updateError } = await supabase
                .from("records")
                .update({ values: masterlistValues })
                .eq("id", recordId)
                .eq("table_id", masterlistTableId);
              
              if (updateError) {
                console.error('❌ Failed to update masterlist record:', updateError);
                throw updateError;
              }
              console.log('✅ Masterlist record updated (after conflict)');
            } else {
              console.error('❌ Failed to create masterlist record:', createMasterlistError);
              throw createMasterlistError;
            }
          } else {
            console.log('✅ Masterlist record created');
          }
        }
        
        // Now create/update record in target table
        // Always check if record exists first to avoid conflicts
        const { data: existingTargetRecord, error: existingError } = await supabase
        .from("records")
          .select("id, values")
        .eq("table_id", targetTableId)
        .eq("id", recordId)
          .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') {
          console.error('❌ Error checking for existing record in target:', existingError);
          throw existingError;
        }

        // Create or update record in target table
        let finalTargetValues = targetValues; // Keep track of what was actually saved
        
        if (existingTargetRecord) {
        // Update existing record in target table
          console.log('💾 Updating existing record in target table (record already exists)');
          const { error: updateError } = await supabase
            .from("records")
            .update({ values: targetValues })
            .eq("id", recordId)
            .eq("table_id", targetTableId);
          
          if (updateError) {
            console.error('❌ Failed to update record in target table:', updateError);
            throw updateError;
          }
        console.log('✅ Record updated in target table');
        } else {
          // Create record in target table with same ID
          console.log('💾 Creating record in target table with same ID');
          const { error: createError } = await supabase
            .from("records")
            .insert({ id: recordId, table_id: targetTableId, values: targetValues });
          
          if (createError) {
            // If conflict occurs (record was created in the meantime), update instead
            if (createError.code === '23505') {
              console.log('⚠️ Target record conflict during create, updating instead');
              const { error: updateError } = await supabase
                .from("records")
                .update({ values: targetValues })
                .eq("id", recordId)
                .eq("table_id", targetTableId);
              
              if (updateError) {
                console.error('❌ Failed to update record in target table after conflict:', updateError);
                throw updateError;
              }
              console.log('✅ Record updated in target table (after conflict)');
            } else {
              console.error('❌ Failed to create record in target table:', createError);
              throw createError;
            }
          } else {
            console.log('✅ Record created in target table');
          }
        }
        
        // Now update masterlist with the TARGET table's values (using the targetValues we just created/updated)
        // This ensures masterlist reflects the final state after the move
        console.log('🔄 Updating masterlist with target table values after move');
        try {
          // Get masterlist fields and target fields to map values by field name
          const masterlistFields = await this.getFields(masterlistTableId);
          const targetFields = await this.getFields(targetTableId);
          
          const masterlistFieldMap = new Map(masterlistFields.map(f => [f.name, f.id]));
          const targetFieldMap = new Map(targetFields.map(f => [f.id, f]));
          
          // Get existing masterlist values to preserve fields not in target
          const { data: currentMasterlistRecord } = await supabase
            .from("records")
            .select("values")
            .eq("id", recordId)
            .eq("table_id", masterlistTableId)
            .maybeSingle();
          
          const mergedMasterlistValues = {
            ...(currentMasterlistRecord?.values || {}),
          };
          
          // Map each target value to masterlist by field name (using targetValues we already have)
          for (const [targetFieldId, value] of Object.entries(finalTargetValues)) {
            const targetField = targetFieldMap.get(targetFieldId);
            if (targetField && value !== undefined) {
              const masterlistFieldId = masterlistFieldMap.get(targetField.name);
              if (masterlistFieldId) {
                mergedMasterlistValues[masterlistFieldId] = value;
                console.log(`  ✓ Mapped ${targetField.name} to masterlist: ${targetFieldId} -> ${masterlistFieldId} = ${value}`);
              }
            }
          }
          
          // Update masterlist with merged values (preserving non-target fields, updating with target values)
          const { error: updateMasterlistAfterMoveError } = await supabase
            .from("records")
            .update({ values: mergedMasterlistValues })
            .eq("id", recordId)
            .eq("table_id", masterlistTableId);
          
          if (updateMasterlistAfterMoveError) {
            console.error('❌ Failed to update masterlist with target values:', updateMasterlistAfterMoveError);
            // Don't throw - the move was successful, this is just a sync issue
          } else {
            console.log('✅ Masterlist updated with target table values after move');
          }
        } catch (syncError) {
          console.error('❌ Error syncing masterlist with target values after move:', syncError);
          // Don't throw - the move was successful
        }
        
        // Delete from source table (if not preserving original)
        if (!action.preserve_original) {
          console.log('🗑️ Deleting record from source table:', sourceTableId);
      const { error: deleteError } = await supabase
        .from("records")
        .delete()
        .eq("id", recordId)
        .eq("table_id", sourceTableId);

      if (deleteError) {
            console.error('❌ Failed to delete record from source table:', deleteError);
            throw deleteError;
          }
          console.log('✅ Record deleted from source table');
    } else {
          console.log('ℹ️ Preserve original is true - keeping record in source table');
        }
        
        console.log('✅ MOVE COMPLETED: Record moved to target, masterlist updated with target values, source deleted');
      }
    } else {
      console.log('ℹ️ Target is masterlist - skipping target table operation');
    }
    

    console.log('✅ MOVE COMPLETED: Record moved successfully');
  }

  private static async executeSyncToTable(
    recordId: string, 
    action: AutomationAction, 
    targetTableId: string,
    masterlistTableId: string
  ): Promise<void> {
    // For sync, we update existing record or create new one
    const { data: sourceRecord, error: fetchError } = await supabase
      .from("records")
      .select("values")
      .eq("id", recordId)
      .single();

    if (fetchError) throw fetchError;

    // Map field values
    const targetValues: Record<string, unknown> = {};
    
    for (const mapping of action.field_mappings) {
      const sourceValue = sourceRecord.values[mapping.source_field_id];
      targetValues[mapping.target_field_id] = sourceValue;
    }

    // Check if record already exists in target table
    if (action.field_mappings.length > 0) {
      const firstMapping = action.field_mappings[0];
      const targetFieldValue = targetValues[firstMapping.target_field_id];
      
      const { data: existingRecords, error: existingError } = await supabase
        .from("records")
        .select("id, values")
        .eq("table_id", targetTableId);

      if (existingError) throw existingError;

      const existingRecord = existingRecords?.find(record => 
        record.values && record.values[firstMapping.target_field_id] === targetFieldValue
      );

      if (existingRecord) {
        // Update existing record
        await this.updateRecord(existingRecord.id, targetValues);
      } else {
        // Create new record
        await this.createRecord(targetTableId, targetValues);
      }
    } else {
      // No field mappings, just create new record
      await this.createRecord(targetTableId, targetValues);
    }
  }

  private static async executeShowInTable(
    recordId: string, 
    action: AutomationAction, 
    targetTableId: string,
    masterlistTableId: string
  ): Promise<void> {
    // For show_in_table, we create a record that links back to the original
    // This is useful for creating views or filtered displays
    
    const { data: sourceRecord, error: fetchError } = await supabase
      .from("records")
      .select("values")
      .eq("id", recordId)
      .single();

    if (fetchError) throw fetchError;

    // Map field values
    const targetValues: Record<string, unknown> = {};
    
    for (const mapping of action.field_mappings) {
      const sourceValue = sourceRecord.values[mapping.source_field_id];
      targetValues[mapping.target_field_id] = sourceValue;
    }

    // Add a reference to the original record
    targetValues['_source_record_id'] = recordId;

    await this.createRecord(targetTableId, targetValues);
  }

  // Check and execute automations for a record update
  static async checkAndExecuteAutomations(
    tableId: string, 
    recordId: string, 
    newValues?: Record<string, unknown>
  ): Promise<void> {
    console.log('🔍 CHECKING AUTOMATIONS: Table:', tableId, 'Record:', recordId, 'Values:', newValues);
    
    // Get base_id from table
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("base_id, name")
      .eq("id", tableId)
      .single();

    if (tableError || !table) {
      console.error('❌ ERROR: Could not find table:', tableError);
      return;
    }

    const baseId = table.base_id;
    const tableName = table.name;

    // Get all automations for this base
    const allAutomations = await this.getAutomations(baseId);
    console.log('📋 ALL AUTOMATIONS FOUND:', allAutomations.length, 'automations for base');

    // Filter automations that apply to this table/record
    const applicableAutomations = allAutomations.filter(automation => {
      // Skip disabled automations
      if (!automation.enabled) {
        console.log('⏭️ Skipping disabled automation:', automation.name);
        return false;
      }
      
      // If trigger specifies a table_name (non-empty, non-null), it must match
      const triggerTableName = automation.trigger?.table_name;
      if (triggerTableName && triggerTableName.trim() !== '' && triggerTableName !== tableName) {
        console.log('⏭️ Skipping automation - table name mismatch:', {
          automation: automation.name,
          triggerTableName,
          currentTableName: tableName
        });
        return false;
      }
      // Otherwise, automation applies to all tables in the base
      console.log('✅ Automation applies to this table:', automation.name);
      return true;
    });

    console.log('📋 APPLICABLE AUTOMATIONS:', applicableAutomations.length, 'automations');
    console.log('📋 Automation details:', applicableAutomations.map(a => ({ 
      id: a.id, 
      name: a.name, 
      enabled: a.enabled,
      trigger: a.trigger,
      action: a.action
    })));

    if (applicableAutomations.length === 0) {
      console.log('⚠️ NO APPLICABLE AUTOMATIONS: No automations found for this table/record');
      return;
    }

    // Execute each automation
    for (const automation of applicableAutomations) {
      try {
        console.log('⚡ EXECUTING AUTOMATION:', automation.name, 'for record:', recordId);
        console.log('🔍 Automation details:', {
          id: automation.id,
          name: automation.name,
          enabled: automation.enabled,
          trigger: automation.trigger,
          action: automation.action
        });
        await this.executeAutomation(automation, recordId, newValues, baseId);
        console.log('✅ AUTOMATION COMPLETED:', automation.name);
      } catch (error) {
        console.error(`❌ AUTOMATION ERROR: ${automation.name} (${automation.id}):`, error);
        console.error('🔍 Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
          fullError: error
        });
        console.error('🔍 Automation configuration that failed:', {
          id: automation.id,
          name: automation.name,
          enabled: automation.enabled,
          trigger: automation.trigger,
          action: automation.action
        });
        // Continue with other automations even if one fails
      }
    }
  }
}
