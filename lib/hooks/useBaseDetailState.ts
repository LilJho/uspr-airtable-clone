import { useState, useCallback } from 'react';
import type { ViewMode, TopTab, SortDirection, Condition } from '../types/base-detail';

export const useBaseDetailState = () => {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [topTab, setTopTab] = useState<TopTab>('data');
  
  // Sort & filter state
  const [sortFieldId, setSortFieldId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterFieldId, setFilterFieldId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>("");
  
  // Modal states
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isCreateFieldModalOpen, setIsCreateFieldModalOpen] = useState(false);
  const [isEditFieldModalOpen, setIsEditFieldModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
  const [isRenameTableModalOpen, setIsRenameTableModalOpen] = useState(false);
  const [isDeleteTableModalOpen, setIsDeleteTableModalOpen] = useState(false);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Form states
  const [tableFormName, setTableFormName] = useState("");
  const [fieldFormName, setFieldFormName] = useState("");
  const [fieldFormType, setFieldFormType] = useState<'text' | 'number' | 'date' | 'email' | 'single_select'>("text");
  
  // Editing states
  const [isEditingFieldId, setIsEditingFieldId] = useState<string | null>(null);
  const [isEditingTableId, setIsEditingTableId] = useState<string | null>(null);
  
  // Dropdown states
  const [isCreateNewDropdownOpen, setIsCreateNewDropdownOpen] = useState(false);
  
  // Automation states
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);
  const [activeAutomation, setActiveAutomation] = useState<{ 
    trigger: { 
      label: string; 
      config: { 
        table_id: string | null; 
        conditions: Condition[] 
      } 
    }; 
    actions: { 
      id: string; 
      label: string; 
      target: string 
    }[] 
  }>({
    trigger: { label: 'When a record matches conditions', config: { table_id: null, conditions: [] } },
    actions: [
      { id: 'a-1', label: 'Create record', target: 'Listings Workflow' },
      { id: 'a-2', label: 'Create record', target: 'Buyers Workflow' },
    ],
  });
  const [isTriggerPanelOpen, setIsTriggerPanelOpen] = useState(false);
  const [triggerFields, setTriggerFields] = useState<unknown[]>([]);
  const [triggerTestResult, setTriggerTestResult] = useState<{ ok: boolean; record?: unknown | null }>({ ok: false });

  // Modal helpers
  const openRenameModal = useCallback(() => {
    setIsRenameModalOpen(true);
  }, []);

  const closeRenameModal = useCallback(() => {
    setIsRenameModalOpen(false);
  }, []);

  const openFieldModal = useCallback(() => {
    setIsFieldModalOpen(true);
  }, []);

  const closeFieldModal = useCallback(() => {
    setIsFieldModalOpen(false);
    setIsEditingFieldId(null);
    setFieldFormName("");
    setFieldFormType("text");
  }, []);

  const openCreateFieldModal = useCallback(() => {
    setIsCreateFieldModalOpen(true);
  }, []);

  const closeCreateFieldModal = useCallback(() => {
    setIsCreateFieldModalOpen(false);
  }, []);

  const openEditFieldModal = useCallback(() => {
    setIsEditFieldModalOpen(true);
  }, []);

  const closeEditFieldModal = useCallback(() => {
    setIsEditFieldModalOpen(false);
  }, []);

  const openTableModal = useCallback(() => {
    setIsTableModalOpen(true);
  }, []);

  const closeTableModal = useCallback(() => {
    setIsTableModalOpen(false);
    setIsEditingTableId(null);
    setTableFormName("");
  }, []);

  const openAutomationModal = useCallback(() => {
    setIsAutomationModalOpen(true);
  }, []);

  const closeAutomationModal = useCallback(() => {
    setIsAutomationModalOpen(false);
  }, []);

  const openImportModal = useCallback(() => {
    setIsImportModalOpen(true);
  }, []);

  const closeImportModal = useCallback(() => {
    setIsImportModalOpen(false);
  }, []);

  const openCreateTableModal = useCallback(() => {
    setIsCreateTableModalOpen(true);
  }, []);

  const closeCreateTableModal = useCallback(() => {
    setIsCreateTableModalOpen(false);
  }, []);

  const openRenameTableModal = useCallback(() => {
    setIsRenameTableModalOpen(true);
  }, []);

  const closeRenameTableModal = useCallback(() => {
    setIsRenameTableModalOpen(false);
  }, []);

  const openDeleteTableModal = useCallback(() => {
    setIsDeleteTableModalOpen(true);
  }, []);

  const closeDeleteTableModal = useCallback(() => {
    setIsDeleteTableModalOpen(false);
  }, []);

  // Sort helpers
  const toggleSort = useCallback((fieldId: string) => {
    if (sortFieldId === fieldId) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortFieldId(fieldId);
      setSortDirection('asc');
    }
  }, [sortFieldId]);

  const clearSort = useCallback(() => {
    setSortFieldId(null);
    setSortDirection('asc');
  }, []);

  // Filter helpers
  const setFilter = useCallback((fieldId: string | null, query: string) => {
    setFilterFieldId(fieldId);
    setFilterQuery(query);
  }, []);

  const clearFilter = useCallback(() => {
    setFilterFieldId(null);
    setFilterQuery("");
  }, []);

  return {
    // View state
    viewMode,
    topTab,
    
    // Sort & filter state
    sortFieldId,
    sortDirection,
    filterFieldId,
    filterQuery,
    
    // Modal states
    isRenameModalOpen,
    isFieldModalOpen,
    isCreateFieldModalOpen,
    isEditFieldModalOpen,
    isTableModalOpen,
    isCreateTableModalOpen,
    isRenameTableModalOpen,
    isDeleteTableModalOpen,
    isAutomationModalOpen,
    isImportModalOpen,
    
    // Form states
    tableFormName,
    fieldFormName,
    fieldFormType,
    
    // Editing states
    isEditingFieldId,
    isEditingTableId,
    
    // Dropdown states
    isCreateNewDropdownOpen,
    
    // Automation states
    isHelpExpanded,
    activeAutomation,
    isTriggerPanelOpen,
    triggerFields,
    triggerTestResult,
    
    // Setters
    setViewMode,
    setTopTab,
    setSortFieldId,
    setSortDirection,
    setFilterFieldId,
    setFilterQuery,
    setTableFormName,
    setFieldFormName,
    setFieldFormType,
    setIsEditingFieldId,
    setIsEditingTableId,
    setIsCreateNewDropdownOpen,
    setIsHelpExpanded,
    setActiveAutomation,
    setIsTriggerPanelOpen,
    setTriggerFields,
    setTriggerTestResult,
    
    // Helper methods
    openRenameModal,
    closeRenameModal,
    openFieldModal,
    closeFieldModal,
    openCreateFieldModal,
    closeCreateFieldModal,
    openEditFieldModal,
    closeEditFieldModal,
    openTableModal,
    closeTableModal,
    openCreateTableModal,
    closeCreateTableModal,
    openRenameTableModal,
    closeRenameTableModal,
    openDeleteTableModal,
    closeDeleteTableModal,
    openAutomationModal,
    closeAutomationModal,
    openImportModal,
    closeImportModal,
    toggleSort,
    clearSort,
    setFilter,
    clearFilter,
  };
};
