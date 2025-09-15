import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { Automation, TableRow, FieldRow } from "@/lib/types/base-detail";

interface CreateAutomationModalProps {
  tables: TableRow[];
  fields: FieldRow[];
  automation?: Automation;
  onClose: () => void;
  onSave: (automation: Omit<Automation, 'id' | 'created_at'>) => void;
}

export const CreateAutomationModal = ({
  tables,
  fields,
  automation,
  onClose,
  onSave
}: CreateAutomationModalProps) => {
  const [formData, setFormData] = useState({
    name: automation?.name || '',
    table_id: automation?.table_id || '',
    enabled: automation?.enabled ?? true,
    trigger: {
      type: automation?.trigger.type || 'field_change' as const,
      table_id: automation?.trigger.table_id || '',
      field_id: automation?.trigger.field_id || '',
      condition: automation?.trigger.condition || {
        operator: 'equals' as const,
        value: ''
      }
    },
    action: {
      type: automation?.action.type || 'copy_to_table' as const,
      target_table_id: automation?.action.target_table_id || '',
      field_mappings: automation?.action.field_mappings || [],
      preserve_original: automation?.action.preserve_original ?? true,
      sync_mode: automation?.action.sync_mode || 'one_way' as const,
      duplicate_handling: automation?.action.duplicate_handling || 'skip' as const
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const sourceFields = fields.filter(f => f.table_id === formData.table_id);
  const targetFields = fields.filter(f => f.table_id === formData.action.target_table_id);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Automation name is required';
    }

    if (!formData.table_id) {
      newErrors.table_id = 'Source table is required';
    }

    if (!formData.action.target_table_id) {
      newErrors.target_table_id = 'Target table is required';
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
      table_id: formData.table_id,
      enabled: formData.enabled,
      trigger: {
        type: formData.trigger.type,
        table_id: formData.table_id,
        field_id: formData.trigger.field_id || undefined,
        condition: formData.trigger.condition.operator && formData.trigger.condition.value 
          ? formData.trigger.condition 
          : undefined
      },
      action: {
        type: formData.action.type,
        target_table_id: formData.action.target_table_id,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                Source Table *
              </label>
              <select
                value={formData.table_id}
                onChange={(e) => setFormData(prev => ({ ...prev, table_id: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.table_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select source table</option>
                {tables.map(table => (
                  <option key={table.id} value={table.id}>{table.name}</option>
                ))}
              </select>
              {errors.table_id && <p className="text-red-500 text-sm mt-1">{errors.table_id}</p>}
            </div>
          </div>

          {/* Trigger Configuration */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Trigger Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trigger Type
                </label>
                <select
                  value={formData.trigger.type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    trigger: { ...prev.trigger, type: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="field_change">Field Change</option>
                  <option value="record_created">Record Created</option>
                  <option value="record_updated">Record Updated</option>
                </select>
              </div>

              {formData.trigger.type === 'field_change' && (
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
                    {sourceFields.map(field => (
                      <option key={field.id} value={field.id}>{field.name}</option>
                    ))}
                  </select>
                  {errors.trigger_field && <p className="text-red-500 text-sm mt-1">{errors.trigger_field}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Action Configuration */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Action Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Type
                </label>
                <select
                  value={formData.action.type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    action: { ...prev.action, type: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="copy_to_table">Copy to Table</option>
                  <option value="move_to_table">Move to Table</option>
                  <option value="sync_to_table">Sync to Table</option>
                  <option value="copy_fields">Copy Fields</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Table *
                </label>
                <select
                  value={formData.action.target_table_id}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    action: { ...prev.action, target_table_id: e.target.value }
                  }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.target_table_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select target table</option>
                  {tables.map(table => (
                    <option key={table.id} value={table.id}>{table.name}</option>
                  ))}
                </select>
                {errors.target_table_id && <p className="text-red-500 text-sm mt-1">{errors.target_table_id}</p>}
              </div>
            </div>

            {/* Field Mappings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Field Mappings *
                </label>
                <button
                  type="button"
                  onClick={addFieldMapping}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Add Mapping
                </button>
              </div>

              {formData.action.field_mappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <select
                      value={mapping.source_field_id}
                      onChange={(e) => updateFieldMapping(index, 'source_field_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select source field</option>
                      {sourceFields.map(field => (
                        <option key={field.id} value={field.id}>{field.name}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-gray-500">→</span>
                  <div className="flex-1">
                    <select
                      value={mapping.target_field_id}
                      onChange={(e) => updateFieldMapping(index, 'target_field_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select target field</option>
                      {targetFields.map(field => (
                        <option key={field.id} value={field.id}>{field.name}</option>
                      ))}
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
              ))}

              {errors.field_mappings && <p className="text-red-500 text-sm mt-1">{errors.field_mappings}</p>}
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
    </div>
  );
};
