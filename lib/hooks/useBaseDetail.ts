import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BaseDetailService } from '../services/base-detail-service';
import type { 
  BaseRow, 
  TableRow, 
  FieldRow, 
  RecordRow, 
  Automation,
  CreateTableData,
  CreateFieldData,
  UpdateCellData,
  SavingCell
} from '../types/base-detail';

export const useBaseDetail = (baseId: string | null) => {
  const router = useRouter();
  
  // State
  const [base, setBase] = useState<BaseRow | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [allFields, setAllFields] = useState<FieldRow[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [savingCell, setSavingCell] = useState<SavingCell>(null);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Load base data
  const loadBase = useCallback(async () => {
    if (!baseId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [baseData, tablesData] = await Promise.all([
        BaseDetailService.getBase(baseId),
        BaseDetailService.getTables(baseId)
      ]);
      
      setBase(baseData);
      setTables(tablesData);
      
      // Select first table if available and no table is currently selected
      if (tablesData.length > 0 && !selectedTableId) {
        setSelectedTableId(tablesData[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load base';
      setError(message);
      console.error('Error loading base:', err);
    } finally {
      setLoading(false);
    }
  }, [baseId]);

  // Load fields for selected table
  const loadFields = useCallback(async (tableId: string) => {
    try {
      setError(null);
      const fieldsData = await BaseDetailService.getFields(tableId);
      setFields(fieldsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load fields';
      setError(message);
      console.error('Error loading fields:', err);
    }
  }, []);

  // Load records for selected table
  const loadRecords = useCallback(async (tableId: string) => {
    try {
      setLoadingRecords(true);
      setError(null);
      const recordsData = await BaseDetailService.getRecords(tableId);
      setRecords(recordsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load records';
      setError(message);
      console.error('Error loading records:', err);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  // Load all fields for base (for automations)
  const loadAllFields = useCallback(async () => {
    if (!baseId) return;
    
    try {
      setError(null);
      const allFieldsData = await BaseDetailService.getAllFields(baseId);
      setAllFields(allFieldsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load all fields';
      setError(message);
      console.error('Error loading all fields:', err);
    }
  }, [baseId]);

  // Load automations
  const loadAutomations = useCallback(async (tableId: string) => {
    try {
      setError(null);
      const automationsData = await BaseDetailService.getAutomations(tableId);
      setAutomations(automationsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load automations';
      setError(message);
      console.error('Error loading automations:', err);
    }
  }, []);

  // Base operations
  const updateBase = useCallback(async (updates: Partial<BaseRow>) => {
    if (!base) return;
    
    try {
      setError(null);
      await BaseDetailService.updateBase(base.id, updates);
      setBase(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update base';
      setError(message);
      throw err;
    }
  }, [base]);

  const deleteBase = useCallback(async () => {
    if (!base) return;
    
    try {
      setError(null);
      await BaseDetailService.deleteBase(base.id);
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete base';
      setError(message);
      throw err;
    }
  }, [base, router]);

  // Table operations
  const createTable = useCallback(async (tableData: CreateTableData) => {
    try {
      setError(null);
      const newTable = await BaseDetailService.createTable(tableData);
      setTables(prev => [...prev, newTable]);
      return newTable;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create table';
      setError(message);
      throw err;
    }
  }, []);

  const updateTable = useCallback(async (tableId: string, updates: Partial<TableRow>) => {
    try {
      setError(null);
      await BaseDetailService.updateTable(tableId, updates);
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update table';
      setError(message);
      throw err;
    }
  }, []);

  const deleteTable = useCallback(async (tableId: string) => {
    try {
      setError(null);
      await BaseDetailService.deleteTable(tableId);
      setTables(prev => prev.filter(t => t.id !== tableId));
      
      // If we deleted the selected table, select another one
      if (selectedTableId === tableId) {
        const remainingTables = tables.filter(t => t.id !== tableId);
        setSelectedTableId(remainingTables.length > 0 ? remainingTables[0].id : null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete table';
      setError(message);
      throw err;
    }
  }, [selectedTableId, tables]);

  // Field operations
  const createField = useCallback(async (fieldData: CreateFieldData) => {
    try {
      setError(null);
      const newField = await BaseDetailService.createField(fieldData);
      setFields(prev => [...prev, newField]);
      return newField;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create field';
      setError(message);
      throw err;
    }
  }, []);

  const updateField = useCallback(async (fieldId: string, updates: Partial<FieldRow>) => {
    try {
      setError(null);
      await BaseDetailService.updateField(fieldId, updates);
      setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update field';
      setError(message);
      throw err;
    }
  }, []);

  const deleteField = useCallback(async (fieldId: string) => {
    try {
      setError(null);
      await BaseDetailService.deleteField(fieldId);
      setFields(prev => prev.filter(f => f.id !== fieldId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete field';
      setError(message);
      throw err;
    }
  }, []);

  // Record operations
  const createRecord = useCallback(async (values: Record<string, unknown> = {}) => {
    if (!selectedTableId) return;
    
    try {
      setError(null);
      const newRecord = await BaseDetailService.createRecord(selectedTableId, values);
      setRecords(prev => [newRecord, ...prev]);
      return newRecord;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create record';
      setError(message);
      throw err;
    }
  }, [selectedTableId]);

  const updateRecord = useCallback(async (recordId: string, values: Record<string, unknown>) => {
    try {
      setError(null);
      await BaseDetailService.updateRecord(recordId, values);
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, values } : r));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update record';
      setError(message);
      throw err;
    }
  }, []);

  const deleteRecord = useCallback(async (recordId: string) => {
    try {
      setError(null);
      await BaseDetailService.deleteRecord(recordId);
      setRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete record';
      setError(message);
      throw err;
    }
  }, []);

  const updateCell = useCallback(async (recordId: string, fieldId: string, value: unknown) => {
    try {
      setSavingCell({ recordId, fieldId });
      setError(null);
      
      await BaseDetailService.updateCell(recordId, fieldId, value);
      
      // Update local state
      setRecords(prev => prev.map(record => 
        record.id === recordId 
          ? { ...record, values: { ...record.values, [fieldId]: value } }
          : record
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update cell';
      setError(message);
      throw err;
    } finally {
      setSavingCell(null);
    }
  }, []);

  // Automation operations
  const createAutomation = useCallback(async (automation: Omit<Automation, 'id' | 'created_at'>) => {
    try {
      setError(null);
      const newAutomation = await BaseDetailService.createAutomation(automation);
      setAutomations(prev => [...prev, newAutomation]);
      return newAutomation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create automation';
      setError(message);
      throw err;
    }
  }, []);

  const updateAutomation = useCallback(async (automationId: string, updates: Partial<Automation>) => {
    try {
      setError(null);
      await BaseDetailService.updateAutomation(automationId, updates);
      setAutomations(prev => prev.map(a => a.id === automationId ? { ...a, ...updates } : a));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update automation';
      setError(message);
      throw err;
    }
  }, []);

  const deleteAutomation = useCallback(async (automationId: string) => {
    try {
      setError(null);
      await BaseDetailService.deleteAutomation(automationId);
      setAutomations(prev => prev.filter(a => a.id !== automationId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete automation';
      setError(message);
      throw err;
    }
  }, []);

  const toggleAutomation = useCallback(async (automationId: string) => {
    const automation = automations.find(a => a.id === automationId);
    if (!automation) return;
    
    try {
      await updateAutomation(automationId, { enabled: !automation.enabled });
    } catch (err) {
      console.error('Error toggling automation:', err);
    }
  }, [automations, updateAutomation]);

  // Initialize data
  useEffect(() => {
    if (baseId) {
      loadBase();
      loadAllFields();
    }
  }, [baseId, loadBase, loadAllFields]);

  // Load fields, records, and automations when table changes
  useEffect(() => {
    if (selectedTableId) {
      loadFields(selectedTableId);
      loadRecords(selectedTableId);
      loadAutomations(selectedTableId);
    }
  }, [selectedTableId, loadFields, loadRecords, loadAutomations]);

  return {
    // State
    base,
    tables,
    selectedTableId,
    fields,
    records,
    automations,
    allFields,
    loading,
    loadingRecords,
    savingCell,
    error,
    
    // Setters
    setSelectedTableId,
    setError,
    
    // Operations
    updateBase,
    deleteBase,
    createTable,
    updateTable,
    deleteTable,
    createField,
    updateField,
    deleteField,
    createRecord,
    updateRecord,
    deleteRecord,
    updateCell,
    
    // Refresh functions
    loadBase,
    loadFields,
    loadRecords,
    loadAllFields,
    loadAutomations,
    
    // Automation operations
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
  };
};
