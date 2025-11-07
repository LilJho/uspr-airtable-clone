import { useState, useRef } from "react";
import { X, Upload } from "lucide-react";
import { BaseImportService } from "@/lib/services/base-import-service";
import { toast } from "sonner";

interface ImportBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onImportComplete?: (baseId: string) => void;
}

export const ImportBaseModal = ({ isOpen, onClose, workspaceId, onImportComplete }: ImportBaseModalProps) => {
  const [importing, setImporting] = useState(false);
  const [baseName, setBaseName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        toast.error("Invalid file type", {
          description: "Please select a JSON file exported from this application"
        });
        return;
      }
      setSelectedFile(file);
      
      // Try to read the file to get the base name
      BaseImportService.parseExportFile(file)
        .then((exported) => {
          if (exported.base?.name) {
            setBaseName(exported.base.name);
          }
        })
        .catch(() => {
          // Ignore errors during preview
        });
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("No file selected", {
        description: "Please select a JSON file to import"
      });
      return;
    }

    if (!workspaceId) {
      toast.error("No workspace selected", {
        description: "Please select a workspace first"
      });
      return;
    }

    setImporting(true);
    const toastId = toast.loading("Importing base...", {
      description: "This may take a moment..."
    });

    try {
      const exported = await BaseImportService.parseExportFile(selectedFile);
      const newBaseId = await BaseImportService.importBase(
        exported,
        workspaceId,
        baseName || undefined
      );

      toast.success("Base imported successfully!", {
        id: toastId,
        description: `Base "${baseName || exported.base.name}" has been created`
      });

      // Reset form
      setSelectedFile(null);
      setBaseName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onClose();
      
      if (onImportComplete) {
        onImportComplete(newBaseId);
      }
    } catch (error) {
      toast.error("Failed to import base", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Import Base</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={importing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="baseName" className="block text-sm font-medium text-gray-700 mb-2">
              Base Name (optional)
            </label>
            <input
              type="text"
              id="baseName"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="Leave empty to use name from export"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={importing}
            />
            <p className="text-xs text-gray-500 mt-1">
              If left empty, the original base name from the export will be used
            </p>
          </div>

          <div>
            <label htmlFor="fileInput" className="block text-sm font-medium text-gray-700 mb-2">
              Select Export File
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                id="fileInput"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
                disabled={importing}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </button>
              {selectedFile && (
                <span className="text-sm text-gray-600 truncate flex-1">
                  {selectedFile.name}
                </span>
              )}
            </div>
            {!selectedFile && (
              <p className="text-xs text-gray-500 mt-1">
                Select a JSON file exported from this application
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> The import will recreate all tables, fields, and automations. 
              Records will be imported if they were included in the export.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !selectedFile}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Base
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

