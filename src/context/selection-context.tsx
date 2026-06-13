'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PROJECT_CHANGED_EVENT } from '@/hooks/use-active-project-id';
import { SESSION_KEYS } from '@/lib/constants';

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
    sessionStorage.getItem(SESSION_KEYS.SEL_PROJECT) ||
    sessionStorage.getItem(SESSION_KEYS.ACTIVE_PROJECT)
  );
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);

  useEffect(() => {
    const savedProject = readInitialProjectId();
    const savedMock = sessionStorage.getItem(SESSION_KEYS.SEL_MOCK);
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

    if (projectId) sessionStorage.setItem(SESSION_KEYS.SEL_PROJECT, projectId);
    else sessionStorage.removeItem(SESSION_KEYS.SEL_PROJECT);

    if (mockId) sessionStorage.setItem(SESSION_KEYS.SEL_MOCK, mockId);
    else sessionStorage.removeItem(SESSION_KEYS.SEL_MOCK);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProjectId(null);
    setSelectedMockId(null);
    sessionStorage.removeItem(SESSION_KEYS.SEL_PROJECT);
    sessionStorage.removeItem(SESSION_KEYS.SEL_MOCK);
    sessionStorage.removeItem(SESSION_KEYS.ACTIVE_PROJECT);
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
