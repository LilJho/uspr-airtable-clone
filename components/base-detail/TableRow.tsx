import { MoreVertical, Trash2 } from "lucide-react";
import CellEditor from "../../app/bases/[id]/CellEditor";
import { StatusLabel } from "./StatusLabel";
import type { RecordRow, FieldRow, SavingCell, TableRow as TableRowType } from "@/lib/types/base-detail";

interface TableRowProps {
  record: RecordRow;
  fields: FieldRow[];
  allFields?: FieldRow[]; // All fields from all tables (for masterlist matching)
  tables: TableRowType[];
  selectedTableId: string | null;
  rowIndex: number;
  savingCell: SavingCell;
  isSelected: boolean;
  onUpdateCell: (recordId: string, fieldId: string, value: unknown) => void;
  onDeleteRow: (recordId: string) => void;
  onRowContextMenu: (e: React.MouseEvent, record: RecordRow) => void;
  onSelectRow: (recordId: string, checked: boolean) => void;
  canDeleteRow?: boolean;
}

export const TableRow = ({
  record,
  fields,
  allFields = fields, // Default to fields if allFields not provided
  tables,
  selectedTableId,
  rowIndex,
  savingCell,
  isSelected,
  onUpdateCell,
  onDeleteRow,
  onRowContextMenu,
  canDeleteRow = true,
  onSelectRow
}: TableRowProps) => {
  const isSaving = savingCell?.recordId === record.id;
  
  // Check if we're viewing a master list
  const selectedTable = tables.find(t => t.id === selectedTableId);
  const isMasterListView = selectedTable?.is_master_list;
  
  // Get the table name for this record
  const recordTable = tables.find(t => t.id === record.table_id);
  const tableName = recordTable?.name;

  return (
    <div className={`flex border-b border-gray-200 hover:bg-gray-50 group ${isSelected ? 'bg-blue-50' : ''}`}>
      {/* Checkbox column */}
      <div className="w-10 flex-shrink-0 border-r border-gray-200 flex items-center justify-start pl-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelectRow(record.id, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      {/* Row number and table indicator */}
      <div className="w-12 flex-shrink-0 border-r border-gray-200 bg-gray-100 flex flex-col items-center justify-center py-1">
        <span className="text-xs text-gray-500">{rowIndex + 1}</span>
        
      </div>
      
      {/* Field cells */}
      {fields.map((field) => {
        // When viewing masterlist, we need to find the value for this field name
        // Records have values keyed by field IDs from their own table
        // But deduplicated fields might have IDs from different tables
        let value: unknown = undefined;
        let actualFieldId = field.id; // Track which field ID we're actually using for the value
        
        if (isMasterListView) {
          // Find all fields with the same name from ALL tables (not just deduplicated fields)
          const fieldsWithSameName = allFields.filter(f => f.name === field.name);
          
          // First, try the exact field ID match
          if (record.values?.[field.id] !== undefined) {
            value = record.values[field.id];
            actualFieldId = field.id;
          } else {
            // If no exact match, try to find a field with the same name that belongs to the record's table
            // This ensures we find the correct field ID even if deduplication kept a different table's field
            for (const matchingField of fieldsWithSameName) {
              if (matchingField.table_id === record.table_id) {
                const matchingValue = record.values?.[matchingField.id];
                if (matchingValue !== undefined && matchingValue !== null && matchingValue !== '') {
                  value = matchingValue;
                  actualFieldId = matchingField.id;
                  break; // Use the first matching field from the record's table with data
                }
              }
            }
          }
        } else {
          // For non-masterlist views, use direct field ID lookup
          value = record.values?.[field.id];
          actualFieldId = field.id;
        }
        
        const isCellSaving = savingCell?.recordId === record.id && savingCell?.fieldId === actualFieldId;
        
        // Determine if this field should render as a status label
        const shouldRenderAsLabel = (fieldName: string, fieldType: string) => {
          const name = fieldName.toLowerCase();
          return (
            (name.includes('urgency') || name.includes('priority')) ||
            (name.includes('source') && name.includes('lead')) ||
            (name.includes('status')) ||
            (name.includes('deal') && name.includes('type')) ||
            fieldType === 'single_select' || fieldType === 'multi_select'
          );
        };

        const renderCellContent = () => {
          return (
            <CellEditor
              field={field}
              value={value}
              recordId={record.id}
              onUpdate={(newValue) => onUpdateCell(record.id, actualFieldId, newValue)}
              isSaving={isCellSaving}
            />
          );
        };
        
        return (
          <div
            key={field.id}
            className="flex-1 min-w-[150px] max-w-[300px] border-r border-gray-200 relative p-3 flex items-center"
          >
            {renderCellContent()}
          </div>
        );
      })}
      
      {/* Row actions */}
      <div className="w-32 flex-shrink-0 flex items-center justify-center">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => onRowContextMenu(e, record)}
            className="p-1 hover:bg-gray-200 rounded"
            title="Row options"
          >
            <MoreVertical size={14} />
          </button>
          {canDeleteRow && (
            <button
              onClick={() => onDeleteRow(record.id)}
              className="p-1 hover:bg-red-100 text-red-600 hover:text-red-800 rounded"
              title="Delete row"
              disabled={isSaving}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
