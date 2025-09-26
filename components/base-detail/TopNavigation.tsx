import { useState } from "react";
import { ChevronDown, Plus, MoreVertical, Zap, Share2, Rocket, Crown, Edit, Trash2 } from "lucide-react";
import type { BaseRow, TableRow, TopTab } from "@/lib/types/base-detail";

interface TopNavigationProps {
  base: BaseRow | null;
  tables: TableRow[];
  selectedTableId: string | null;
  topTab: TopTab;
  onTableSelect: (tableId: string) => void;
  onTabChange: (tab: TopTab) => void;
  onBaseContextMenu: (e: React.MouseEvent) => void;
  onCreateTable: () => void;
  onToggleMasterList: (tableId: string) => void;
  onRenameTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  canDeleteTable?: boolean;
  onManageMembers?: () => void;
  canManageMembers?: boolean;
}

export const TopNavigation = ({
  base,
  tables,
  selectedTableId,
  topTab,
  onTableSelect,
  onTabChange,
  onBaseContextMenu,
  onCreateTable,
  onToggleMasterList,
  onRenameTable,
  onDeleteTable,
  canDeleteTable = true,
  onManageMembers,
  canManageMembers = false
}: TopNavigationProps) => {
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
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

  const tabs: { id: TopTab; label: string }[] = [
    { id: 'data', label: 'Data' },
    { id: 'automations', label: 'Automations' },
    { id: 'interfaces', label: 'Interfaces' },
    { id: 'forms', label: 'Forms' },
  ];

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Logo and Base name */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <button
                type="button"
                onClick={onBaseContextMenu}
                className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {base?.name || 'Customer Data Management'}
              </button>
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>

          {/* Table selector */}
          <div className="relative">

            {isTableDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  {tables.map((table) => {
                    const hasMasterList = tables.some(t => t.is_master_list);
                    
                    return (
                      <div key={table.id} className="flex items-center gap-2 group">
                        <button
                          type="button"
                          onClick={() => {
                            onTableSelect(table.id);
                            setIsTableDropdownOpen(false);
                          }}
                          onContextMenu={(e) => handleTableContextMenu(e, table.id)}
                          className={`flex-1 text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors ${
                            selectedTableId === table.id ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{table.name}</span>
                            {table.is_master_list && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                Master
                              </span>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          {/* Only show crown button if there's no master list in the base */}
                          {!hasMasterList && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleMasterList(table.id);
                                setIsTableDropdownOpen(false);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-yellow-100 rounded transition-all text-yellow-600"
                              title="Make master list"
                            >
                              <Crown size={12} />
                            </button>
                          )}
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
                      </div>
                    );
                  })}
                  <div className="border-t border-gray-200 mt-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onCreateTable();
                        setIsTableDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      + Create new table
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canManageMembers && onManageMembers && (
            <button
              type="button"
              onClick={onManageMembers}
              className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Manage members
            </button>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-t border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              topTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
            {canDeleteTable && (
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
            )}
          </div>
        </>
      )}
    </div>
  );
};
