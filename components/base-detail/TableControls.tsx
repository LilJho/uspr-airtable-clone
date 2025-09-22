import { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings, 
  Eye, 
  Filter, 
  Group, 
  ArrowUpDown, 
  Palette, 
  Share2, 
  Search,
  Upload,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import type { TableRow } from "@/lib/types/base-detail";

interface TableControlsProps {
  tables: TableRow[];
  selectedTableId: string | null;
  onTableSelect: (tableId: string) => void;
  onAddRecord: () => void;
  onImportCsv: () => void;
  onCreateTable: () => void;
  onRenameTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onHideFields: () => void;
  onFilter: () => void;
  onGroup: () => void;
  onSort: () => void;
  onColor: () => void;
  onShare: () => void;
}

export const TableControls = ({
  tables,
  selectedTableId,
  onTableSelect,
  onAddRecord,
  onImportCsv,
  onCreateTable,
  onRenameTable,
  onDeleteTable,
  onHideFields,
  onFilter,
  onGroup,
  onSort,
  onColor,
  onShare
}: TableControlsProps) => {
  const [contextMenu, setContextMenu] = useState<{
    tableId: string;
    x: number;
    y: number;
  } | null>(null);

  const handleTableContextMenu = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      tableId,
      x: e.clientX,
      y: e.clientY
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Table Tabs */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tables.map((table) => (
            <div key={table.id} className="flex items-center gap-1 group relative">
              <button
                type="button"
                onClick={() => onTableSelect(table.id)}
                onContextMenu={(e) => handleTableContextMenu(e, table.id)}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  selectedTableId === table.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {table.name}
                {selectedTableId === table.id && (
                  <ChevronRight size={14} className="text-blue-700" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTableContextMenu(e, table.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                title="Table options"
              >
                <MoreVertical size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onCreateTable}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Create new table"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Table Navigation */}
        <div className="flex items-center gap-2">
          <button type="button" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={16} className="text-gray-400" />
          </button>
          <button type="button" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button
            type="button"
            onClick={onAddRecord}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Add record"
          >
            <Plus size={16} className="text-gray-400" />
          </button>
          <button
            type="button"
            onClick={onImportCsv}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Import CSV"
          >
            <Upload size={16} className="text-gray-400" />
          </button>
          <button type="button" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onHideFields}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Eye size={16} />
            <span>Hide fields</span>
          </button>
          <button
            type="button"
            onClick={onFilter}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Filter size={16} />
            <span>Filter</span>
          </button>
          <button
            type="button"
            onClick={onGroup}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Group size={16} />
            <span>Group</span>
          </button>
          <button
            type="button"
            onClick={onSort}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowUpDown size={16} />
            <span>Sorted by 1 field</span>
          </button>
          <button
            type="button"
            onClick={onColor}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Palette size={16} />
            <span>Color</span>
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Share2 size={16} />
            <span>Share and sync</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search records..."
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
          />
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={closeContextMenu}
          />
          
          {/* Context Menu */}
          <div
            className="fixed z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <button
              type="button"
              onClick={() => {
                onRenameTable(contextMenu.tableId);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Edit size={14} />
              <span>Rename table</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteTable(contextMenu.tableId);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              <span>Delete table</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
