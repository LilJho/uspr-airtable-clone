"use client";
import { useState, useCallback, useRef } from "react";
import { X, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import type { FieldRow } from "@/lib/types/base-detail";

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: { 
    file: File; 
    fieldMappings: Record<string, string | { type: 'create', fieldType: string, fieldName: string }> 
  }) => Promise<{ imported: number; errors: string[] }>;
  fields: FieldRow[];
  tableName: string;
}

interface CsvColumn {
  index: number;
  header: string;
  sampleValue: string;
}

export const ImportCsvModal = ({
  isOpen,
  onClose,
  onImport,
  fields,
  tableName
}: ImportCsvModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<CsvColumn[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string | { type: 'create', fieldType: string, fieldName: string }>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'success'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    
    // Parse CSV to get column headers and sample data
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setError('CSV file must have at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map((header, index) => ({
        index,
        header: header.trim().replace(/"/g, ''),
        sampleValue: lines[1]?.split(',')[index]?.trim().replace(/"/g, '') || ''
      }));

      setCsvColumns(headers);
      setStep('mapping');
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleMappingChange = useCallback((csvColumn: string, fieldId: string | 'create') => {
    if (fieldId === 'create') {
      // Initialize with default values for creating a new field
      setFieldMappings(prev => ({
        ...prev,
        [csvColumn]: { type: 'create', fieldType: 'text', fieldName: csvColumn }
      }));
    } else {
      setFieldMappings(prev => ({
        ...prev,
        [csvColumn]: fieldId
      }));
    }
  }, []);

  const handleCreateFieldTypeChange = useCallback((csvColumn: string, fieldType: string) => {
    setFieldMappings(prev => {
      const current = prev[csvColumn];
      if (typeof current === 'object' && current.type === 'create') {
        return {
          ...prev,
          [csvColumn]: { ...current, fieldType }
        };
      }
      return prev;
    });
  }, []);

  const handleCreateFieldNameChange = useCallback((csvColumn: string, fieldName: string) => {
    setFieldMappings(prev => {
      const current = prev[csvColumn];
      if (typeof current === 'object' && current.type === 'create') {
        return {
          ...prev,
          [csvColumn]: { ...current, fieldName }
        };
      }
      return prev;
    });
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setStep('importing');

    try {
      await onImport({ file, fieldMappings });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('mapping');
    } finally {
      setIsProcessing(false);
    }
  }, [file, fieldMappings, onImport]);

  const handleClose = useCallback(() => {
    setFile(null);
    setCsvColumns([]);
    setFieldMappings({});
    setError(null);
    setStep('upload');
    onClose();
  }, [onClose]);

  const handleReset = useCallback(() => {
    setFile(null);
    setCsvColumns([]);
    setFieldMappings({});
    setError(null);
    setStep('upload');
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Import CSV to {tableName}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h3>
                <p className="text-gray-500 mb-6">
                  Select a CSV file to import data into your table. The first row should contain column headers.
                </p>
              </div>

              <div
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
              >
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">Drag and drop your CSV file here, or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Map CSV Columns to Fields</h3>
                <p className="text-gray-500 mb-6">
                  Match your CSV columns with the table fields. Unmapped columns will be ignored.
                </p>
              </div>

              <div className="space-y-4">
                {csvColumns.map((column) => {
                  const mapping = fieldMappings[column.header];
                  const isCreateNew = typeof mapping === 'object' && mapping.type === 'create';
                  const existingFieldId = typeof mapping === 'string' ? mapping : '';
                  
                  return (
                    <div key={column.index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{column.header}</div>
                          <div className="text-sm text-gray-500">Sample: {column.sampleValue}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">→</span>
                          <select
                            value={isCreateNew ? 'create' : existingFieldId}
                            onChange={(e) => handleMappingChange(column.header, e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Skip this column</option>
                            <option value="create">Create new field</option>
                            {fields.map((field) => (
                              <option key={field.id} value={field.id}>
                                {field.name} ({field.type})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {/* Show field creation options when "Create new field" is selected */}
                      {isCreateNew && (
                        <div className="flex items-center gap-4 pl-4 border-l-2 border-blue-200">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Field Name
                            </label>
                            <input
                              type="text"
                              value={mapping.fieldName}
                              onChange={(e) => handleCreateFieldNameChange(column.header, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter field name"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Field Type
                            </label>
                            <select
                              value={mapping.fieldType}
                              onChange={(e) => handleCreateFieldTypeChange(column.header, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="email">Email</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="single_select">Single Select</option>
                              <option value="multi_select">Multi Select</option>
                              <option value="link">Link</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Data...</h3>
              <p className="text-gray-500">Please wait while we process your CSV file.</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Successful!</h3>
              <p className="text-gray-500 mb-6">Your CSV data has been imported into the table.</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${step === 'upload' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`w-2 h-2 rounded-full ${step === 'mapping' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`w-2 h-2 rounded-full ${step === 'importing' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            </div>
            
            <div className="flex items-center gap-3">
              {step === 'mapping' && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Back
                </button>
              )}
              {step === 'mapping' && (
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? 'Importing...' : 'Import Data'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
