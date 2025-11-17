import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { Automation, TableRow, FieldRow, FieldType, AutomationTrigger, AutomationAction } from "@/lib/types/base-detail";
import { BaseDetailService } from "@/lib/services/base-detail-service";

interface CreateAutomationModalProps {
  tables: TableRow[];
  fields: FieldRow[];
  baseId: string; // Changed from activeTableId to baseId for base-level automations
  automation?: Automation;
  onClose: () => void;
  onSave: (automation: Omit<Automation, 'id' | 'created_at'>) => void;
  onFieldCreated?: () => void;
}

export const CreateAutomationModal = ({
  tables,
  fields,
  baseId,
  automation,
  onClose,
  onSave,
  onFieldCreated
}: CreateAutomationModalProps) => {
  const [formData, setFormData] = useState({
    name: automation?.name || '',
    base_id: automation?.base_id || baseId,
    enabled: automation?.enabled ?? true,
    trigger: {
      type: automation?.trigger.type || 'field_change' as const,
      table_name: automation?.trigger.table_name || '', // Optional: if empty, applies to all tables
      field_id: automation?.trigger.field_id || '',
      condition: automation?.trigger.condition || {
        operator: 'equals' as const,
        value: ''
      }
    },
    action: {
      type: automation?.action.type || 'copy_to_table' as const,
      target_table_name: automation?.action.target_table_name || '', // Changed to table_name
      field_mappings: automation?.action.field_mappings || [],
      preserve_original: automation?.action.preserve_original ?? (automation?.action.type === 'move_to_table' ? false : true),
      sync_mode: automation?.action.sync_mode || 'one_way' as const,
      duplicate_handling: automation?.action.duplicate_handling || 'skip' as const
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCreateFieldModal, setShowCreateFieldModal] = useState(false);
  const [createFieldForMapping, setCreateFieldForMapping] = useState<number | null>(null);
  const [newFieldData, setNewFieldData] = useState<{
    name: string;
    type: FieldType;
    order_index: number;
  }>({
    name: '',
    type: 'text',
    order_index: 0
  });
  const [isMappingAllFields, setIsMappingAllFields] = useState(false);

  // Update preserve_original when action type changes
  useEffect(() => {
    if (formData.action.type === 'move_to_table' && formData.action.preserve_original === true) {
      setFormData(prev => ({
        ...prev,
        action: { ...prev.action, preserve_original: false }
      }));
    } else if (formData.action.type === 'copy_to_table' && formData.action.preserve_original === false) {
      setFormData(prev => ({
        ...prev,
        action: { ...prev.action, preserve_original: true }
      }));
    }
  }, [formData.action.type]);

  // Reset trigger field when source table changes
  useEffect(() => {
    if (formData.trigger.table_name && formData.trigger.field_id) {
      // Find table by name
      const sourceTable = tables.find(t => t.name === formData.trigger.table_name);
      if (sourceTable) {
        const sourceFields = fields.filter(f => f.table_id === sourceTable.id);
        const fieldExists = sourceFields.find(f => f.id === formData.trigger.field_id);
        if (!fieldExists) {
          setFormData(prev => ({
            ...prev,
            trigger: { ...prev.trigger, field_id: '' }
          }));
        }
      }
    }
  }, [formData.trigger.table_name, fields, tables]);

  // Get source fields - if table_name is specified, filter by that table; otherwise show all fields
  const sourceTable = formData.trigger.table_name 
    ? tables.find(t => t.name === formData.trigger.table_name)
    : null;
  const sourceFields = sourceTable 
    ? fields.filter(f => f.table_id === sourceTable.id)
    : fields; // Show all fields if no table specified

  // Get target fields - filter by target table name
  const targetTable = formData.action.target_table_name
    ? tables.find(t => t.name === formData.action.target_table_name)
    : null;
  const targetFields = targetTable
    ? fields.filter(f => f.table_id === targetTable.id)
    : [];
  
  // Get the selected field to determine appropriate operators
  const selectedField = sourceFields.find(f => f.id === formData.trigger.field_id);
  const isNumericField = selectedField?.type === 'number';
  const isTextField = selectedField?.type === 'text' || selectedField?.type === 'email';

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Automation name is required';
    }

    // table_name is optional - if empty, applies to all tables
    // No validation needed for source table

    if (!formData.action.target_table_name) {
      newErrors.target_table_name = 'Target table is required';
    }

    if (formData.trigger.type === 'field_change' && !formData.trigger.field_id) {
      newErrors.trigger_field = 'Field is required for field change trigger';
    }

    if (formData.action.field_mappings.length === 0) {
      newErrors.field_mappings = 'At least one field mapping is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const automationData: Omit<Automation, 'id' | 'created_at'> = {
      name: formData.name,
      base_id: formData.base_id,
      enabled: formData.enabled,
      trigger: {
        type: formData.trigger.type,
        table_name: formData.trigger.table_name || undefined, // Optional - if empty, applies to all tables
        field_id: formData.trigger.field_id || undefined,
        condition: formData.trigger.condition.operator && formData.trigger.condition.value 
          ? formData.trigger.condition 
          : undefined
      },
      action: {
        type: formData.action.type,
        target_table_name: formData.action.target_table_name,
        field_mappings: formData.action.field_mappings,
        preserve_original: formData.action.preserve_original,
        sync_mode: formData.action.sync_mode,
        duplicate_handling: formData.action.duplicate_handling
      }
    };

    onSave(automationData);
  };

  const addFieldMapping = () => {
    setFormData(prev => ({
      ...prev,
      action: {
        ...prev.action,
        field_mappings: [
          ...prev.action.field_mappings,
          { source_field_id: '', target_field_id: '' }
        ]
      }
    }));
  };

  const removeFieldMapping = (index: number) => {
    setFormData(prev => ({
      ...prev,
      action: {
        ...prev.action,
        field_mappings: prev.action.field_mappings.filter((_, i) => i !== index)
      }
    }));
  };

  const updateFieldMapping = (index: number, field: 'source_field_id' | 'target_field_id', value: string) => {
    setFormData(prev => ({
      ...prev,
      action: {
        ...prev.action,
        field_mappings: prev.action.field_mappings.map((mapping, i) => 
          i === index ? { ...mapping, [field]: value } : mapping
        )
      }
    }));
  };

  const handleCreateField = async () => {
    if (!formData.action.target_table_name || !newFieldData.name.trim() || !targetTable) {
      return;
    }

    try {
      const newField = await BaseDetailService.createField({
        name: newFieldData.name,
        type: newFieldData.type,
        table_id: targetTable.id,
        order_index: targetFields.length
      });

      // Update the field mapping with the new field ID
      if (createFieldForMapping !== null) {
        updateFieldMapping(createFieldForMapping, 'target_field_id', newField.id);
      }

      // Reset the form
      setNewFieldData({ name: '', type: 'text', order_index: 0 });
      setShowCreateFieldModal(false);
      setCreateFieldForMapping(null);
      
      // Notify parent component to refresh fields
      if (onFieldCreated) {
        onFieldCreated();
      }
    } catch (error) {
      console.error('Error creating field:', error);
      setErrors({ field_creation: 'Failed to create field' });
    }
  };

  const openCreateFieldModal = (mappingIndex: number) => {
    setCreateFieldForMapping(mappingIndex);
    setShowCreateFieldModal(true);
  };

  const mapAllFields = async () => {
    if (!formData.action.target_table_name || !targetTable) {
      return;
    }

    setIsMappingAllFields(true);
    setErrors({});

    try {
      const newMappings: { source_field_id: string; target_field_id: string }[] = [];
      const fieldsToCreate: { name: string; type: FieldType; order_index: number }[] = [];

      // Get all source fields (from specified table or all fields if no table specified)
      const allSourceFields = sourceFields;
      
      for (const sourceField of allSourceFields) {
        // Check if a target field with the same name already exists
        const targetField = targetFields.find(f => f.name === sourceField.name);
        
        if (!targetField) {
          // Create a new field in the target table
          fieldsToCreate.push({
            name: sourceField.name,
            type: sourceField.type,
            order_index: targetFields.length + fieldsToCreate.length
          });
        }
      }

      // Create all new fields
      const createdFields: FieldRow[] = [];
      for (const fieldData of fieldsToCreate) {
        try {
          const newField = await BaseDetailService.createField({
            name: fieldData.name,
            type: fieldData.type,
            table_id: targetTable.id,
            order_index: fieldData.order_index
          });
          createdFields.push(newField);
        } catch (error) {
          console.error('Error creating field:', error);
          setErrors({ field_creation: 'Failed to create some fields' });
          setIsMappingAllFields(false);
          return;
        }
      }

      // Refresh target fields to include newly created ones
      if (onFieldCreated) {
        onFieldCreated();
      }

      // Create mappings for all source fields
      for (const sourceField of allSourceFields) {
        // Find the corresponding target field (existing or newly created)
        const targetField = targetFields.find(f => f.name === sourceField.name) || 
                         createdFields.find(f => f.name === sourceField.name);
        
        if (targetField) {
          newMappings.push({
            source_field_id: sourceField.id,
            target_field_id: targetField.id
          });
        }
      }

      // Update the form with all mappings
      setFormData(prev => ({
        ...prev,
        action: {
          ...prev.action,
          field_mappings: newMappings
        }
      }));

      // Clear any previous errors
      setErrors({});
    } catch (error) {
      console.error('Error mapping all fields:', error);
      setErrors({ field_mapping: 'Failed to map all fields' });
    } finally {
      setIsMappingAllFields(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-gray-500/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {automation ? 'Edit Automation' : 'Create Automation'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Automation Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter automation name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Table (Optional)
              </label>
              <select
                value={formData.trigger.table_name || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  trigger: { ...prev.trigger, table_name: e.target.value }
                }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.table_name ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">All tables in base (default)</option>
                {tables.map(table => (
                  <option key={table.id} value={table.name}>{table.name}</option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to apply automation to all tables, or select a specific table
              </p>
              {errors.table_name && <p className="text-red-500 text-sm mt-1">{errors.table_name}</p>}
            </div>
          </div>

          {/* Trigger Configuration */}
          <div className="space-y-4">
            <div>
              <h4 className="text-md font-medium text-gray-900">Trigger Configuration</h4>
              <p className="text-sm text-gray-600 mt-1">
                Set up when this automation should run. For status fields, you can use numeric comparisons to trigger based on values.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trigger Type
                </label>
                <select
                  value={formData.trigger.type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    trigger: { ...prev.trigger, type: e.target.value as AutomationTrigger['type'] }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="field_change">Field Change</option>
                  <option value="record_created">Record Created</option>
                  <option value="record_updated">Record Updated</option>
                </select>
              </div>

              {formData.trigger.type === 'field_change' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field *
                    </label>
                    <select
                      value={formData.trigger.field_id}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        trigger: { ...prev.trigger, field_id: e.target.value }
                      }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.trigger_field ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select field</option>
                      {sourceFields.length === 0 ? (
                        <option value="" disabled>No fields available{formData.trigger.table_name ? ' for selected table' : ''}</option>
                      ) : (
                        sourceFields.map(field => {
                          const fieldTable = tables.find(t => t.id === field.table_id);
                          return (
                            <option key={field.id} value={field.id}>
                              {field.name}{fieldTable ? ` (${fieldTable.name})` : ''}
                            </option>
                          );
                        })
                      )}
                    </select>
                    {errors.trigger_field && <p className="text-red-500 text-sm mt-1">{errors.trigger_field}</p>}
                    {sourceFields.length === 0 && formData.trigger.table_name && (
                      <p className="text-yellow-600 text-sm mt-1">No fields found for the selected table</p>
                    )}
                  </div>

                  {/* Condition Configuration */}
                  {formData.trigger.field_id && (
                    <div className="col-span-2 space-y-3">
                      <h5 className="text-sm font-medium text-gray-700">Trigger Condition</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Operator
                          </label>
                          <select
                            value={formData.trigger.condition.operator}
                            onChange={(e) => setFormData(prev => {
                              const currentCondition = prev.trigger.condition ?? { operator: 'equals' as const, value: '' };
                              return {
                                ...prev, 
                                trigger: { 
                                  ...prev.trigger, 
                                  condition: { 
                                    ...currentCondition, 
                                    operator: e.target.value as NonNullable<AutomationTrigger['condition']>['operator']
                                  }
                                }
                              };
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="equals">Equals</option>
                            <option value="not_equals">Not Equals</option>
                            {isTextField && <option value="contains">Contains</option>}
                            {isNumericField && (
                              <>
                                <option value="greater_than">Greater Than</option>
                                <option value="less_than">Less Than</option>
                                <option value="greater_than_or_equal">Greater Than or Equal</option>
                                <option value="less_than_or_equal">Less Than or Equal</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Value
                          </label>
                          <input
                            type={isNumericField ? "number" : "text"}
                            value={formData.trigger.condition.value}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              trigger: { 
                                ...prev.trigger, 
                                condition: { 
                                  ...prev.trigger.condition, 
                                  value: isNumericField ? parseFloat(e.target.value) || 0 : e.target.value 
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={isNumericField ? "Enter numeric value (e.g., 5)" : "Enter trigger value (e.g., 'buyer')"}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action Configuration */}
          <div className="space-y-4">
            <div>
              <h4 className="text-md font-medium text-gray-900">Action Configuration</h4>
              <p className="text-sm text-gray-600 mt-1">
                Define what happens when the trigger condition is met. You can copy or move data between tables with field mappings.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Type
                </label>
                <select
                  value={formData.action.type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    action: { ...prev.action, type: e.target.value as AutomationAction['type'] }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="copy_to_table">Copy to Table (creates new record)</option>
                  <option value="move_to_table">Move to Table (moves record)</option>
                  <option value="sync_to_table">Sync to Table (updates existing or creates new)</option>
                  <option value="copy_fields">Copy Fields (copies field values only)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Table *
                </label>
                <select
                  value={formData.action.target_table_name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    action: { ...prev.action, target_table_name: e.target.value }
                  }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.target_table_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select target table</option>
                  {tables.map(table => (
                    <option key={table.id} value={table.name}>{table.name}</option>
                  ))}
                </select>
                {errors.target_table_name && <p className="text-red-500 text-sm mt-1">{errors.target_table_name}</p>}
              </div>
            </div>

            {/* Preserve Original Setting */}
            {formData.action.type === 'move_to_table' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-blue-900 mb-1">Move Operation</h5>
                    <p className="text-sm text-blue-700 mb-3">
                      This automation will move records from the source table to the target table. 
                      The original record will be removed from the source table.
                    </p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.action.preserve_original}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          action: { ...prev.action, preserve_original: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-blue-700">
                        Keep original record in source table (not recommended for move operations)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Field Mappings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Field Mappings *
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    Map fields from source to target table. You can create new fields in the target table if needed.
                  </p>
                </div>
                <div className="flex gap-2">
                  {formData.action.target_table_name && (
                    <button
                      type="button"
                      onClick={mapAllFields}
                      disabled={isMappingAllFields}
                      className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg transition-colors border ${
                        isMappingAllFields 
                          ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed' 
                          : 'text-green-600 hover:bg-green-50 border-green-200'
                      }`}
                    >
                      {isMappingAllFields ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          Mapping...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Map All Fields
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={addFieldMapping}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Mapping
                  </button>
                </div>
              </div>

              {formData.action.field_mappings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No field mappings yet</p>
                  <p className="text-sm">
                    {formData.action.target_table_name 
                      ? 'Click "Map All Fields" to automatically map all source fields, or "Add Mapping" for manual mapping'
                      : 'Select target table, then click "Map All Fields" or "Add Mapping" to start mapping fields'
                    }
                  </p>
                </div>
              )}

              {formData.action.field_mappings.map((mapping, index) => {
                const selectedSourceField = sourceFields.find(f => f.id === mapping.source_field_id);
                const selectedTargetField = targetFields.find(f => f.id === mapping.target_field_id);
                
                return (
                <div key={index} className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Source Field {selectedSourceField && `(${selectedSourceField.name})`}
                    </label>
                    <select
                      value={mapping.source_field_id}
                      onChange={(e) => updateFieldMapping(index, 'source_field_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select source field</option>
                      {sourceFields.map(field => {
                        const fieldTable = tables.find(t => t.id === field.table_id);
                        return (
                          <option key={field.id} value={field.id}>
                            {field.name}{fieldTable ? ` (${fieldTable.name})` : ''}
                          </option>
                        );
                      })}
                      {mapping.source_field_id && (
                        <option value="" style={{ color: '#ef4444' }}>✕ None (clear selection)</option>
                      )}
                    </select>
                  </div>
                  <span className="text-gray-500">→</span>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Target Field {selectedTargetField && `(${selectedTargetField.name})`}
                    </label>
                    <select
                      value={mapping.target_field_id}
                      onChange={(e) => {
                        if (e.target.value === '__create_field__') {
                          openCreateFieldModal(index);
                        } else {
                          updateFieldMapping(index, 'target_field_id', e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select target field</option>
                      {targetFields.map(field => (
                        <option key={field.id} value={field.id}>{field.name}</option>
                      ))}
                      <option value="__create_field__">+ Create new field</option>
                      {mapping.target_field_id && (
                        <option value="" style={{ color: '#ef4444' }}>✕ None (clear selection)</option>
                      )}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFieldMapping(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                );
              })}

              {errors.field_mappings && <p className="text-red-500 text-sm mt-1">{errors.field_mappings}</p>}
              {errors.field_mapping && <p className="text-red-500 text-sm mt-1">{errors.field_mapping}</p>}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {automation ? 'Update Automation' : 'Create Automation'}
            </button>
          </div>
        </form>
      </div>

      {/* Create Field Modal */}
      {showCreateFieldModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-500/20 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Create New Field
                </h3>
                <button
                  onClick={() => setShowCreateFieldModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Name *
                </label>
                <input
                  type="text"
                  value={newFieldData.name}
                  onChange={(e) => setNewFieldData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter field name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Type *
                </label>
                <select
                  value={newFieldData.type}
                  onChange={(e) => setNewFieldData(prev => ({ ...prev, type: e.target.value as FieldType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="datetime">Date Time</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="single_select">Single Select</option>
                  <option value="multi_select">Multi Select</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="link">Link</option>
                </select>
              </div>

              {errors.field_creation && (
                <p className="text-red-500 text-sm">{errors.field_creation}</p>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateFieldModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateField}
                  disabled={!newFieldData.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
