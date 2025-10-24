export type SupabaseUser = {
  id: string;
  email?: string;
};

export type BaseRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type TableRow = {
  id: string;
  base_id: string;
  name: string;
  order_index: number;
  is_master_list: boolean;
};

export type FieldType = 'text' | 'number' | 'date' | 'datetime' | 'email' | 'phone' | 'single_select' | 'multi_select' | 'checkbox' | 'link';

export type FieldRow = {
  id: string;
  table_id: string;
  name: string;
  type: FieldType;
  order_index: number;
  options: Record<string, unknown> | null;
};

export type RecordRow = {
  id: string;
  table_id: string;
  values: Record<string, unknown>;
  created_at: string;
};

export type AutomationTrigger = {
  type: 'field_change' | 'record_created' | 'record_updated';
  table_id: string;
  field_id?: string;
  condition?: {
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal';
    value: string | number;
  };
};

export type AutomationAction = {
  type: 'create_record' | 'update_record' | 'copy_fields' | 'copy_to_table' | 'move_to_table' | 'sync_to_table' | 'show_in_table';
  target_table_id: string;
  field_mappings: Array<{
    source_field_id: string;
    target_field_id: string;
  }>;
  preserve_original?: boolean;
  sync_mode?: 'one_way' | 'two_way';
  duplicate_handling?: 'skip' | 'update' | 'create_new';
  visibility_field_id?: string;
  visibility_value?: string;
};

export type Automation = {
  id: string;
  name: string;
  table_id: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  enabled: boolean;
  created_at: string;
};

export type ViewMode = 'grid' | 'kanban';
export type TopTab = 'data' | 'automations' | 'interfaces' | 'forms';
export type SortDirection = 'asc' | 'desc';

export type Condition = {
  field_id: string;
  operator: 'equals' | 'not_equals' | 'contains';
  value: string;
};

export type CreateTableData = {
  name: string;
  base_id: string;
  order_index: number;
};

export type CreateFieldData = {
  name: string;
  type: FieldType;
  table_id: string;
  order_index: number;
  options?: Record<string, unknown>;
};

export type UpdateCellData = {
  recordId: string;
  fieldId: string;
  value: unknown;
};

export type SavingCell = {
  recordId: string;
  fieldId: string;
} | null;
