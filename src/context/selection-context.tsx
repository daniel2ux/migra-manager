'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PROJECT_CHANGED_EVENT } from '@/hooks/use-active-project-id';

interface SelectionContextType {
  selectedProjectId: string | null;
  selectedMockId: string | null;
  setSelection: (projectId: string | null, mockId: string | null) => void;
  clearSelection: () => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

function readInitialProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem('migra_sel_project') ||
    sessionStorage.getItem('migra_last_selected_project')
  );
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);

  useEffect(() => {
    const savedProject = readInitialProjectId();
    const savedMock = sessionStorage.getItem('migra_sel_mock');
    if (savedProject) setSelectedProjectId(savedProject);
    if (savedMock) setSelectedMockId(savedMock);
  }, []);

  useEffect(() => {
    const onProjectChanged = (e: Event) => {
      const pid = (e as CustomEvent<string | null>).detail;
      setSelectedProjectId(pid && pid !== 'all' ? pid : null);
      setSelectedMockId(null);
    };
    window.addEventListener(PROJECT_CHANGED_EVENT, onProjectChanged);
    return () => window.removeEventListener(PROJECT_CHANGED_EVENT, onProjectChanged);
  }, []);

  const setSelection = useCallback((projectId: string | null, mockId: string | null) => {
    setSelectedProjectId(projectId);
    setSelectedMockId(mockId);

    if (projectId) sessionStorage.setItem('migra_sel_project', projectId);
    else sessionStorage.removeItem('migra_sel_project');

    if (mockId) sessionStorage.setItem('migra_sel_mock', mockId);
    else sessionStorage.removeItem('migra_sel_mock');
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProjectId(null);
    setSelectedMockId(null);
    sessionStorage.removeItem('migra_sel_project');
    sessionStorage.removeItem('migra_sel_mock');
  }, []);

  return (
    <SelectionContext.Provider value={{ selectedProjectId, selectedMockId, setSelection, clearSelection }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
