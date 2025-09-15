import { MoreVertical, Trash2 } from "lucide-react";
import CellEditor from "../../app/bases/[id]/CellEditor";
import { StatusLabel } from "./StatusLabel";
import type { RecordRow, FieldRow, SavingCell } from "@/lib/types/base-detail";

interface TableRowProps {
  record: RecordRow;
  fields: FieldRow[];
  rowIndex: number;
  savingCell: SavingCell;
  onUpdateCell: (recordId: string, fieldId: string, value: unknown) => void;
  onDeleteRow: (recordId: string) => void;
  onRowContextMenu: (e: React.MouseEvent, record: RecordRow) => void;
}

export const TableRow = ({
  record,
  fields,
  rowIndex,
  savingCell,
  onUpdateCell,
  onDeleteRow,
  onRowContextMenu
}: TableRowProps) => {
  const isSaving = savingCell?.recordId === record.id;

  return (
    <div className="flex border-b border-gray-200 hover:bg-gray-50 group">
      {/* Row number */}
      <div className="w-12 flex-shrink-0 border-r border-gray-200 bg-gray-100 flex items-center justify-center">
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
          <button
            onClick={() => onDeleteRow(record.id)}
            className="p-1 hover:bg-red-100 text-red-600 hover:text-red-800 rounded"
            title="Delete row"
            disabled={isSaving}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
