import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { BaseExportService } from "@/lib/services/base-export-service";
import { toast } from "sonner";

interface ExportBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseId: string;
  baseName: string;
}

export const ExportBaseModal = ({ isOpen, onClose, baseId, baseName }: ExportBaseModalProps) => {
  const [includeRecords, setIncludeRecords] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportName, setExportName] = useState(baseName);

  // Reset export name when modal opens
  useEffect(() => {
    if (isOpen) {
      setExportName(baseName);
    }
  }, [isOpen, baseName]);

  const handleExport = async () => {
    if (!baseId) return;
    
    setExporting(true);
    const toastId = toast.loading("Exporting base...", {
      description: includeRecords ? "Including records, this may take a moment..." : "Preparing export..."
    });
    
    try {
      const exported = await BaseExportService.exportBase(baseId, includeRecords, exportName.trim() || baseName);
      BaseExportService.downloadAsJson(exported, exportName.trim() || baseName);
      
      toast.success("Base exported successfully!", {
        id: toastId,
        description: `Downloaded ${exportName.trim() || baseName}_export.json`
      });
      
      onClose();
    } catch (error) {
      toast.error("Failed to export base", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Export Base</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            disabled={exporting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Export <span className="font-medium">{baseName}</span> as a JSON file. 
              The export includes all tables, fields, and automations.
            </p>
          </div>

          <div>
            <label htmlFor="exportName" className="block text-sm font-medium text-gray-700 mb-2">
              Export Name (optional)
            </label>
            <input
              type="text"
              id="exportName"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              placeholder={baseName}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={exporting}
            />
            <p className="text-xs text-gray-500 mt-1">
              This name will be used when importing the base. Leave empty to use the current base name.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="includeRecords"
              checked={includeRecords}
              onChange={(e) => setIncludeRecords(e.target.checked)}
              className="mt-1"
              disabled={exporting}
            />
            <div className="flex-1">
              <label htmlFor="includeRecords" className="text-sm font-medium text-gray-700 cursor-pointer">
                Include records
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Export all data records. This will make the file larger but allows for complete backup/restore.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> The exported file can be imported into any workspace to recreate this base.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={exporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Base
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

