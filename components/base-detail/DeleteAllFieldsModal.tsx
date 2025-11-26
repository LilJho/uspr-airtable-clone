import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface DeleteAllFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteAllFields: () => void;
  fieldCount: number;
  tableName: string;
}

export const DeleteAllFieldsModal = ({ 
  isOpen, 
  onClose, 
  onDeleteAllFields, 
  fieldCount,
  tableName 
}: DeleteAllFieldsModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteAllFields();
      handleClose();
    } catch (error) {
      console.error('Error deleting all fields:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return; // Prevent closing while deleting
    setIsDeleting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Delete All Fields</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <span className="font-semibold text-gray-900">{fieldCount}</span> {fieldCount === 1 ? 'field' : 'fields'} from the table <span className="font-semibold text-gray-900">&quot;{tableName}&quot;</span>?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 mb-1">Warning</h4>
                  <p className="text-sm text-red-700">
                    This action cannot be undone. All data in these fields will be permanently deleted. This will remove all columns from your table.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              `Delete All ${fieldCount} ${fieldCount === 1 ? 'Field' : 'Fields'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

