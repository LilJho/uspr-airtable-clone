import { MoreVertical, Trash2 } from "lucide-react";
import CellEditor from "../../app/bases/[id]/CellEditor";
import { StatusLabel } from "./StatusLabel";
import type { RecordRow, FieldRow, SavingCell, TableRow as TableRowType } from "@/lib/types/base-detail";

interface TableRowProps {
  record: RecordRow;
  fields: FieldRow[];
  tables: TableRowType[];
  selectedTableId: string | null;
  rowIndex: number;
  savingCell: SavingCell;
  onUpdateCell: (recordId: string, fieldId: string, value: unknown) => void;
  onDeleteRow: (recordId: string) => void;
  onRowContextMenu: (e: React.MouseEvent, record: RecordRow) => void;
  canDeleteRow?: boolean;
}

export const TableRow = ({
  record,
  fields,
  tables,
  selectedTableId,
  rowIndex,
  savingCell,
  onUpdateCell,
  onDeleteRow,
  onRowContextMenu,
  canDeleteRow = true
}: TableRowProps) => {
  const isSaving = savingCell?.recordId === record.id;
  
  // Check if we're viewing a master list
  const selectedTable = tables.find(t => t.id === selectedTableId);
  const isMasterListView = selectedTable?.is_master_list;
  
  // Get the table name for this record
  const recordTable = tables.find(t => t.id === record.table_id);
  const tableName = recordTable?.name;

  return (
    <div className="flex border-b border-gray-200 hover:bg-gray-50 group">
      {/* Row number and table indicator */}
      <div className="w-12 flex-shrink-0 border-r border-gray-200 bg-gray-100 flex flex-col items-center justify-center py-1">
        <span className="text-xs text-gray-500">{rowIndex + 1}</span>
        
      </div>
      
      {/* Field cells */}
      {fields.map((field) => {
        const value = record.values?.[field.id];
        const isCellSaving = savingCell?.recordId === record.id && savingCell?.fieldId === field.id;
        
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
          if (shouldRenderAsLabel(field.name, field.type) && value) {
            // Check if this is a select field with custom options and colors
            if ((field.type === 'single_select' || field.type === 'multi_select') && field.options) {
              const optionKey = String(value);
              const optionData = field.options[optionKey] as { label?: string; color?: string } | undefined;
              
              if (optionData?.color) {
                return (
                  <StatusLabel 
                    type="status" 
                    value={optionData.label || String(value)} 
                    customColor={optionData.color}
                  />
                );
              }
            }
            
            // Determine label type based on field name
            let labelType: 'urgency' | 'lead_source' | 'status' | 'deal_type' = 'status';
            const fieldName = field.name.toLowerCase();
            
            if (fieldName.includes('urgency') || fieldName.includes('priority')) {
              labelType = 'urgency';
            } else if (fieldName.includes('source') && fieldName.includes('lead')) {
              labelType = 'lead_source';
            } else if (fieldName.includes('deal') && fieldName.includes('type')) {
              labelType = 'deal_type';
            } else if (fieldName.includes('status')) {
              labelType = 'status';
            }

            return <StatusLabel type={labelType} value={String(value)} />;
          }

          return (
            <CellEditor
              field={field}
              value={value}
              recordId={record.id}
              onUpdate={(newValue) => onUpdateCell(record.id, field.id, newValue)}
              isSaving={isCellSaving}
            />
          );
        };
        
        return (
          <div
            key={field.id}
            className="flex-1 min-w-[150px] border-r border-gray-200 relative p-3"
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
