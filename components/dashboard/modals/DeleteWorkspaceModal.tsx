interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  workspace: {id: string, name: string} | null;
  onClose: () => void;
  onDelete: () => Promise<void>;
  deleting: boolean;
}

export const DeleteWorkspaceModal = ({ 
  isOpen, 
  workspace, 
  onClose, 
  onDelete, 
  deleting 
}: DeleteWorkspaceModalProps) => {
  if (!isOpen || !workspace) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={() => !deleting && onClose()} />
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Delete Workspace</h3>
          <p className="mt-2 text-sm text-gray-600">
            Are you sure you want to delete &quot;<strong>{workspace.name}</strong>&quot;? 
            This will permanently delete the workspace and all its bases. This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </div>
            ) : (
              'Delete Workspace'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
