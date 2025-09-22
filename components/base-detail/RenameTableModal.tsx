import { useState, useEffect } from "react";
import { X, Edit2 } from "lucide-react";

interface RenameTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRenameTable: (newName: string) => void;
  currentName: string;
}

export const RenameTableModal = ({ isOpen, onClose, onRenameTable, currentName }: RenameTableModalProps) => {
  const [newName, setNewName] = useState(currentName);
  const [isRenaming, setIsRenaming] = useState(false);

  // Update the input value when currentName changes
  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
    }
  }, [isOpen, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim() || newName.trim() === currentName) {
      handleClose();
      return;
    }
    
    setIsRenaming(true);
    try {
      await onRenameTable(newName.trim());
      handleClose();
    } catch (err) {
      console.error('Error renaming table:', err);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleClose = () => {
    setNewName(currentName);
    setIsRenaming(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
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
            <div className="p-2 bg-green-100 rounded-lg">
              <Edit2 size={20} className="text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Rename Table</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6" onKeyDown={handleKeyPress}>
          <div className="space-y-4">
            <div>
              <label htmlFor="newName" className="block text-sm font-medium text-gray-700 mb-2">
                New Table Name
              </label>
              <input
                id="newName"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new table name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                required
                disabled={isRenaming}
              />
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Current name:</span> {currentName}
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isRenaming}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || newName.trim() === currentName || isRenaming}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isRenaming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Renaming...
                </>
              ) : (
                <>
                  <Edit2 size={16} />
                  Rename Table
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
