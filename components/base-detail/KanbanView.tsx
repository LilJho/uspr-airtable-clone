import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { RecordRow, FieldRow } from "@/lib/types/base-detail";

interface KanbanViewProps {
  records: RecordRow[];
  fields: FieldRow[];
  onUpdateCell: (recordId: string, fieldId: string, value: unknown) => void;
  onDeleteRow: (recordId: string) => void;
  onAddRow: () => void;
  savingCell: {recordId: string; fieldId: string} | null;
  canDeleteRow?: boolean;
}

export const KanbanView = ({ 
  records, 
  fields, 
  onUpdateCell, 
  onDeleteRow, 
  onAddRow, 
  savingCell,
  canDeleteRow = true 
}: KanbanViewProps) => {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedStackFieldId, setSelectedStackFieldId] = useState<string | null>(null);
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get all single_select fields for stacking options
  const singleSelectFields = fields.filter(f => f.type === 'single_select');
  
  // Use selected field or default to first single_select field
  const stackField = selectedStackFieldId 
    ? fields.find(f => f.id === selectedStackFieldId)
    : singleSelectFields[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFieldDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get available options from the stack field
  const stackOptions = useMemo(() => {
    if (!stackField) return [];
    
    const options = stackField.options;
    
    // Handle new format: { optionId: { label: string, color: string } }
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      const hasNewFormat = Object.values(options).some(val => 
        typeof val === 'object' && val !== null && 'label' in val
      );
      
      if (hasNewFormat) {
        return Object.entries(options).map(([key, option]) => {
          const opt = option as { label: string; color?: string };
          return {
            key,
            label: opt.label
          };
        });
      }
    }
    
    // Handle old format: { choices: string[] }
    const choices = (options as { choices?: string[] })?.choices;
    if (Array.isArray(choices)) {
      return choices.map(choice => ({ key: choice, label: choice }));
    }
    
    return [];
  }, [stackField]);
  
  // Group records by the selected stack field
  const groupedRecords = useMemo(() => {
    const groups: Record<string, RecordRow[]> = {};
    
    // Initialize all stack options as empty groups (using labels, not keys)
    stackOptions.forEach(option => {
      groups[option.label] = [];
    });
    
    // Add an "Uncategorized" group for records without a value
    groups['Uncategorized'] = [];
    
    // Group records by their stack field value
    records.forEach(record => {
      const stackValue = stackField ? record.values?.[stackField.id] : null;
      
      // Find matching option - prioritize finding by key (since values are often stored as keys)
      const matchingOption = stackOptions.find(option => 
        option.key === stackValue
      ) || stackOptions.find(option => 
        option.label === stackValue
      );
      
      // Always use the label for the group name, never the key
      const group = matchingOption ? matchingOption.label : 'Uncategorized';
      groups[group].push(record);
    });
    
    // If no stack options are defined, create columns based on actual values found
    if (stackOptions.length === 0) {
      const uniqueValues = new Set<string>();
      records.forEach(record => {
        const stackValue = stackField ? record.values?.[stackField.id] : null;
        if (stackValue && typeof stackValue === 'string') {
          uniqueValues.add(stackValue);
        }
      });
      
      // Create groups for unique values - try to find labels if they exist as options elsewhere
      uniqueValues.forEach(value => {
        // Try to find if this value matches an option key, use label if found
        const matchingOption = stackOptions.find(option => option.key === value);
        const displayName = matchingOption ? matchingOption.label : value;
        if (!groups[displayName]) {
          groups[displayName] = [];
        }
      });
      
      // Re-group records using display names
      records.forEach(record => {
        const stackValue = stackField ? record.values?.[stackField.id] : null;
        if (stackValue && typeof stackValue === 'string') {
          const matchingOption = stackOptions.find(option => option.key === stackValue);
          const displayName = matchingOption ? matchingOption.label : stackValue;
          if (groups[displayName]) {
            groups[displayName].push(record);
          } else {
            groups['Uncategorized'].push(record);
          }
        } else {
          groups['Uncategorized'].push(record);
        }
      });
    }
    
    // Only show "Uncategorized" column if it has records
    if (groups['Uncategorized'].length === 0) {
      delete groups['Uncategorized'];
    }
    
    return groups;
  }, [records, stackField?.id, stackOptions]);

  // Get other fields to display in cards (excluding the stack field)
  const displayFields = fields.filter(f => stackField && f.id !== stackField.id).slice(0, 3); // Show max 3 fields

  if (!stackField) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Kanban View Needs Single Select Field</h3>
          <p className="text-gray-500 mb-4">Add a single select field to organize records in columns</p>
        </div>
      </div>
    );
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, recordId: string) => {
    setDraggedCard(recordId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', recordId);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newValue: string) => {
    e.preventDefault();
    const recordId = e.dataTransfer.getData('text/plain');
    
    if (recordId && draggedCard === recordId) {
      // Find the option key for the label
      const matchingOption = stackOptions.find(option => option.label === newValue);
      const valueToSet = matchingOption ? matchingOption.key : newValue;
      
      // Update the record's stack field
      onUpdateCell(recordId, stackField.id, valueToSet);
    }
    
    setDraggedCard(null);
    setDragOverColumn(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Field Selection Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Group by:</span>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsFieldDropdownOpen(!isFieldDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span>{stackField?.name || 'Select field'}</span>
                <ChevronDown size={16} className={`transition-transform ${isFieldDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isFieldDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {singleSelectFields.map((field) => (
                    <button
                      key={field.id}
                      onClick={() => {
                        setSelectedStackFieldId(field.id);
                        setIsFieldDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                        selectedStackFieldId === field.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {field.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {records.length} records
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 p-6 min-w-max h-full">
          {Object.entries(groupedRecords).map(([value, valueRecords]) => (
            <div key={value} className="flex-shrink-0 w-80">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {/* Value indicator dot */}
                    <div className={`w-3 h-3 rounded-full ${
                      value === 'Uncategorized' ? 'bg-gray-400' :
                      // Generate colors based on value hash for consistent coloring
                      (() => {
                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500'];
                        const hash = value.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                        return colors[Math.abs(hash) % colors.length];
                      })()
                    }`}></div>
                    <h3 className="font-medium text-gray-900">{value}</h3>
                  </div>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {valueRecords.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div 
                className={`min-h-[200px] p-2 rounded-lg border-2 border-dashed transition-colors ${
                  dragOverColumn === value 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onDragOver={(e) => handleDragOver(e, value)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, value)}
              >
                {valueRecords.map((record, index) => (
                  <div
                    key={`${value}-${record.id}-${index}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, record.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg border border-gray-200 p-3 mb-3 cursor-move hover:shadow-md transition-shadow ${
                      draggedCard === record.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Display other fields */}
                    {displayFields.map((field) => {
                      const value = record.values?.[field.id];
                      return (
                        <div key={field.id} className="mb-2 last:mb-0">
                          <div className="text-xs text-gray-500 font-medium mb-1">{field.name}</div>
                          <div className="text-sm text-gray-900">
                            {value ? String(value) : <span className="text-gray-400 italic">Empty</span>}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-100">
                      {canDeleteRow && (
                        <button
                          onClick={() => onDeleteRow(record.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add new record button */}
                <button
                  onClick={onAddRow}
                  className="w-full p-3 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
                >
                  + Add record
                </button>
                
                {/* Quick set value for existing records */}
                {valueRecords.length === 0 && value !== 'Uncategorized' && (
                  <div className="mt-2 p-2 text-xs text-gray-400 text-center">
                    Drag records here to set as &quot;{value}&quot;
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
