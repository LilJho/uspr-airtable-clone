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
    const { data, error } = await supabase
      .from("records")
      .insert({ table_id: tableId, values })
      .select("id, table_id, values, created_at")
      .single();

    if (error) throw error;
    
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

    console.log(`✅ CELL SAVED: Cell update successful, now checking automations...`);

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

    // Get existing fields and their types
    const fields = await this.getFields(tableId);
    const fieldTypeMap = new Map(fields.map(f => [f.id, f.type]));
    
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
    
    // Create all new fields
    console.log('🔧 CREATING FIELDS:', fieldsToCreate.size, 'fields to create');
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
    
    console.log('🔧 FIELD CREATION SUMMARY:');
    console.log('📊 Total fields after creation:', fields.length);
    console.log('📊 Created field IDs map:', Object.fromEntries(createdFieldIds));
    console.log('📊 Field type map:', Object.fromEntries(fieldTypeMap));

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
                    const optionEntry = Object.entries(field.options).find(([, optionData]) => {
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
  static async executeAutomation(automation: Automation, recordId: string): Promise<void> {
    console.log('🎯 EXECUTING AUTOMATION:', automation.name, 'enabled:', automation.enabled, 'recordId:', recordId);
    
    if (!automation.enabled) {
      console.log('⏸️ Automation disabled, skipping');
      return;
    }

    // Check if record still exists (might have been deleted by another automation)
    const { error: recordCheckError } = await supabase
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
    
    if (!automation.action.target_table_id) {
      throw new Error(`Automation ${automation.name} has no target table configured`);
    }
    
    if (!automation.action.field_mappings || automation.action.field_mappings.length === 0) {
      throw new Error(`Automation ${automation.name} has no field mappings configured`);
    }

    const { trigger, action } = automation;
    console.log('🔧 Trigger config:', trigger);
    console.log('🎬 Action config:', action);

    // Check if trigger condition is met
    if (trigger.type === 'field_change' && trigger.field_id && trigger.condition) {
      console.log('🔍 Checking field change trigger for field:', trigger.field_id);
      
      // Get current record values
      const { data: record, error: fetchError } = await supabase
        .from("records")
        .select("values")
        .eq("id", recordId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.log('⚠️ RECORD DELETED DURING TRIGGER CHECK: Record no longer exists, skipping automation:', automation.name);
          return;
        }
        throw fetchError;
      }

      const currentValue = record.values[trigger.field_id];
      const triggerValue = trigger.condition.value;
      
      console.log('📊 Current value:', currentValue, 'Trigger value:', triggerValue, 'Operator:', trigger.condition.operator);

      // Check condition - handle option IDs for single_select fields
      let conditionMet = false;
      
      // For single_select fields, we need to check if the current value is an option ID
      // and if the trigger value matches the display text
      let currentValueToCheck = currentValue;
      const triggerValueToCheck = triggerValue;
      
      // If current value looks like an option ID (starts with 'option_'), we need to resolve it
      if (String(currentValue).startsWith('option_')) {
        console.log('🔍 OPTION ID DETECTED: Current value is an option ID, need to resolve display text');
        
        // Get the field to check if it's a single_select and get the options
        const { data: field, error: fieldError } = await supabase
          .from("fields")
          .select("type, options")
          .eq("id", trigger.field_id)
          .single();

        console.log("🔍 FIELD DATA:", JSON.stringify(field, null, 2));
        console.log("🔍 Option Key:", currentValue);
          
        if (!fieldError && field && field.type === 'single_select' && field.options) {
          const options = field.options as Record<string, { name: string; color: string }>;
          const optionKey = String(currentValue);
          
          console.log("🔍 ALL OPTIONS:", JSON.stringify(options, null, 2));
          console.log("🔍 Looking for option key:", optionKey);
          console.log("🔍 Option exists:", optionKey in options);
          
          if (options[optionKey]) {
            const optionData = options[optionKey];
            console.log("🔍 OPTION DATA:", JSON.stringify(optionData, null, 2));
            
            if (optionData && optionData.name) {
              currentValueToCheck = optionData.name;
              console.log('✅ RESOLVED OPTION: Option ID', currentValue, 'resolves to display text:', currentValueToCheck);
            } else {
              console.log('⚠️ OPTION HAS NO NAME:', optionKey, optionData);
            }
          } else {
            console.log('⚠️ OPTION KEY NOT FOUND in options:', optionKey);
            console.log('⚠️ Available keys:', Object.keys(options));
          }
        } else {
          console.log('⚠️ FIELD RESOLUTION FAILED:', {
            hasError: !!fieldError,
            hasField: !!field,
            fieldType: field?.type,
            hasOptions: !!field?.options
          });
        }
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
          console.log('📋 COPYING TO TABLE:', action.target_table_id);
          await this.executeCopyToTable(recordId, action);
          console.log('✅ Copy to table completed');
          break;
        case 'move_to_table':
          console.log('🔄 MOVING TO TABLE:', action.target_table_id);
          await this.executeMoveToTable(recordId, action);
          console.log('✅ Move to table completed');
          break;
        case 'sync_to_table':
          console.log('🔄 Syncing to table:', action.target_table_id);
          await this.executeSyncToTable(recordId, action);
          console.log('✅ Sync to table completed');
          break;
        case 'show_in_table':
          console.log('👁️ Showing in table:', action.target_table_id);
          await this.executeShowInTable(recordId, action);
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

  private static async executeCopyToTable(recordId: string, action: AutomationAction): Promise<void> {
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
        .eq("table_id", action.target_table_id);

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

    // Create record in target table
    console.log('💾 Creating record in target table:', action.target_table_id);
    const newRecord = await this.createRecord(action.target_table_id, targetValues);
    console.log('✅ AUTOMATION SUCCESS: Record created successfully in target table:', newRecord.id);
  }

  private static async executeMoveToTable(recordId: string, action: AutomationAction): Promise<void> {
    console.log('🔄 MOVING RECORD: Moving record', recordId, 'to table', action.target_table_id);
    console.log('🔍 Action type:', action.type);
    console.log('🔍 Preserve original setting:', action.preserve_original);
    console.log('🔍 Action details:', JSON.stringify(action, null, 2));
    
    // First copy to target table
    await this.executeCopyToTable(recordId, action);

    // For move operations, we should delete from source table by default
    // unless explicitly set to preserve the original
    // The key fix: for move_to_table, we delete the original UNLESS preserve_original is explicitly true
    const shouldDeleteOriginal = action.preserve_original !== true;
    
    console.log('🔍 Should delete original:', shouldDeleteOriginal);
    console.log('🔍 Preserve original flag:', action.preserve_original);
    
    if (shouldDeleteOriginal) {
      console.log('🗑️ DELETING ORIGINAL: Removing record from source table as part of move operation');
      try {
        await this.deleteRecord(recordId);
        console.log('✅ MOVE COMPLETED: Record successfully moved to target table and removed from source');
        
        // Verify the record was actually deleted
        const { data: deletedRecord, error: verifyError } = await supabase
          .from("records")
          .select("id")
          .eq("id", recordId)
          .single();
          
        if (verifyError && verifyError.code === 'PGRST116') {
          console.log('✅ VERIFICATION SUCCESS: Record confirmed deleted from source table');
        } else if (deletedRecord) {
          console.log('⚠️ VERIFICATION WARNING: Record still exists in source table after delete attempt');
        }
      } catch (deleteError) {
        // Check if the record was already deleted by another automation
        if (deleteError instanceof Error && deleteError.message.includes('PGRST116')) {
          console.log('⚠️ RECORD ALREADY DELETED: Record was already removed by another automation');
          return;
        }
        console.error('❌ DELETE FAILED: Error deleting record from source table:', deleteError);
        throw deleteError;
      }
    } else {
      console.log('📋 PRESERVING ORIGINAL: Keeping record in source table (preserve_original=true)');
      console.log('⚠️ WARNING: This is a MOVE operation but preserve_original=true, so record will remain in source table');
    }
  }

  private static async executeSyncToTable(recordId: string, action: AutomationAction): Promise<void> {
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
        .eq("table_id", action.target_table_id);

      if (existingError) throw existingError;

      const existingRecord = existingRecords?.find(record => 
        record.values && record.values[firstMapping.target_field_id] === targetFieldValue
      );

      if (existingRecord) {
        // Update existing record
        await this.updateRecord(existingRecord.id, targetValues);
      } else {
        // Create new record
        await this.createRecord(action.target_table_id, targetValues);
      }
    } else {
      // No field mappings, just create new record
      await this.createRecord(action.target_table_id, targetValues);
    }
  }

  private static async executeShowInTable(recordId: string, action: AutomationAction): Promise<void> {
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

    await this.createRecord(action.target_table_id, targetValues);
  }

  // Check and execute automations for a record update
  static async checkAndExecuteAutomations(
    tableId: string, 
    recordId: string, 
    newValues?: Record<string, unknown>
  ): Promise<void> {
    console.log('🔍 CHECKING AUTOMATIONS: Table:', tableId, 'Record:', recordId, 'Values:', newValues);
    
    // Get all automations for this table
    const automations = await this.getAutomations(tableId);
    console.log('📋 AUTOMATIONS FOUND:', automations.length, 'automations');
    console.log('📋 Automation details:', automations.map(a => ({ 
      id: a.id, 
      name: a.name, 
      enabled: a.enabled,
      trigger: a.trigger,
      action: a.action
    })));

    if (automations.length === 0) {
      console.log('⚠️ NO AUTOMATIONS: No automations found for this table');
      return;
    }

    // Execute each automation
    for (const automation of automations) {
      try {
        console.log('⚡ EXECUTING AUTOMATION:', automation.name, 'for record:', recordId);
        console.log('🔍 Automation details:', {
          id: automation.id,
          name: automation.name,
          enabled: automation.enabled,
          trigger: automation.trigger,
          action: automation.action
        });
        await this.executeAutomation(automation, recordId);
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
