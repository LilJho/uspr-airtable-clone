import { useState } from "react";
import { ChevronDown, Plus, MoreVertical, Zap, Share2, Rocket, Crown } from "lucide-react";
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
  onToggleMasterList
}: TopNavigationProps) => {
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);

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
                  {tables.map((table) => (
                    <div key={table.id} className="flex items-center gap-2 group">
                      <button
                        type="button"
                        onClick={() => {
                          onTableSelect(table.id);
                          setIsTableDropdownOpen(false);
                        }}
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
                      {!table.is_master_list && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleMasterList(table.id);
                            setIsTableDropdownOpen(false);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-yellow-100 rounded transition-all"
                          title="Make master list"
                        >
                          <Crown size={12} className="text-yellow-600" />
                        </button>
                      )}
                    </div>
                  ))}
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
    </div>
  );
};
