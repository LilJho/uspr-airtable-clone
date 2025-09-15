"use client";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ContextMenu, useContextMenu } from "@/components/ui/context-menu";
import { RenameModal } from "@/components/ui/rename-modal";

// Hooks
import { useAuth } from "@/lib/hooks/useAuth";
import { useBaseDetail } from "@/lib/hooks/useBaseDetail";
import { useBaseDetailState } from "@/lib/hooks/useBaseDetailState";

// Components
import { TopNavigation } from "@/components/base-detail/TopNavigation";
import { Sidebar } from "@/components/base-detail/Sidebar";
import { TableControls } from "@/components/base-detail/TableControls";
import { GridView } from "@/components/base-detail/GridView";
import { KanbanView } from "@/components/base-detail/KanbanView";
import { AutomationsView } from "@/components/base-detail/AutomationsView";
import { ImportCsvModal } from "@/components/base-detail/ImportCsvModal";

// Types
import type { BaseRow, FieldRow, RecordRow } from "@/lib/types/base-detail";

// Services
import { BaseDetailService } from "@/lib/services/base-detail-service";

export default function BaseDetailPage() {
  const params = useParams<{ id: string }>();
  const baseId = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id), [params]);
  
  // Custom hooks
  const { user, loading: userLoading } = useAuth();
  const {
    base,
    tables,
    selectedTableId,
    fields,
    records,
    automations,
    allFields,
    loading,
    savingCell,
    error,
    setSelectedTableId,
    updateBase,
    deleteBase,
    createTable,
    updateTable,
    updateCell,
    deleteRecord,
    createRecord,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation
  } = useBaseDetail(baseId);
  
  const {
    viewMode,
    topTab,
    sortFieldId,
    sortDirection,
    isRenameModalOpen,
    isImportModalOpen,
    setViewMode,
    setTopTab,
    toggleSort,
    openRenameModal,
    closeRenameModal,
    openImportModal,
    closeImportModal
  } = useBaseDetailState();
  
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  // Event handlers
  const handleRenameBase = async (newName: string) => {
    await updateBase({ name: newName });
  };

  const handleDeleteBase = async () => {
    if (!base) return;
    
    if (!confirm(`Are you sure you want to delete "${base.name}"? This action cannot be undone.`)) {
      return;
    }
    
    await deleteBase();
  };

  const handleBaseContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e);
  };

  const handleFieldContextMenu = (e: React.MouseEvent, field: FieldRow) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e);
  };

  const handleRowContextMenu = (e: React.MouseEvent, record: RecordRow) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e);
  };

  const handleCreateTable = async () => {
    if (!base) return;
    
    const tableName = prompt("Enter table name:");
    if (!tableName?.trim()) return;
    
    try {
      await createTable({
        name: tableName.trim(),
        base_id: base.id,
        order_index: tables.length
      });
    } catch (err) {
      console.error('Error creating table:', err);
    }
  };

  const handleToggleMasterList = async (tableId: string) => {
    try {
      // First, set all tables in this base to not be master list
      const currentMasterTables = tables.filter(t => t.is_master_list);
      for (const table of currentMasterTables) {
        await updateTable(table.id, { is_master_list: false });
      }
      
      // Then set the selected table as master list
      await updateTable(tableId, { is_master_list: true });
    } catch (err) {
      console.error('Error toggling master list:', err);
    }
  };

  const handleAddRow = async () => {
    try {
      await createRecord();
    } catch (err) {
      console.error('Error creating record:', err);
    }
  };

  const handleImportCsv = async (data: { file: File; fieldMappings: Record<string, string> }) => {
    if (!selectedTableId) {
      throw new Error('No table selected');
    }

    const csvText = await data.file.text();
    const result = await BaseDetailService.importCsvData(selectedTableId, csvText, data.fieldMappings);
    
    // Reload records to show the imported data
    // The useBaseDetail hook should automatically refresh the records
    
    if (result.errors.length > 0) {
      console.warn('Import completed with errors:', result.errors);
    }
    
    return result;
  };

  // Context menu options
  const contextMenuOptions = base ? [
    {
      id: "rename",
      label: "Rename",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: openRenameModal,
    },
    {
      id: "delete",
      label: "Delete",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: handleDeleteBase,
      separator: true,
    },
  ] : [];

  // Loading state
  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateNew={handleCreateTable}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <TopNavigation
          base={base}
          tables={tables}
          selectedTableId={selectedTableId}
          topTab={topTab}
          onTableSelect={setSelectedTableId}
          onTabChange={setTopTab}
          onBaseContextMenu={handleBaseContextMenu}
          onCreateTable={handleCreateTable}
          onToggleMasterList={handleToggleMasterList}
        />

        {/* Table Controls */}
        {topTab === 'data' && (
          <TableControls
            tables={tables}
            selectedTableId={selectedTableId}
            onTableSelect={setSelectedTableId}
            onAddRecord={handleAddRow}
            onImportCsv={openImportModal}
            onCreateTable={handleCreateTable}
            onToggleMasterList={handleToggleMasterList}
            onHideFields={() => {}} // TODO: Implement
            onFilter={() => {}} // TODO: Implement
            onGroup={() => {}} // TODO: Implement
            onSort={() => {}} // TODO: Implement
            onColor={() => {}} // TODO: Implement
            onShare={() => {}} // TODO: Implement
          />
        )}

        {/* Data View */}
        <div className="flex-1 overflow-hidden">
          {topTab === 'data' && selectedTableId && (
            <>
              {viewMode === 'grid' ? (
                <GridView
                  records={records}
                  fields={fields}
                  sortFieldId={sortFieldId}
                  sortDirection={sortDirection}
                  savingCell={savingCell}
                  onSort={toggleSort}
                  onUpdateCell={updateCell}
                  onDeleteRow={deleteRecord}
                  onAddRow={handleAddRow}
                  onAddField={() => {}} // TODO: Implement field creation
                  onFieldContextMenu={handleFieldContextMenu}
                  onRowContextMenu={handleRowContextMenu}
                />
              ) : (
                <KanbanView
                  records={records}
                  fields={fields}
                  onUpdateCell={updateCell}
                  onDeleteRow={deleteRecord}
                  onAddRow={handleAddRow}
                  savingCell={savingCell}
                />
              )}
            </>
          )}

          {topTab === 'automations' && (
            <AutomationsView
              automations={automations}
              tables={tables}
              fields={allFields}
              onCreateAutomation={createAutomation}
              onUpdateAutomation={updateAutomation}
              onDeleteAutomation={deleteAutomation}
              onToggleAutomation={toggleAutomation}
            />
          )}

          {topTab === 'interfaces' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Interfaces</h3>
                <p className="text-gray-500">Interface features coming soon...</p>
              </div>
            </div>
          )}

          {topTab === 'forms' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Forms</h3>
                <p className="text-gray-500">Form features coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {base && (
        <ContextMenu
          options={contextMenuOptions}
          position={contextMenu.position}
          onClose={hideContextMenu}
          isVisible={contextMenu.isVisible}
        />
      )}

      {/* Rename Modal */}
      <RenameModal
        isOpen={isRenameModalOpen}
        currentName={base?.name || ""}
        onClose={closeRenameModal}
        onRename={handleRenameBase}
        title="Rename Base"
      />
    </div>
  );
}
