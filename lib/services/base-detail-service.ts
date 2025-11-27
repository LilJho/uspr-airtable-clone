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
    
    // Check table metadata (masterlist tables are now allowed but we log for clarity)
    const { data: tableData, error: tableCheckError } = await supabase
      .from("tables")
      .select("is_master_list, name")
      .eq("id", fieldData.table_id)
      .single();
    
    if (tableCheckError) {
      throw new Error(`Failed to verify table: ${tableCheckError.message}`);
    }
    
    if (tableData?.is_master_list) {
      console.log('ℹ️ Creating field directly in masterlist table:', tableData.name);
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
    // Pass only the changed field in newValues for filtering, but pass full updatedValues for condition checking
    try {
      const changedFieldValues = { [fieldId]: value };
      await this.checkAndExecuteAutomations(record.table_id, recordId, changedFieldValues, updatedValues);
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
    
    // Build fieldTypeMap - use allBaseFields if importing to masterlist, otherwise use fields from the table
    // This ensures fieldTypeMap includes all fields that might be referenced in mappings
    const fieldsForTypeMap = isMasterlist ? allBaseFields : fields;
    const fieldTypeMap = new Map(fieldsForTypeMap.map(f => [f.id, f.type]));
    console.log(`📋 Built fieldTypeMap with ${fieldTypeMap.size} fields (isMasterlist: ${isMasterlist})`);
    
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
              return; // Skip this field but continue with others
            }
          } else {
            console.log(`❌ INVALID MAPPING: Invalid mapping type for header "${header}":`, mapping);
            return; // Skip this field but continue with others
          }

          const value = values[colIndex];
          const fieldType = fieldTypeMap.get(fieldId);
          
          if (!fieldType) {
            console.warn(`Row ${rowIndex + 2}: Unknown field for column "${header}" - skipping this field`);
            return; // Skip this field but continue with others
          }

          // Convert value based on field type
          let convertedValue: unknown = value;
          let fieldProcessed = false;
          
          if (value === '' || value === null || value === undefined) {
            convertedValue = ''; // Use empty string instead of null
            fieldProcessed = true; // Empty values are valid
          } else {
            try {
            switch (fieldType) {
              case 'number':
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    console.warn(`Row ${rowIndex + 2}: Invalid number "${value}" for field "${header}" - skipping this field`);
                    return; // Skip this field but continue with others
                }
                convertedValue = numValue;
                  fieldProcessed = true;
                break;
              case 'checkbox':
                convertedValue = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
                  fieldProcessed = true;
                break;
              case 'date':
                const dateValue = parseDateValue(value);
                if (!dateValue) {
                    console.warn(`Row ${rowIndex + 2}: Invalid date "${value}" for field "${header}" - skipping this field`);
                    return; // Skip this field but continue with others
                }
                // Format as YYYY-MM-DD for date fields (date only, no time)
                convertedValue = dateValue.toISOString().split('T')[0];
                  fieldProcessed = true;
                break;
              case 'datetime':
                const datetimeValue = parseDateValue(value);
                if (!datetimeValue) {
                    console.warn(`Row ${rowIndex + 2}: Invalid datetime "${value}" for field "${header}" - skipping this field`);
                    return; // Skip this field but continue with others
                }
                // Store full ISO string for datetime fields (includes time)
                convertedValue = datetimeValue.toISOString();
                  fieldProcessed = true;
                break;
              case 'email':
                if (value && value.trim()) {
                  // Clean and extract valid email from potentially malformed input
                  const cleanedEmail = cleanEmailValue(value);
                  if (cleanedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
                      console.warn(`Row ${rowIndex + 2}: Invalid email "${value}" for field "${header}" - skipping this field`);
                      return; // Skip this field but continue with others
                  }
                  convertedValue = cleanedEmail;
                } else {
                  convertedValue = ''; // Empty string for empty email
                }
                  fieldProcessed = true;
                break;
              case 'single_select':
                // Map CSV value to option ID for single_select fields
                if (value && value.trim()) {
                    // Find the field to get its options - use fieldsForTypeMap to include all fields when importing to masterlist
                    const field = fieldsForTypeMap.find(f => f.id === fieldId);
                  if (field && field.options) {
                    // Find the option that matches this value
                    const optionEntry = Object.entries(field.options).find(([_, optionData]) => {
                      const option = optionData as { name: string; color: string };
                      return option.name === value.trim();
                    });
                    
                    if (optionEntry) {
                      convertedValue = optionEntry[0]; // Use the option ID
                        fieldProcessed = true;
                    } else {
                        // Value doesn't match any option - skip this field but continue with others
                        console.warn(`Row ${rowIndex + 2}: Value "${value}" does not match any option for single_select field "${header}" - skipping this field`);
                        return; // Skip this field but continue with others
                    }
                  } else {
                    convertedValue = value;
                      fieldProcessed = true;
                  }
                } else {
                  convertedValue = ''; // Empty string for empty single_select
                    fieldProcessed = true;
                }
                break;
              default: // text, multi_select, link, phone
                convertedValue = value;
                  fieldProcessed = true;
                break;
              }
            } catch (fieldError) {
              console.warn(`Row ${rowIndex + 2}: Error processing field "${header}":`, fieldError);
              return; // Skip this field but continue with others
            }
          }

          // Only set the value if the field was successfully processed
          if (fieldProcessed) {
          recordValues[fieldId] = convertedValue;
            // Consider the row valid if at least one field was successfully processed
            // Even if the value is an empty string, the field exists and was processed
            hasValidData = true;
          }
          
          console.log(`Processed field "${header}":`, { 
            value, 
            convertedValue, 
            fieldId, 
            fieldType, 
            fieldProcessed,
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
  static async executeAutomation(automation: Automation, recordId: string, newValues?: Record<string, unknown>, baseId?: string, sourceTableId?: string): Promise<void> {
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
      // Always fetch from database to get full record values, then merge newValues if provided
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

      // Merge database values with newValues (if provided) to get the latest state
      const currentRecordValues = newValues 
        ? { ...recordData.values, ...newValues }
        : recordData.values;
      
      const record = {
          values: currentRecordValues,
          table_id: recordData.table_id
        };
      
      console.log('✅ Record values (merged with newValues):', {
        databaseValues: recordData.values,
        newValues: newValues,
        mergedValues: currentRecordValues
      });

      // Find the field in the record's table by name (preferred) or by ID (backward compatibility)
      // IMPORTANT: If record is in masterlist, we need to find the field in the source table (where the record came from)
      // because record values are keyed by field IDs from the original table, not masterlist field IDs
      let fieldIdToCheck: string | undefined;
      let currentValue: unknown;
      
      // Determine which table to look for the field in
      // If record is in masterlist, use sourceTableId (the table that triggered the automation)
      // Otherwise, use the record's table_id
      const tableToCheck = (record.table_id === masterlistTableId && sourceTableId) 
        ? sourceTableId 
        : record.table_id;
      
      console.log('🔍 Field lookup context:', {
        recordTableId: record.table_id,
        isMasterlist: record.table_id === masterlistTableId,
        sourceTableId: sourceTableId,
        tableToCheck: tableToCheck
      });
      
      if (triggerFieldName) {
        // New way: Find field by name in the appropriate table
        console.log('🔍 Finding field by name:', triggerFieldName, 'in table:', tableToCheck);
        const { data: matchingFields, error: matchingError } = await supabase
          .from("fields")
          .select("id")
          .eq("table_id", tableToCheck)
          .eq("name", triggerFieldName)
          .limit(1);
        
        if (!matchingError && matchingFields && matchingFields.length > 0) {
          fieldIdToCheck = matchingFields[0].id;
          if (fieldIdToCheck && currentRecordValues) {
            currentValue = currentRecordValues[fieldIdToCheck];
          }
          
          // If value is null/undefined and record is in masterlist, try masterlist field ID
          if ((currentValue === null || currentValue === undefined) && record.table_id === masterlistTableId) {
            console.log('⚠️ Value not found with source table field ID, trying masterlist field ID');
            const { data: masterlistFields, error: masterlistError } = await supabase
              .from("fields")
              .select("id")
              .eq("table_id", masterlistTableId)
              .eq("name", triggerFieldName)
              .limit(1);
            
            if (!masterlistError && masterlistFields && masterlistFields.length > 0) {
              const masterlistFieldId = masterlistFields[0].id;
              const masterlistValue = currentRecordValues?.[masterlistFieldId];
              if (masterlistValue !== null && masterlistValue !== undefined) {
                fieldIdToCheck = masterlistFieldId;
                currentValue = masterlistValue;
                console.log('✅ Found value using masterlist field ID:', masterlistFieldId);
              }
            }
          }
          
          // If still null/undefined, try to find any field with the same name that has a value
          if ((currentValue === null || currentValue === undefined) && currentRecordValues) {
            console.log('⚠️ Value still not found, searching all fields with same name in record values');
            const { data: allFieldsWithName, error: allFieldsError } = await supabase
              .from("fields")
              .select("id, table_id")
              .eq("name", triggerFieldName);
            
            if (!allFieldsError && allFieldsWithName) {
              // Try each field ID to see if it exists in record values
              for (const field of allFieldsWithName) {
                const value = currentRecordValues[field.id];
                if (value !== null && value !== undefined && value !== '') {
                  fieldIdToCheck = field.id;
                  currentValue = value;
                  console.log('✅ Found value using field ID from table:', field.table_id, 'field ID:', field.id);
                  break;
                }
              }
            }
          }
          
          console.log('✅ Found field by name:', {
            fieldId: fieldIdToCheck,
            fieldName: triggerFieldName,
            tableId: tableToCheck,
            currentValue: currentValue,
            valueType: typeof currentValue,
            allRecordValues: Object.keys(currentRecordValues || {}),
            recordValues: currentRecordValues
          });
        } else {
          console.log('⚠️ Field not found in table:', {
            fieldName: triggerFieldName,
            tableId: tableToCheck,
            error: matchingError,
            recordTableId: record.table_id
          });
          // Field doesn't exist in this table - skip automation for this table
          // This is expected behavior: automation only runs when the field exists
          console.log('⚠️ Skipping automation - field', triggerFieldName, 'does not exist in table', tableToCheck);
          return; // Field doesn't exist in this table, skip automation
        }
      } else if (triggerFieldId) {
        // Backward compatibility: Use field_id
        fieldIdToCheck = triggerFieldId;
        currentValue = currentRecordValues?.[triggerFieldId];
        
        // If value not found, try to find by field name (from the original field)
        if (currentValue === undefined || currentValue === null) {
          const { data: triggerField, error: triggerFieldError } = await supabase
            .from("fields")
            .select("id, name, table_id")
            .eq("id", triggerFieldId)
            .single();

          if (!triggerFieldError && triggerField) {
            // Check if we need to find the field in a different table
            const needsLookup = triggerField.table_id !== tableToCheck;
            
            if (needsLookup) {
              console.log('🔍 Trigger field is from different table, finding field by name:', triggerField.name, 'in table:', tableToCheck);
            
            const { data: matchingFields, error: matchingError } = await supabase
              .from("fields")
              .select("id")
                .eq("table_id", tableToCheck)
              .eq("name", triggerField.name)
              .limit(1);
            
            if (!matchingError && matchingFields && matchingFields.length > 0) {
              fieldIdToCheck = matchingFields[0].id;
              if (fieldIdToCheck && currentRecordValues) {
                currentValue = currentRecordValues[fieldIdToCheck];
              }
                console.log('✅ Found matching field in table:', {
                  fieldId: fieldIdToCheck,
                  tableId: tableToCheck,
                  value: currentValue
                });
              } else {
                console.log('⚠️ Could not find matching field by name in table:', tableToCheck);
              }
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

      console.log('✅ Condition met:', conditionMet, 'for automation:', automation.name);
      console.log('🔍 FINAL COMPARISON:', {
        automationName: automation.name,
        currentValueToCheck,
        triggerValueToCheck,
        operator: trigger.condition.operator,
        originalCurrentValue: currentValue,
        originalTriggerValue: triggerValue
      });
      
      if (!conditionMet) {
        console.log(`❌ TRIGGER CONDITION NOT MET for "${automation.name}": Automation trigger condition not satisfied, skipping automation`);
        console.log('🔍 Trigger details:', {
          automationName: automation.name,
          currentValue,
          triggerValue,
          currentValueToCheck,
          triggerValueToCheck,
          operator: trigger.condition.operator,
          fieldId: trigger.field_id,
          fieldName: trigger.field_name
        });
        return; // Trigger condition not met, skip automation
      } else {
        console.log(`✅✅✅ CONDITION MET for "${automation.name}" - WILL EXECUTE`);
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
          await this.executeMoveToTable(recordId, action, targetTableId, masterlistTableId, baseId, sourceTableId, newValues);
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

  // Helper function to sync masterlist with a table's values
  private static async syncMasterlistWithTable(
    recordId: string,
    targetTableId: string,
    masterlistTableId: string,
    targetValues: Record<string, unknown>
  ): Promise<void> {
    try {
      // Get masterlist fields and target fields to map values by field name
      const masterlistFields = await this.getFields(masterlistTableId);
      const targetFields = await this.getFields(targetTableId);
      
      const masterlistFieldMap = new Map(masterlistFields.map(f => [f.name, f.id]));
      const targetFieldMap = new Map(targetFields.map(f => [f.id, f]));
      
      // Get existing masterlist values to preserve fields not in target
      const { data: currentMasterlistRecord, error: masterlistCheckError } = await supabase
        .from("records")
        .select("values")
        .eq("id", recordId)
        .eq("table_id", masterlistTableId)
        .maybeSingle();
      
      if (masterlistCheckError && masterlistCheckError.code !== 'PGRST116') {
        console.error('❌ Error checking masterlist record:', masterlistCheckError);
        throw masterlistCheckError;
      }
      
      // Start with existing masterlist values (or empty if doesn't exist)
      const mergedMasterlistValues = {
        ...(currentMasterlistRecord?.values || {}),
      };
      
      // Map each target value to masterlist by field name
      for (const [targetFieldId, value] of Object.entries(targetValues)) {
        const targetField = targetFieldMap.get(targetFieldId);
        if (targetField && value !== undefined) {
          const masterlistFieldId = masterlistFieldMap.get(targetField.name);
          if (masterlistFieldId) {
            mergedMasterlistValues[masterlistFieldId] = value;
            console.log(`  ✓ Mapped ${targetField.name} to masterlist: ${targetFieldId} -> ${masterlistFieldId} = ${value}`);
          }
        }
      }
      
      // Update or create masterlist record with merged values
      if (currentMasterlistRecord) {
        // Update existing masterlist record
        const { error: updateMasterlistError } = await supabase
          .from("records")
          .update({ values: mergedMasterlistValues })
          .eq("id", recordId)
          .eq("table_id", masterlistTableId);
        
        if (updateMasterlistError) {
          console.error('❌ Failed to update masterlist with target values:', updateMasterlistError);
          // Don't throw - the move was successful, this is just a sync issue
        } else {
          console.log('✅ Masterlist updated with target table values');
        }
      } else {
        // Create masterlist record if it doesn't exist
        const { error: createMasterlistError } = await supabase
          .from("records")
          .insert({ id: recordId, table_id: masterlistTableId, values: mergedMasterlistValues });
        
        if (createMasterlistError) {
          if (createMasterlistError.code === '23505') {
            // Conflict - update instead
            console.log('⚠️ Masterlist record conflict during create, updating instead');
            const { error: updateError } = await supabase
              .from("records")
              .update({ values: mergedMasterlistValues })
              .eq("id", recordId)
              .eq("table_id", masterlistTableId);
            
            if (updateError) {
              console.error('❌ Failed to update masterlist record after conflict:', updateError);
              // Don't throw - the move was successful
            } else {
              console.log('✅ Masterlist updated with target table values (after conflict)');
            }
          } else {
            console.error('❌ Failed to create masterlist record:', createMasterlistError);
            // Don't throw - the move was successful, this is just a sync issue
          }
        } else {
          console.log('✅ Masterlist record created with target table values');
        }
      }
    } catch (syncError) {
      console.error('❌ Error syncing masterlist with target values:', syncError);
      // Don't throw - the move was successful, this is just a sync issue
    }
  }

  private static async executeMoveToTable(
    recordId: string, 
    action: AutomationAction, 
    targetTableId: string,
    masterlistTableId: string,
    baseId: string,
    sourceTableId?: string,
    newValues?: Record<string, unknown>
  ): Promise<void> {
    console.log('🔄 MOVING RECORD: Moving record', recordId, 'to table', targetTableId);
    console.log('🔍 Action type:', action.type);
    console.log('🔍 Preserve original setting:', action.preserve_original);
    console.log('🔍 New values from cell update:', newValues);
    
    // Get source record to find its current table and values
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

    // Merge newValues with sourceRecord.values to get the latest values (including Status update)
    // newValues takes precedence as it contains the most recent updates
    const sourceRecordValues = newValues 
      ? { ...sourceRecord.values, ...newValues }
      : sourceRecord.values;

    console.log('📄 Source record values (from DB):', sourceRecord.values);
    console.log('📄 New values (from cell update):', newValues);
    console.log('📄 Merged source record values:', sourceRecordValues);

    // Use the source table that triggered the automation, or fall back to the record's current table_id
    const actualSourceTableId = sourceTableId || sourceRecord.table_id;
    const isSourceMasterlist = actualSourceTableId === masterlistTableId;
    const isTargetMasterlist = targetTableId === masterlistTableId;

    console.log('🔍 Source table ID (triggered):', actualSourceTableId, 'Is masterlist:', isSourceMasterlist);
    console.log('🔍 Record current table ID:', sourceRecord.table_id);
    console.log('🔍 Target table ID:', targetTableId, 'Is masterlist:', isTargetMasterlist);

    // Handle target table operation (if target is not masterlist)
    if (!isTargetMasterlist) {
      // Map field values from source to target using field mappings
      const targetValues: Record<string, unknown> = {};
      console.log('🔗 Mapping fields to target table:', action.field_mappings);
      console.log('📋 Available source field IDs:', Object.keys(sourceRecordValues));
      
      if (!action.field_mappings || action.field_mappings.length === 0) {
        console.log('⚠️ NO FIELD MAPPINGS: Cannot copy data without field mappings');
        return;
      }
      
      // Get source fields from the actual source table to map by name
      const sourceFields = await this.getFields(actualSourceTableId);
      const sourceFieldMap = new Map(sourceFields.map(f => [f.id, f]));
      const sourceFieldNameMap = new Map(sourceFields.map(f => [f.name, f]));
      
      // Build target values by mapping source fields to target fields
      console.log('🔍 Analyzing field mappings...');
      console.log('   Total mappings:', action.field_mappings.length);
      console.log('   Source table ID:', actualSourceTableId);
      console.log('   Source fields available:', sourceFields.map(f => f.name));
      
      // Get all fields from all tables to resolve field names globally
      // This will be reused later in the merge step, so we fetch it once here
      const allBaseFields = await this.getAllFields(baseId);
      const allFieldsMap = new Map(allBaseFields.map(f => [f.id, f]));
      
      // Get target fields to resolve target field by name
      const targetFields = await this.getFields(targetTableId);
      const targetFieldNameMap = new Map(targetFields.map(f => [f.name, f]));
      
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
        
        // Resolve source field by name (global approach)
        // Get the field name from the mapped source field ID (could be from any table)
        const mappedSourceField = allFieldsMap.get(mapping.source_field_id);
        if (!mappedSourceField) {
          console.log(`  ⚠️ Source field ID not found in any table: ${mapping.source_field_id}`);
          continue;
        }
        
        const sourceFieldName = mappedSourceField.name;
        console.log(`  🔍 Resolving source field "${sourceFieldName}" in actual source table...`);
        
        // Find the field with the same name in the actual source table
        const sourceField = sourceFieldNameMap.get(sourceFieldName);
        if (!sourceField) {
          console.log(`  ⚠️ Source field "${sourceFieldName}" not found in source table: ${actualSourceTableId}`);
          continue;
        }
        
        const sourceFieldIdToUse = sourceField.id;
        console.log(`  ✅ Found source field "${sourceFieldName}" in source table: ${sourceFieldIdToUse}`);
        
        // Check if source field ID exists in source record
        if (!(sourceFieldIdToUse in sourceRecordValues)) {
          console.log(`  ⚠️ Source field ID not found in source record values: ${sourceFieldIdToUse}`);
          console.log(`     Field name: ${sourceField.name}`);
          console.log(`     Available field IDs in record:`, Object.keys(sourceRecordValues));
          continue;
        }
        
        // Resolve target field by name (global approach)
        // Get the field name from the mapped target field ID
        const mappedTargetField = allFieldsMap.get(mapping.target_field_id);
        if (!mappedTargetField) {
          console.log(`  ⚠️ Target field ID not found in any table: ${mapping.target_field_id}`);
          continue;
        }
        
        const targetFieldName = mappedTargetField.name;
        console.log(`  🔍 Resolving target field "${targetFieldName}" in target table...`);
        
        // Find the field with the same name in the target table
        const targetField = targetFieldNameMap.get(targetFieldName);
        if (!targetField) {
          console.log(`  ⚠️ Target field "${targetFieldName}" not found in target table: ${targetTableId}`);
          continue;
        }
        
        const targetFieldIdToUse = targetField.id;
        console.log(`  ✅ Found target field "${targetFieldName}" in target table: ${targetFieldIdToUse}`);
        
        const sourceValue = sourceRecordValues[sourceFieldIdToUse];
        
        // Copy the value regardless of whether it's empty - empty values are valid and should be copied
        // This allows the target table to have the same structure as source
        targetValues[targetFieldIdToUse] = sourceValue;
        
        if (sourceValue === null || sourceValue === '') {
          console.log(`  ✓ ${sourceField.name} (${sourceFieldIdToUse}) -> ${targetField.name} (${targetFieldIdToUse}): '' (empty value copied)`);
        } else {
          console.log(`  ✓ ${sourceField.name} (${sourceFieldIdToUse}) -> ${targetField.name} (${targetFieldIdToUse}): ${sourceValue}`);
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
        
        if (Object.keys(sourceRecordValues).length > 0) {
          // Get source and target fields to map by name
          const sourceFields = await this.getFields(actualSourceTableId);
          const targetFields = await this.getFields(targetTableId);
          
          const sourceFieldMap = new Map(sourceFields.map(f => [f.id, f]));
          const targetFieldMap = new Map(targetFields.map(f => [f.name, f]));
          
          // Map fields by matching names
          for (const [sourceFieldId, sourceValue] of Object.entries(sourceRecordValues)) {
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
      
      // Merge all source values with mapped values to preserve all data
      // Start with all source values, then apply field mappings to map to target field IDs
      console.log('🔄 Merging all source values with field mappings...');
      // Reuse targetFields and allFieldsMap from above (already fetched)
      const targetFieldMap = new Map(targetFields.map(f => [f.name, f]));
      console.log('📋 Target table fields:', targetFields.map(f => f.name));
      
      // Track which values came from newValues (recent updates)
      const newValueFieldIds = new Set(newValues ? Object.keys(newValues) : []);
      
      // First, prioritize values from newValues by mapping them first
      // This ensures recent updates (like Status) are preserved
      const mergedTargetValues: Record<string, unknown> = {};
      console.log('🔄 Preserving all source values, total fields:', Object.keys(sourceRecordValues).length);
      console.log('🔄 Fields from newValues (recent updates):', Array.from(newValueFieldIds));
      console.log('🔄 NewValues content:', newValues);
      
      // First pass: Process values from newValues (prioritize recent updates)
      if (newValues) {
        console.log('🔄 FIRST PASS: Processing values from newValues (recent updates)...');
        for (const [newValueFieldId, newValue] of Object.entries(newValues)) {
          // Find the field to get its name (could be from any table)
          const newValueField = allFieldsMap.get(newValueFieldId);
          
          if (!newValueField) {
            console.log(`  ⚠️ Could not find field for newValue ID ${newValueFieldId}, value: ${newValue}`);
            continue;
          }
          
          // Skip undefined values
          if (newValue === undefined) {
            console.log(`  ⚠️ Skipping undefined newValue for ${newValueField.name} (${newValueFieldId})`);
            continue;
          }
          
          // Find target field with same name
          const targetField = targetFieldMap.get(newValueField.name);
          if (targetField) {
            mergedTargetValues[targetField.id] = newValue;
            console.log(`  ✓ PRIORITIZED ${newValueField.name} from newValues (${newValueFieldId} -> ${targetField.id}): ${newValue} [FROM NEWVALUES]`);
            } else {
            console.log(`  ⚠️ Target field not found for ${newValueField.name} from newValues, value will be lost: ${newValue}`);
          }
        }
      }
      
      // Second pass: Process all other source values (preserve all data)
      console.log('🔄 SECOND PASS: Processing all other source values...');
      for (const [sourceFieldId, sourceValue] of Object.entries(sourceRecordValues)) {
        const isFromNewValues = newValueFieldIds.has(sourceFieldId);
        
        // Skip if we already processed this from newValues (to avoid overwriting)
        if (isFromNewValues) {
          continue;
        }
        
        // Find the source field to get its name (check both sourceFields and allBaseFields)
        const sourceField = sourceFieldMap.get(sourceFieldId) || allFieldsMap.get(sourceFieldId);
        
        if (!sourceField) {
          console.log(`  ⚠️ Could not find field for ID ${sourceFieldId}, value: ${sourceValue}`);
          continue;
        }
        
        // Don't filter out values - preserve all non-undefined values (including empty strings and null)
        // Only skip if value is explicitly undefined
        if (sourceValue === undefined) {
          console.log(`  ⚠️ Skipping undefined value for ${sourceField.name} (${sourceFieldId})`);
          continue;
        }
        
        // Find target field with same name
        const targetField = targetFieldMap.get(sourceField.name);
        if (targetField) {
          // Only set if not already set from newValues
          if (!(targetField.id in mergedTargetValues)) {
            mergedTargetValues[targetField.id] = sourceValue;
            console.log(`  ✓ Preserved ${sourceField.name} (${sourceFieldId} -> ${targetField.id}): ${sourceValue}`);
        } else {
            console.log(`  ⏭️ Skipped ${sourceField.name} - already set from newValues`);
          }
        } else {
          console.log(`  ⚠️ Target field not found for ${sourceField.name}, skipping value: ${sourceValue}`);
        }
      }
      
      // Then apply explicit field mappings (these can override name-based mappings, but not newValues)
      console.log('🔄 Applying explicit field mappings...');
      for (const [targetFieldId, mappedValue] of Object.entries(targetValues)) {
        // Check if we already have a value for this target field from the preserve step
        const existingValue = mergedTargetValues[targetFieldId];
        
        // Check if this target field corresponds to a field that was in newValues
        // We need to find the target field name, then check if any source field with that name was in newValues
        const targetField = targetFields.find(f => f.id === targetFieldId);
        let isFromNewValues = false;
        
        if (targetField && newValues) {
          // Check if any field with the same name was updated in newValues
          for (const [newValueFieldId, newValue] of Object.entries(newValues)) {
            const newValueField = allFieldsMap.get(newValueFieldId);
            if (newValueField && newValueField.name === targetField.name) {
              isFromNewValues = true;
              console.log(`  🔍 Target field ${targetField.name} (${targetFieldId}) corresponds to newValue field ${newValueField.name} (${newValueFieldId})`);
              break;
            }
          }
        }
        
        if (existingValue !== undefined) {
          if (isFromNewValues) {
            console.log(`  ✓ Keeping preserved value for ${targetField?.name || targetFieldId} (from newValues): ${existingValue}`);
            // Keep the existing value (from newValues) - don't override
            continue;
            } else {
            console.log(`  ✓ Overriding with field mapping: ${targetField?.name || targetFieldId} (${targetFieldId}) = ${mappedValue} (was: ${existingValue})`);
            }
          } else {
          console.log(`  ✓ Setting field mapping: ${targetField?.name || targetFieldId} (${targetFieldId}) = ${mappedValue}`);
        }
        
        mergedTargetValues[targetFieldId] = mappedValue;
      }
      
      console.log('📦 Final target values (merged):', mergedTargetValues);
      console.log('📊 Final target values keys:', Object.keys(mergedTargetValues));
      const finalTargetValues = mergedTargetValues;

      if (isSourceMasterlist) {
        // Source is masterlist: MOVE - update the record's table_id to target table, then sync masterlist
        console.log('🔄 MOVE: Source is masterlist - moving record to target table by updating table_id');
        
        // Update the existing record's table_id to the target table
        // This makes the record move from masterlist to target table
        console.log('🔁 Updating record table_id from masterlist to', targetTableId);
        const { error: moveRecordError } = await supabase
            .from("records")
          .update({ table_id: targetTableId, values: finalTargetValues })
            .eq("id", recordId)
          .eq("table_id", masterlistTableId); // Only update if it's still in masterlist
        
        if (moveRecordError) {
          console.error('❌ Failed to move record from masterlist to target table:', moveRecordError);
          throw moveRecordError;
        }
        console.log('✅ Record table_id updated to target table');
        
        // Now sync masterlist with the target table's values
        console.log('🔄 Syncing masterlist with target table values after move');
        await this.syncMasterlistWithTable(recordId, targetTableId, masterlistTableId, finalTargetValues);
        
        console.log('✅ MOVE COMPLETED: Record moved from masterlist to target table and masterlist synced');
          } else {
        // Source is NOT masterlist: MOVE - simply update the record's table_id to target table
        console.log('🔄 MOVE: Source is not masterlist - moving record to target table by updating table_id');
        
        // Simply update the existing record's table_id to the target table
        // This makes the record disappear from source table and appear in target table
        console.log('🔁 Updating record table_id from', actualSourceTableId, 'to', targetTableId);
        const { error: moveRecordError } = await supabase
        .from("records")
          .update({ table_id: targetTableId, values: finalTargetValues })
        .eq("id", recordId)
          .eq("table_id", actualSourceTableId); // Only update if it's still in the source table
        
        if (moveRecordError) {
          console.error('❌ Failed to move record to target table:', moveRecordError);
          throw moveRecordError;
        }
        console.log('✅ Record table_id updated to target table');
        
        // Now sync masterlist with the target table's values
        console.log('🔄 Syncing masterlist with target table values after move');
        await this.syncMasterlistWithTable(recordId, targetTableId, masterlistTableId, finalTargetValues);
        
        console.log('✅ MOVE COMPLETED: Record moved to target table and masterlist synced');
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
    newValues?: Record<string, unknown>,
    fullRecordValues?: Record<string, unknown> // Optional: full record values for condition checking
  ): Promise<void> {
    console.log('🔍 CHECKING AUTOMATIONS: Table:', tableId, 'Record:', recordId, 'Changed Values:', newValues, 'Full Values:', fullRecordValues);
    
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
    console.log('📋 ALL AUTOMATIONS DETAILS:', allAutomations.map(a => ({
      name: a.name,
      enabled: a.enabled,
      triggerType: a.trigger?.type,
      triggerFieldName: a.trigger?.field_name,
      triggerFieldId: a.trigger?.field_id,
      triggerTableName: a.trigger?.table_name,
      condition: a.trigger?.condition,
      actionType: a.action?.type,
      targetTable: a.action?.target_table_name
    })));

    // Get list of changed field IDs (if newValues provided)
    const changedFieldIds = newValues ? Object.keys(newValues) : [];
    console.log('🔍 Changed field IDs:', changedFieldIds);

    // If we have changed fields, get their names for matching
    const changedFieldNames = new Set<string>();
    if (changedFieldIds.length > 0) {
      const { data: changedFields } = await supabase
        .from("fields")
        .select("id, name")
        .in("id", changedFieldIds);
      
      if (changedFields) {
        for (const field of changedFields) {
          changedFieldNames.add(field.name);
        }
      }
      console.log('🔍 Changed field names:', Array.from(changedFieldNames));
    }

    // Filter automations that apply to this table/record AND trigger field
    console.log('\n🔍 FILTERING AUTOMATIONS:');
    console.log('📊 Filter criteria:', {
      currentTableName: tableName,
      changedFieldIds,
      changedFieldNames: Array.from(changedFieldNames)
    });
    
    const applicableAutomations = allAutomations.filter(automation => {
      console.log(`\n🔎 Evaluating automation: "${automation.name}"`);
      console.log('   Trigger config:', {
        type: automation.trigger?.type,
        field_id: automation.trigger?.field_id,
        field_name: automation.trigger?.field_name,
        table_name: automation.trigger?.table_name,
        condition: automation.trigger?.condition
      });
      
      // Skip disabled automations
      if (!automation.enabled) {
        console.log(`   ❌ SKIPPED: "${automation.name}" - disabled`);
        return false;
      }
      
      // If trigger specifies a table_name (non-empty, non-null), it must match
      const triggerTableName = automation.trigger?.table_name;
      if (triggerTableName && triggerTableName.trim() !== '' && triggerTableName !== tableName) {
        console.log(`   ❌ SKIPPED: "${automation.name}" - table name mismatch (${triggerTableName} !== ${tableName})`);
        return false;
      }

      // For field_change triggers, check if the trigger field matches a changed field
      if (automation.trigger?.type === 'field_change' && changedFieldIds.length > 0) {
        const triggerFieldId = automation.trigger?.field_id;
        const triggerFieldName = automation.trigger?.field_name;
        
        // Check if trigger field ID matches a changed field ID
        const fieldIdMatches = triggerFieldId && changedFieldIds.includes(triggerFieldId);
        
        // Check if trigger field name matches a changed field name (normalize for comparison)
        const normalizedTriggerFieldName = triggerFieldName?.trim().toLowerCase();
        const normalizedChangedFieldNames = new Set(Array.from(changedFieldNames).map(n => n.trim().toLowerCase()));
        const fieldNameMatches = triggerFieldName && normalizedTriggerFieldName && normalizedChangedFieldNames.has(normalizedTriggerFieldName);
        
        console.log('   Field matching check:', {
          triggerFieldId,
          triggerFieldName,
          normalizedTriggerFieldName,
          fieldIdMatches,
          fieldNameMatches,
          changedFieldIds,
          changedFieldNames: Array.from(changedFieldNames)
        });
        
        if (!fieldIdMatches && !fieldNameMatches) {
          console.log(`   ❌ SKIPPED: "${automation.name}" - trigger field not changed`);
        return false;
      }
        
        console.log(`   ✅ PASSED: "${automation.name}" - trigger field matches changed field`);
      } else {
        console.log(`   ✅ PASSED: "${automation.name}" - not a field_change trigger or no changed fields`);
      }
      
      return true;
    });

    console.log('📋 APPLICABLE AUTOMATIONS:', applicableAutomations.length, 'automations');
    console.log('📋 Automation details:', applicableAutomations.map(a => ({ 
      id: a.id, 
      name: a.name, 
      enabled: a.enabled,
      triggerField: a.trigger?.field_name || a.trigger?.field_id,
      triggerCondition: a.trigger?.condition,
      action: a.action
    })));
    console.log('📋 Automation order (will be checked in this order):', applicableAutomations.map(a => a.name));

    if (applicableAutomations.length === 0) {
      console.log('⚠️ NO APPLICABLE AUTOMATIONS: No automations found for this table/record');
      return;
    }

    // Track if any forward automation moved the record (to prevent immediate reverse)
    let recordWasMoved = false;
    let newTableId = tableId;

    // Execute each automation (forward direction)
    console.log('🔄 STARTING AUTOMATION CHECKS - Total automations to check:', applicableAutomations.length);
    for (let i = 0; i < applicableAutomations.length; i++) {
      const automation = applicableAutomations[i];
      try {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`⚡ CHECKING AUTOMATION ${i + 1}/${applicableAutomations.length}: "${automation.name}"`);
        console.log(`${'='.repeat(80)}`);
        console.log('🔍 Automation details:', {
          id: automation.id,
          name: automation.name,
          enabled: automation.enabled,
          trigger: automation.trigger,
          action: automation.action,
          triggerField: automation.trigger?.field_name || automation.trigger?.field_id,
          condition: automation.trigger?.condition,
          expectedConditionValue: automation.trigger?.condition?.value
        });
        
        // Get record's current table before execution
        const { data: recordBefore } = await supabase
          .from("records")
          .select("table_id")
          .eq("id", recordId)
          .single();
        
        const tableBefore = recordBefore?.table_id;
        
        // Use fullRecordValues if provided, otherwise use newValues (which may be partial)
        const valuesForExecution = fullRecordValues || newValues;
        await this.executeAutomation(automation, recordId, valuesForExecution, baseId, tableId);
        
        // Check if record was moved
        const { data: recordAfter } = await supabase
          .from("records")
          .select("table_id")
          .eq("id", recordId)
          .single();
        
        const tableAfter = recordAfter?.table_id;
        if (tableBefore !== tableAfter) {
          recordWasMoved = true;
          newTableId = tableAfter || tableId;
          console.log(`📦 RECORD MOVED: ${tableBefore} -> ${tableAfter} by automation: ${automation.name}`);
        }
        
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

    // After forward automations, check for reverse automations (undo moves when condition is no longer met)
    // Only check if record was NOT moved by a forward automation (to prevent immediate reversal)
    // Also only check automations that have "move_to_table" action and the record is in their target table
    if (!recordWasMoved) {
      console.log('🔄 Checking for reverse automations (undo moves)...');
      // Get current table name (in case it changed)
      const { data: currentTable } = await supabase
        .from("tables")
        .select("name")
        .eq("id", newTableId)
        .single();
      
      const currentTableName = currentTable?.name || tableName;
      
      for (const automation of allAutomations) {
        if (!automation.enabled || automation.action.type !== 'move_to_table') {
          continue;
        }
        
        // Check if this automation's target table matches the current table
        if (automation.action.target_table_name === currentTableName) {
          console.log(`🔍 Found potential reverse automation: ${automation.name} (target: ${automation.action.target_table_name})`);
          
          // Check if trigger condition is NOT met (meaning we should reverse)
          const shouldReverse = await this.shouldReverseAutomation(automation, recordId, newValues, baseId, newTableId);
          
          if (shouldReverse) {
            console.log(`↩️ REVERSING AUTOMATION: ${automation.name} - condition no longer met, moving record back`);
            try {
              await this.reverseMoveAutomation(automation, recordId, baseId, newTableId);
              console.log(`✅ REVERSE COMPLETED: ${automation.name}`);
            } catch (error) {
              console.error(`❌ REVERSE ERROR: ${automation.name}:`, error);
              // Continue with other automations
            }
          } else {
            console.log(`✓ Condition still met for ${automation.name}, no reverse needed`);
          }
        }
      }
    } else {
      console.log('⏭️ Skipping reverse automation check - record was moved by forward automation');
    }
  }

  // Check if an automation should be reversed (condition no longer met)
  private static async shouldReverseAutomation(
    automation: Automation,
    recordId: string,
    newValues: Record<string, unknown> | undefined,
    baseId: string,
    currentTableId: string
  ): Promise<boolean> {
    const trigger = automation.trigger;
    
    // Only reverse field_change triggers with conditions
    if (trigger.type !== 'field_change' || !trigger.condition) {
      return false;
    }
    
    // Get current record values
    const { data: record, error: fetchError } = await supabase
      .from("records")
      .select("values, table_id")
      .eq("id", recordId)
      .single();

    if (fetchError) {
      return false;
    }

    // Merge newValues with record values
    const currentRecordValues = newValues ? { ...record.values, ...newValues } : record.values;

    // Get masterlist table
    const { data: masterlistTable } = await supabase
      .from("tables")
      .select("id")
      .eq("base_id", baseId)
      .eq("is_master_list", true)
      .single();

    const masterlistTableId = masterlistTable?.id;

    // Find the field to check
    const triggerFieldName = trigger.field_name;
    const triggerFieldId = trigger.field_id;
    
    if (!triggerFieldName && !triggerFieldId) {
      return false;
    }

    // Determine which table to check the field in
    const tableToCheck = (record.table_id === masterlistTableId && currentTableId !== masterlistTableId)
      ? currentTableId
      : record.table_id;

    // Find the field with robust fallback logic (same as executeAutomation)
    let fieldIdToCheck: string | undefined;
    let currentValue: unknown;

    if (triggerFieldName) {
      const { data: matchingFields } = await supabase
        .from("fields")
        .select("id")
        .eq("table_id", tableToCheck)
        .eq("name", triggerFieldName)
        .limit(1);

      if (matchingFields && matchingFields.length > 0) {
        fieldIdToCheck = matchingFields[0].id;
        if (fieldIdToCheck) {
          currentValue = currentRecordValues[fieldIdToCheck];
        }
        
        // If value is null/undefined and record is in masterlist, try masterlist field ID
        if ((currentValue === null || currentValue === undefined) && record.table_id === masterlistTableId) {
          const { data: masterlistFields } = await supabase
            .from("fields")
            .select("id")
            .eq("table_id", masterlistTableId)
            .eq("name", triggerFieldName)
            .limit(1);
          
          if (masterlistFields && masterlistFields.length > 0) {
            const masterlistFieldId = masterlistFields[0].id;
            const masterlistValue = currentRecordValues?.[masterlistFieldId];
            if (masterlistValue !== null && masterlistValue !== undefined) {
              fieldIdToCheck = masterlistFieldId;
              currentValue = masterlistValue;
            }
          }
        }
        
        // If still null/undefined, try to find any field with the same name that exists in record values
        // Include empty string values - they're valid and should be checked
        if ((currentValue === null || currentValue === undefined) && currentRecordValues) {
          const { data: allFieldsWithName } = await supabase
            .from("fields")
            .select("id, table_id")
            .eq("name", triggerFieldName);
          
          if (allFieldsWithName) {
            // Try each field ID to see if it exists in record values (including empty string)
            for (const field of allFieldsWithName) {
              if (field.id in currentRecordValues) {
                const value = currentRecordValues[field.id];
                // Accept any value including null, undefined, or empty string
                fieldIdToCheck = field.id;
                currentValue = value; // This could be null, undefined, or ''
                break;
              }
            }
          }
        }
      }
    } else if (triggerFieldId) {
      fieldIdToCheck = triggerFieldId;
      currentValue = currentRecordValues[triggerFieldId];
      
      // If value not found, try to find by field name
      if (currentValue === undefined || currentValue === null) {
        const { data: triggerField } = await supabase
          .from("fields")
          .select("id, name, table_id")
          .eq("id", triggerFieldId)
          .single();

        if (triggerField) {
          const needsLookup = triggerField.table_id !== tableToCheck;
          
          if (needsLookup) {
            const { data: matchingFields } = await supabase
              .from("fields")
              .select("id")
              .eq("table_id", tableToCheck)
              .eq("name", triggerField.name)
              .limit(1);
            
            if (matchingFields && matchingFields.length > 0) {
              fieldIdToCheck = matchingFields[0].id;
              if (fieldIdToCheck && currentRecordValues) {
                currentValue = currentRecordValues[fieldIdToCheck];
              }
            }
          }
        }
      }
    }

    if (!fieldIdToCheck) {
      console.log('⚠️ REVERSE CHECK: Could not find field, skipping reverse:', {
        fieldName: triggerFieldName,
        fieldId: triggerFieldId,
        tableToCheck,
        recordTableId: record.table_id
      });
      return false;
    }
    
    // Allow empty/null values to be checked - if value is empty and condition requires a specific value,
    // then condition is NOT met and we should reverse
    // Only skip if we truly couldn't find the field ID
    if (currentValue === undefined) {
      // Field exists but value is undefined - treat as empty and check condition
      currentValue = null;
      console.log('⚠️ REVERSE CHECK: Field value is undefined, treating as empty/null for condition check');
    }

    // Check if condition is NOT met (should reverse)
    const triggerValue = trigger.condition.value;
    let conditionMet = false;
    let currentValueToCheck = currentValue;
    let normalizedCurrentValue = '';
    const normalizedTriggerValue = String(triggerValue || '');

    // Handle single_select fields
    if (fieldIdToCheck) {
      const { data: field } = await supabase
        .from("fields")
        .select("type, options")
        .eq("id", fieldIdToCheck)
        .single();

      // Handle empty/null values - convert to empty string for comparison
      if (currentValue === null || currentValue === undefined || currentValue === '') {
        currentValueToCheck = '';
      } else if (field && field.type === 'single_select' && field.options) {
        const options = field.options as Record<string, { name?: string; label?: string; color: string }>;
        if (String(currentValue).startsWith('option_')) {
          const optionData = options[String(currentValue)];
          if (optionData) {
            currentValueToCheck = optionData.name || optionData.label || '';
          } else {
            // Option ID not found in options, treat as empty
            currentValueToCheck = '';
          }
        }
      }

      // Normalize both values to strings for comparison
      normalizedCurrentValue = String(currentValueToCheck || '');

      switch (trigger.condition.operator) {
        case 'equals':
          conditionMet = normalizedCurrentValue === normalizedTriggerValue;
          break;
        case 'not_equals':
          conditionMet = normalizedCurrentValue !== normalizedTriggerValue;
          break;
        case 'contains':
          conditionMet = normalizedCurrentValue.includes(normalizedTriggerValue);
          break;
        case 'greater_than':
          conditionMet = Number(normalizedCurrentValue) > Number(normalizedTriggerValue);
          break;
        case 'less_than':
          conditionMet = Number(normalizedCurrentValue) < Number(normalizedTriggerValue);
          break;
        case 'greater_than_or_equal':
          conditionMet = Number(normalizedCurrentValue) >= Number(normalizedTriggerValue);
          break;
        case 'less_than_or_equal':
          conditionMet = Number(normalizedCurrentValue) <= Number(normalizedTriggerValue);
          break;
      }
    }

    // Reverse if condition is NOT met
    const shouldReverse = !conditionMet;
    console.log('🔍 REVERSE CHECK RESULT:', {
      automationName: automation.name,
      fieldName: triggerFieldName,
      currentValue: currentValue,
      currentValueToCheck: currentValueToCheck,
      normalizedCurrentValue: normalizedCurrentValue,
      triggerValue: triggerValue,
      normalizedTriggerValue: normalizedTriggerValue,
      operator: trigger.condition.operator,
      conditionMet,
      shouldReverse
    });
    return shouldReverse;
  }

  // Reverse a move automation (move record back to source)
  private static async reverseMoveAutomation(
    automation: Automation,
    recordId: string,
    baseId: string,
    currentTableId: string
  ): Promise<void> {
    console.log(`↩️ REVERSING MOVE: ${automation.name} for record ${recordId}`);
    
    // Get masterlist table
    const { data: masterlistTable } = await supabase
      .from("tables")
      .select("id")
      .eq("base_id", baseId)
      .eq("is_master_list", true)
      .single();

    if (!masterlistTable) {
      throw new Error('Masterlist table not found');
    }

    const masterlistTableId = masterlistTable.id;

    // Determine source table from automation trigger
    // If trigger has table_name, use that; otherwise use masterlist as default
    const triggerTableName = automation.trigger.table_name;
    let sourceTableId: string | undefined;

    if (triggerTableName && triggerTableName.trim() !== '') {
      const { data: sourceTable } = await supabase
        .from("tables")
        .select("id")
        .eq("base_id", baseId)
        .eq("name", triggerTableName)
        .single();
      
      if (sourceTable) {
        sourceTableId = sourceTable.id;
      }
    }

    // Default to masterlist if no specific source table
    if (!sourceTableId) {
      sourceTableId = masterlistTableId;
    }

    // Get current record
    const { data: currentRecord, error: fetchError } = await supabase
      .from("records")
      .select("table_id, values")
      .eq("id", recordId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Only reverse if record is currently in the target table
    const targetTableName = automation.action.target_table_name;
    const { data: targetTable } = await supabase
      .from("tables")
      .select("id, name")
      .eq("base_id", baseId)
      .eq("name", targetTableName)
      .single();

    if (!targetTable || currentRecord.table_id !== targetTable.id) {
      console.log('⚠️ Record is not in target table, skipping reverse');
      return;
    }

    console.log(`↩️ Moving record from ${targetTable.name} back to source table`);

    // Move record back to source table
    const { error: moveError } = await supabase
      .from("records")
      .update({ table_id: sourceTableId })
      .eq("id", recordId)
      .eq("table_id", targetTable.id);

    if (moveError) {
      throw moveError;
    }

    console.log(`✅ Record moved back to source table`);

    // Sync masterlist with current values
    if (sourceTableId && sourceTableId !== masterlistTableId) {
      await this.syncMasterlistWithTable(recordId, sourceTableId, masterlistTableId, currentRecord.values);
    }
  }
}
