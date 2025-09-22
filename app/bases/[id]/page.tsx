"use client";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Crown } from "lucide-react";
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
import { CreateFieldModal } from "@/components/base-detail/CreateFieldModal";
import { EditFieldModal } from "@/components/base-detail/EditFieldModal";
import { CreateTableModal } from "@/components/base-detail/CreateTableModal";
import { RenameTableModal } from "@/components/base-detail/RenameTableModal";
import { DeleteTableModal } from "@/components/base-detail/DeleteTableModal";

// Types
import type { FieldRow, RecordRow, FieldType } from "@/lib/types/base-detail";

// Services
import { BaseDetailService } from "@/lib/services/base-detail-service";

export default function BaseDetailPage() {
  const params = useParams<{ id: string }>();
  const baseId = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id), [params]);
  
  // Custom hooks
  const { loading: userLoading } = useAuth();
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
    deleteTable,
    createField,
    updateField,
    deleteField,
    updateCell,
    deleteRecord,
    createRecord,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    loadFields,
    loadRecords
  } = useBaseDetail(baseId);
  
  const {
    viewMode,
    topTab,
    sortFieldId,
    sortDirection,
    isRenameModalOpen,
    isCreateFieldModalOpen,
    isEditFieldModalOpen,
    isCreateTableModalOpen,
    isRenameTableModalOpen,
    isDeleteTableModalOpen,
    isImportModalOpen,
    setViewMode,
    setTopTab,
    toggleSort,
    openRenameModal,
    closeRenameModal,
    openCreateFieldModal,
    closeCreateFieldModal,
    openEditFieldModal,
    closeEditFieldModal,
    openCreateTableModal,
    closeCreateTableModal,
    openRenameTableModal,
    closeRenameTableModal,
    openDeleteTableModal,
    closeDeleteTableModal,
    openImportModal,
    closeImportModal
  } = useBaseDetailState();
  
  const { contextMenu, setContextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  // State for editing field
  const [editingField, setEditingField] = useState<FieldRow | null>(null);

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
    showContextMenu(e, 'field', field);
  };

  const handleRowContextMenu = (e: React.MouseEvent, record: RecordRow) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e);
  };

  const handleCreateTable = async (tableName: string) => {
    if (!baseId) return;
    
    try {
      // Get the current table count from the database to avoid using the potentially corrupted tables array
      let orderIndex = 0;
      
      try {
        const existingTables = await BaseDetailService.getTables(baseId);
        orderIndex = Array.isArray(existingTables) ? existingTables.length : 0;
      } catch (fetchError) {
        console.error('Error fetching tables for order index:', fetchError);
        // Fallback to 0 if we can't fetch the count
        orderIndex = 0;
      }
      
      // Create completely clean data
      const tableData = {
        name: String(tableName),
        base_id: String(baseId),
        order_index: orderIndex
      };
      
      await createTable(tableData);
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

  const handleRemoveMasterList = async (tableId: string) => {
    try {
      await updateTable(tableId, { is_master_list: false });
    } catch (err) {
      console.error('Error removing master list:', err);
    }
  };

  const handleRenameTable = async (tableId: string) => {
    // Store the tableId for the modal to use
    setContextMenu(prev => ({ ...prev, tableId }));
    openRenameTableModal();
  };

  const handleDeleteTable = async (tableId: string) => {
    // Store the tableId for the modal to use
    setContextMenu(prev => ({ ...prev, tableId }));
    openDeleteTableModal();
  };

  const handleRenameTableConfirm = async (newName: string) => {
    if (!contextMenu?.tableId) return;
    
    try {
      await updateTable(contextMenu.tableId, { name: newName });
      closeRenameTableModal();
    } catch (err) {
      console.error('Error renaming table:', err);
    }
  };

  const handleDeleteTableConfirm = async () => {
    if (!contextMenu?.tableId) return;
    
    try {
      await deleteTable(contextMenu.tableId);
      closeDeleteTableModal();
    } catch (err) {
      console.error('Error deleting table:', err);
    }
  };

  const handleAddRow = async () => {
    try {
      await createRecord();
    } catch (err) {
      console.error('Error creating record:', err);
    }
  };

  const handleAddField = () => {
    openCreateFieldModal();
  };

  const handleCreateField = async (fieldData: { name: string; type: FieldType; options?: Record<string, unknown> }) => {
    if (!selectedTableId) return;
    
    try {
      await createField({
        name: fieldData.name,
        type: fieldData.type,
        table_id: selectedTableId,
        order_index: fields.length,
        options: fieldData.options
      });
    } catch (err) {
      console.error('Error creating field:', err);
    }
  };

  const handleEditField = async (fieldId: string, fieldData: { name: string; type: FieldType; options?: Record<string, unknown> }) => {
    try {
      await updateField(fieldId, {
        name: fieldData.name,
        type: fieldData.type,
        options: fieldData.options || null
      });
      setEditingField(null);
      closeEditFieldModal();
    } catch (err) {
      console.error('Error updating field:', err);
    }
  };

  const handleDeleteField = async () => {
    if (!contextMenu?.data?.id) return;
    
    const field = contextMenu.data;
    if (!confirm(`Are you sure you want to delete the field "${field.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteField(field.id);
      hideContextMenu();
    } catch (err) {
      console.error('Error deleting field:', err);
    }
  };

  const handleImportCsv = async (data: { 
    file: File; 
    fieldMappings: Record<string, string | { type: 'create', fieldType: string, fieldName: string }> 
  }) => {
    if (!selectedTableId) {
      throw new Error('No table selected');
    }

    console.log('Import CSV debug:', {
      fieldMappings: data.fieldMappings,
      selectedTableId
    });

    const csvText = await data.file.text();
    const result = await BaseDetailService.importCsvData(selectedTableId, csvText, data.fieldMappings);
    
    // Reload fields and records to show the imported data and any new fields
    if (selectedTableId) {
      await loadFields(selectedTableId);
      await loadRecords(selectedTableId);
    }
    
    if (result.errors.length > 0) {
      console.warn('Import completed with errors:', result.errors);
    }
    
    return result;
  };

  // Context menu options
  const getContextMenuOptions = () => {
    if (!contextMenu.isVisible) return [];
    
    if (contextMenu.type === 'field') {
      return [
        {
          id: "edit_field",
          label: "Edit Field",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          onClick: () => {
            if (contextMenu.data) {
              setEditingField(contextMenu.data);
              openEditFieldModal();
              hideContextMenu();
            }
          },
        },
        {
          id: "delete_field",
          label: "Delete Field",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
          onClick: handleDeleteField,
        },
      ];
    }
    
    // Default base context menu options
    return base ? [
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
  };

  const contextMenuOptions = getContextMenuOptions();

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
        onCreateNew={openCreateTableModal}
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
          onCreateTable={openCreateTableModal}
          onToggleMasterList={handleToggleMasterList}
          onRenameTable={handleRenameTable}
          onDeleteTable={handleDeleteTable}
        />

        {/* Table Controls */}
        {topTab === 'data' && (
          <TableControls
            tables={tables}
            selectedTableId={selectedTableId}
            onTableSelect={setSelectedTableId}
            onAddRecord={handleAddRow}
            onImportCsv={openImportModal}
            onCreateTable={openCreateTableModal}
            onRenameTable={handleRenameTable}
            onDeleteTable={handleDeleteTable}
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
              {/* Master List Toggle Button */}
              {(() => {
                const selectedTable = tables.find(t => t.id === selectedTableId);
                const hasMasterList = tables.some(t => t.is_master_list);
                const isCurrentTableMaster = selectedTable?.is_master_list;
                
                // Only show the button if there's no master list in the base
                if (!hasMasterList) {
                  return (
                    <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleMasterList(selectedTableId)}
                        className="flex items-center gap-2 px-3 py-1 text-sm text-yellow-700 hover:bg-yellow-100 rounded-lg transition-colors"
                        title="Make this table a master list"
                      >
                        <Crown size={14} />
                        <span>Make Master List</span>
                      </button>
                    </div>
                  );
                }
                
                // If there is a master list, show the indicator for the current master list table
                if (isCurrentTableMaster) {
                  return (
                    <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveMasterList(selectedTableId)}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded-lg transition-colors"
                        title="Remove master list status"
                      >
                        <Crown size={14} />
                        <span>Master List</span>
                      </button>
                    </div>
                  );
                }
                
                // If there's a master list but this isn't the master list table, don't show anything
                return null;
              })()}
              
              {viewMode === 'grid' ? (
                <GridView
                  records={records}
                  fields={fields}
                  tables={tables}
                  selectedTableId={selectedTableId}
                  sortFieldId={sortFieldId}
                  sortDirection={sortDirection}
                  savingCell={savingCell}
                  onSort={toggleSort}
                  onUpdateCell={updateCell}
                  onDeleteRow={deleteRecord}
                  onAddRow={handleAddRow}
                  onAddField={handleAddField}
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
      {contextMenuOptions.length > 0 && (
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

      {/* Create Field Modal */}
      <CreateFieldModal
        isOpen={isCreateFieldModalOpen}
        onClose={closeCreateFieldModal}
        onCreateField={handleCreateField}
      />

      {/* Edit Field Modal */}
      <EditFieldModal
        isOpen={isEditFieldModalOpen}
        onClose={closeEditFieldModal}
        onEditField={handleEditField}
        field={editingField}
      />

      {/* Import CSV Modal */}
      <ImportCsvModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        fields={fields}
        tableName={tables.find(t => t.id === selectedTableId)?.name || ""}
        onImport={handleImportCsv}
      />

      {/* Create Table Modal */}
      <CreateTableModal
        isOpen={isCreateTableModalOpen}
        onClose={closeCreateTableModal}
        onCreateTable={handleCreateTable}
      />

      {/* Rename Table Modal */}
      <RenameTableModal
        isOpen={isRenameTableModalOpen}
        onClose={closeRenameTableModal}
        onRenameTable={handleRenameTableConfirm}
        currentName={tables.find(t => t.id === contextMenu?.tableId)?.name || ""}
      />

      {/* Delete Table Modal */}
      <DeleteTableModal
        isOpen={isDeleteTableModalOpen}
        onClose={closeDeleteTableModal}
        onDeleteTable={handleDeleteTableConfirm}
        tableName={tables.find(t => t.id === contextMenu?.tableId)?.name || ""}
      />
    </div>
  );
}
