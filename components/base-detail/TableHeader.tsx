import { ChevronDown, Plus, MoreVertical, Minus } from "lucide-react";
import type { FieldRow, SortDirection } from "@/lib/types/base-detail";

interface TableHeaderProps {
  fields: FieldRow[];
  sortFieldId: string | null;
  sortDirection: SortDirection;
  allSelected: boolean;
  someSelected: boolean;
  onSort: (fieldId: string) => void;
  onAddField: () => void;
  onFieldContextMenu: (e: React.MouseEvent, field: FieldRow) => void;
  onSelectAll: (checked: boolean) => void;
}

export const TableHeader = ({
  fields,
  sortFieldId,
  sortDirection,
  allSelected,
  someSelected,
  onSort,
  onAddField,
  onFieldContextMenu,
  onSelectAll
}: TableHeaderProps) => {
  return (
    <div className="flex border-b border-gray-200 bg-gray-50 min-w-max">
      {/* Checkbox column */}
      <div className="w-10 flex-shrink-0 border-r border-gray-200 bg-gray-100 flex items-center justify-start pl-3">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(input) => {
            if (input) {
              input.indeterminate = someSelected;
            }
          }}
          onChange={(e) => onSelectAll(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          title={allSelected ? "Deselect all" : "Select all"}
        />
      </div>
      
      {/* Row number column */}
      <div className="w-12 flex-shrink-0 border-r border-gray-200 bg-gray-100 flex items-center justify-center">
        <span className="text-xs text-gray-500 font-medium">#</span>
      </div>
      
      {/* Field columns */}
      {fields.map((field) => (
        <div
          key={field.id}
          className="flex-1 min-w-[150px] max-w-[300px] border-r border-gray-200 bg-gray-50 group relative"
        >
          <div className="flex items-center justify-between p-3 min-w-0">
            <button
              onClick={() => onSort(field.id)}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors min-w-0 flex-1"
            >
              <span className="text-sm font-medium text-gray-900 truncate text-center flex-1" title={field.name}>
                {field.name}
              </span>
              {sortFieldId === field.id && (
                <ChevronDown 
                  size={14} 
                  className={`transition-transform flex-shrink-0 ${
                    sortDirection === 'desc' ? 'rotate-180' : ''
                  }`} 
                />
              )}
            </button>
            
            <button
              onClick={(e) => onFieldContextMenu(e, field)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all flex-shrink-0 ml-2"
              title="Field options"
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>
      ))}
      
      {/* Add field column */}
      <div className="w-32 flex-shrink-0 bg-gray-50">
        <button
          onClick={onAddField}
          className="w-full h-full flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Add field"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};
