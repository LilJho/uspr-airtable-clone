import { useState, useMemo } from "react";
import type { RecordRow, FieldRow } from "@/lib/types/base-detail";

interface KanbanViewProps {
  records: RecordRow[];
  fields: FieldRow[];
  onUpdateCell: (recordId: string, fieldId: string, value: any) => void;
  onDeleteRow: (recordId: string) => void;
  onAddRow: () => void;
  savingCell: {recordId: string; fieldId: string} | null;
}

export const KanbanView = ({ 
  records, 
  fields, 
  onUpdateCell, 
  onDeleteRow, 
  onAddRow, 
  savingCell 
}: KanbanViewProps) => {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Find the first single_select field to use as columns
  const statusField = fields.find(f => f.type === 'single_select');

  // Get available options from the status field
  const statusOptions = useMemo(() => {
    if (!statusField) return [];
    return (statusField.options as { choices?: string[] })?.choices || [];
  }, [statusField]);
  
  // Group records by status
  const groupedRecords = useMemo(() => {
    const groups: Record<string, RecordRow[]> = {};
    
    // Initialize all status options as empty groups
    statusOptions.forEach(option => {
      groups[option] = [];
    });
    
    // Add an "Uncategorized" group for records without a status
    groups['Uncategorized'] = [];
    
    // Group records by their status value
    records.forEach(record => {
      const statusValue = statusField ? record.values?.[statusField.id] : null;
      const group = statusValue && typeof statusValue === 'string' && statusOptions.includes(statusValue) ? statusValue : 'Uncategorized';
      groups[group].push(record);
    });
    
    return groups;
  }, [records, statusField?.id, statusOptions]);

  // Get other fields to display in cards (excluding the status field)
  const displayFields = fields.filter(f => statusField && f.id !== statusField.id).slice(0, 3); // Show max 3 fields

  if (!statusField) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Kanban View Needs Status Field</h3>
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

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const recordId = e.dataTransfer.getData('text/plain');
    
    if (recordId && draggedCard === recordId) {
      // Update the record's status field
      onUpdateCell(recordId, statusField.id, newStatus);
    }
    
    setDraggedCard(null);
    setDragOverColumn(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 p-6 min-w-max h-full">
          {Object.entries(groupedRecords).map(([status, statusRecords]) => (
            <div key={status} className="flex-shrink-0 w-80">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {/* Status indicator dot */}
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'Uncategorized' ? 'bg-gray-400' :
                      status === 'New Buyer' ? 'bg-orange-500' :
                      status === 'Qualified Buyer' ? 'bg-blue-500' :
                      status === 'Ready to Buy' ? 'bg-green-500' :
                      status === 'Closed Won' ? 'bg-purple-500' :
                      'bg-gray-400'
                    }`}></div>
                    <h3 className="font-medium text-gray-900">{status}</h3>
                  </div>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {statusRecords.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div 
                className={`min-h-[200px] p-2 rounded-lg border-2 border-dashed transition-colors ${
                  dragOverColumn === status 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {statusRecords.map((record) => (
                  <div
                    key={record.id}
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
                      <button
                        onClick={() => onDeleteRow(record.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
