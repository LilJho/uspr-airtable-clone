import { useState } from "react";
import { X, Database } from "lucide-react";

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTable: (tableName: string) => void;
}

export const CreateTableModal = ({ isOpen, onClose, onCreateTable }: CreateTableModalProps) => {
  const [tableName, setTableName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tableName.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreateTable(tableName.trim());
      handleClose();
    } catch (err) {
      console.error('Error creating table:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setTableName("");
    setIsCreating(false);
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Table</h2>
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
              <label htmlFor="tableName" className="block text-sm font-medium text-gray-700 mb-2">
                Table Name
              </label>
              <input
                id="tableName"
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Enter table name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                required
                disabled={isCreating}
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                A new table will be created with default fields (Name, Notes, etc.) that you can customize later.
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!tableName.trim() || isCreating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database size={16} />
                  Create Table
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
