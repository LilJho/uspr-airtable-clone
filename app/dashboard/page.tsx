"use client";
import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ContextMenu, useContextMenu } from "@/components/ui/context-menu";
import { RenameModal } from "@/components/ui/rename-modal";

// Hooks
import { useAuth } from "@/lib/hooks/useAuth";
import { useBases } from "@/lib/hooks/useBases";
import { useWorkspaces } from "@/lib/hooks/useWorkspaces";
import { useDashboardState } from "@/lib/hooks/useDashboardState";

// Components
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { Banner } from "@/components/dashboard/Banner";
import { HomeView } from "@/components/dashboard/views/HomeView";
import { WorkspaceView } from "@/components/dashboard/views/WorkspaceView";
import { StarredView } from "@/components/dashboard/views/StarredView";
import { CreateBaseModal } from "@/components/dashboard/modals/CreateBaseModal";
import { CreateWorkspaceModal } from "@/components/dashboard/modals/CreateWorkspaceModal";
import { DeleteWorkspaceModal } from "@/components/dashboard/modals/DeleteWorkspaceModal";
import { DeleteBaseModal } from "@/components/base-detail/DeleteBaseModal";

// Utils
import { getBaseContextMenuOptions } from "@/lib/utils/context-menu-helpers";

// Types
import type { BaseRecord } from "@/lib/types/dashboard";

export default function Dashboard() {
  const router = useRouter();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  // Custom hooks
  const { user, loading, signOut } = useAuth();
  const {
    recentBases,
    workspaceBases,
    starredBases,
    error: basesError,
    loadRecentBases,
    loadWorkspaceBases,
    loadStarredBases,
    createBase,
    renameBase,
    toggleStar,
    deleteBase,
    clearError: clearBasesError
  } = useBases();
  
  const {
    workspaces,
    error: workspacesError,
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    clearError: clearWorkspacesError
  } = useWorkspaces();
  
  const {
    activeView,
    collectionView,
    sortOption,
    selectedWorkspaceId,
    selectedBase,
    showBanner,
    isCreateOpen,
    isCreateWorkspaceOpen,
    isRenameModalOpen,
    isDeleteBaseModalOpen,
    isDeleteWorkspaceModalOpen,
    workspacesCollapsed,
    isSortOpen,
    editingWorkspaceId,
    editingWorkspaceName,
    workspaceToDelete,
    setActiveView,
    setCollectionView,
    setSortOption,
    setSelectedWorkspaceId,
    setSelectedBase,
    setShowBanner,
    setIsCreateWorkspaceOpen,
    setWorkspacesCollapsed,
    setIsSortOpen,
    switchToWorkspaceView,
    switchToHomeView,
    switchToStarredView,
    openCreateModal,
    closeCreateModal,
    openRenameModal,
    closeRenameModal,
    openDeleteBaseModal,
    closeDeleteBaseModal,
    startEditingWorkspace,
    cancelEditingWorkspace,
    openDeleteWorkspaceModal,
    closeDeleteWorkspaceModal,
    setEditingWorkspaceName
  } = useDashboardState();

  // Initialize data on component mount
  const initializeDashboard = useCallback(async () => {
    const defaultWorkspaceId = await loadWorkspaces();
    if (defaultWorkspaceId) {
      setSelectedWorkspaceId(defaultWorkspaceId);
    }
    await loadRecentBases();
  }, [loadWorkspaces, loadRecentBases, setSelectedWorkspaceId]);

  // Event handlers
  const handleBaseContextMenu = useCallback((e: React.MouseEvent, base: BaseRecord) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBase(base);
    showContextMenu(e, 'base', base);
  }, [setSelectedBase, showContextMenu]);

  const handleRenameBase = useCallback(async (newName: string) => {
    if (!selectedBase) return;
    await renameBase(selectedBase.id, newName);
  }, [selectedBase, renameBase]);

  const handleDeleteBase = useCallback(async () => {
    if (!selectedBase) return;
    await deleteBase(selectedBase.id);
    closeDeleteBaseModal();
  }, [selectedBase, deleteBase, closeDeleteBaseModal]);

  const handleCreateBase = useCallback(async (formData: { name: string; description: string; workspaceId: string }) => {
    await createBase(formData);
  }, [createBase]);

  const handleCreateWorkspace = useCallback(async (formData: { name: string }) => {
    const newWorkspace = await createWorkspace(formData);
    setSelectedWorkspaceId(newWorkspace.id);
  }, [createWorkspace, setSelectedWorkspaceId]);

  const handleEditWorkspace = useCallback(async (id: string, name: string) => {
    await updateWorkspace(id, name);
    cancelEditingWorkspace();
  }, [updateWorkspace, cancelEditingWorkspace]);

  const handleDeleteWorkspace = useCallback(async () => {
    if (!workspaceToDelete) return;
    
    await deleteWorkspace(workspaceToDelete.id);
        
        // If we're deleting the currently selected workspace, switch to home
        if (selectedWorkspaceId === workspaceToDelete.id) {
      switchToHomeView();
          setSelectedWorkspaceId(null);
        }
        
    closeDeleteWorkspaceModal();
  }, [workspaceToDelete, deleteWorkspace, selectedWorkspaceId, switchToHomeView, setSelectedWorkspaceId, closeDeleteWorkspaceModal]);

  const handleWorkspaceSelect = useCallback((workspaceId: string) => {
    switchToWorkspaceView(workspaceId);
    loadWorkspaceBases(workspaceId);
  }, [switchToWorkspaceView, loadWorkspaceBases]);

  const handleStarredViewSelect = useCallback(() => {
    switchToStarredView();
    loadStarredBases();
  }, [switchToStarredView, loadStarredBases]);

  // Context menu options
  const contextMenuOptions = selectedBase ? getBaseContextMenuOptions(selectedBase, {
    onOpen: (baseId: string) => router.push(`/bases/${baseId}`),
    onRename: openRenameModal,
    onToggleStar: toggleStar,
    onDuplicate: () => alert("Duplicate functionality would be implemented here"),
    onDelete: openDeleteBaseModal
  }) : [];

  // Initialize dashboard on mount
  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
          {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          selectedWorkspaceId={selectedWorkspaceId}
          workspaces={workspaces}
          workspacesCollapsed={workspacesCollapsed}
          editingWorkspaceId={editingWorkspaceId}
          editingWorkspaceName={editingWorkspaceName}
          onViewChange={(view) => {
            if (view === 'home') switchToHomeView();
            else if (view === 'starred') handleStarredViewSelect();
          }}
          onWorkspaceSelect={handleWorkspaceSelect}
          onWorkspacesToggle={() => setWorkspacesCollapsed(!workspacesCollapsed)}
          onCreateWorkspace={() => setIsCreateWorkspaceOpen(true)}
          onCreateBase={openCreateModal}
          onEditWorkspace={handleEditWorkspace}
          onStartEditingWorkspace={startEditingWorkspace}
          onCancelEditingWorkspace={cancelEditingWorkspace}
          onDeleteWorkspace={openDeleteWorkspaceModal}
          setEditingWorkspaceName={setEditingWorkspaceName}
        />

        {/* Main Content */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <TopBar user={user} onSignOut={signOut} />

          {/* Banner */}
          {showBanner && <Banner onClose={() => setShowBanner(false)} />}

          {/* Content */}
          <main className="px-6 py-6">
            {activeView === 'home' && (
              <HomeView
                recentBases={recentBases}
                collectionView={collectionView}
                sortOption={sortOption}
                isSortOpen={isSortOpen}
                onCollectionViewChange={setCollectionView}
                onSortOptionChange={setSortOption}
                onSortToggle={setIsSortOpen}
                onBaseContextMenu={handleBaseContextMenu}
              />
            )}
            
            {activeView === 'workspace' && (
              <WorkspaceView
                workspaceBases={workspaceBases}
                workspaces={workspaces}
                selectedWorkspaceId={selectedWorkspaceId}
                collectionView={collectionView}
                sortOption={sortOption}
                onCollectionViewChange={setCollectionView}
                onCreateBase={openCreateModal}
                onBaseContextMenu={handleBaseContextMenu}
              />
            )}
            
            {activeView === 'starred' && (
              <StarredView
                starredBases={starredBases}
                collectionView={collectionView}
                onCollectionViewChange={setCollectionView}
                onBaseContextMenu={handleBaseContextMenu}
              />
            )}
          </main>

          {/* Modals */}
          <CreateBaseModal
            isOpen={isCreateOpen}
            onClose={closeCreateModal}
            onCreate={handleCreateBase}
            activeView={activeView}
            selectedWorkspaceId={selectedWorkspaceId}
            workspaces={workspaces}
          />

          <CreateWorkspaceModal
            isOpen={isCreateWorkspaceOpen}
            onClose={() => setIsCreateWorkspaceOpen(false)}
            onCreate={handleCreateWorkspace}
          />

          <DeleteWorkspaceModal
            isOpen={isDeleteWorkspaceModalOpen}
            workspace={workspaceToDelete}
            onClose={closeDeleteWorkspaceModal}
            onDelete={handleDeleteWorkspace}
            deleting={false}
          />

          {/* Context Menu */}
          {selectedBase && (
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
            currentName={selectedBase?.name || ""}
            onClose={closeRenameModal}
            onRename={handleRenameBase}
            title="Rename Base"
          />

          {/* Delete Base Modal */}
          <DeleteBaseModal
            isOpen={isDeleteBaseModalOpen}
            onClose={closeDeleteBaseModal}
            onDeleteBase={handleDeleteBase}
            baseName={selectedBase?.name || ""}
          />
        </section>
      </div>
    </div>
  );
}
