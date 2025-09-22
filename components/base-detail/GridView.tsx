import { Plus } from "lucide-react";
import { TableHeader } from "./TableHeader";
import { TableRow } from "./TableRow";
import type { RecordRow, FieldRow, SavingCell, TableRow as TableRowType } from "@/lib/types/base-detail";

interface GridViewProps {
  records: RecordRow[];
  fields: FieldRow[];
  tables: TableRowType[];
  selectedTableId: string | null;
  sortFieldId: string | null;
  sortDirection: 'asc' | 'desc';
  savingCell: SavingCell;
  onSort: (fieldId: string) => void;
  onUpdateCell: (recordId: string, fieldId: string, value: unknown) => void;
  onDeleteRow: (recordId: string) => void;
  onAddRow: () => void;
  onAddField: () => void;
  onFieldContextMenu: (e: React.MouseEvent, field: FieldRow) => void;
  onRowContextMenu: (e: React.MouseEvent, record: RecordRow) => void;
}

export const GridView = ({
  records,
  fields,
  tables,
  selectedTableId,
  sortFieldId,
  sortDirection,
  savingCell,
  onSort,
  onUpdateCell,
  onDeleteRow,
  onAddRow,
  onAddField,
  onFieldContextMenu,
  onRowContextMenu
}: GridViewProps) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Table Header */}
      <TableHeader
        fields={fields}
        sortFieldId={sortFieldId}
        sortDirection={sortDirection}
        onSort={onSort}
        onAddField={onAddField}
        onFieldContextMenu={onFieldContextMenu}
      />
      
      {/* Table Body */}
      <div className="flex-1 overflow-auto">
        {records.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No records yet</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first record</p>
              <button
                onClick={onAddRow}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Add Row
              </button>
            </div>
          </div>
        ) : (
          <div>
            {records.map((record, index) => (
              <TableRow
                key={record.id}
                record={record}
                fields={fields}
                tables={tables}
                selectedTableId={selectedTableId}
                rowIndex={index}
                savingCell={savingCell}
                onUpdateCell={onUpdateCell}
                onDeleteRow={onDeleteRow}
                onRowContextMenu={onRowContextMenu}
              />
            ))}
            
            {/* Add Row button spanning entire row */}
            <div className="flex border-b border-gray-200 hover:bg-gray-50">
              <div className="w-12 flex-shrink-0 border-r border-gray-200 bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-500">+</span>
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={onAddRow}
                  className="w-full h-12 flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Row</span>
                </button>
              </div>
              <div className="w-32 flex-shrink-0"></div>
            </div>
            
            {/* Footer with record count */}
            <div className="flex items-center justify-end px-6 py-3 bg-gray-50 border-t border-gray-200">
              <span className="text-sm text-gray-500">{records.length} {records.length === 1 ? 'record' : 'records'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
