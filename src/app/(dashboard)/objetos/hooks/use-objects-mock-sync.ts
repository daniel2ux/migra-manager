"use client";

import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot } from '@/supabase/compat-db-shim';

import { SESSION_KEYS } from '@/lib/constants';

function readMockIdFromStorage(): string | null {
  const raw = sessionStorage.getItem(SESSION_KEYS.DASHBOARD_MOCK);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed === 'all' ? null : parsed;
  } catch {
    return raw === 'all' ? null : raw;
  }
}

/**
 * Sincroniza o mock selecionado via localStorage e escuta
 * status/nome em tempo real no CompatDb.
 */
export function useObjectsMockSync(db: any, selectedProjectId: string | null) {
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);
  const [selectedMockName, setSelectedMockName] = useState<string | null>(null);
  const [isMockLocked, setIsMockLocked] = useState(false);
  const [mocksForProject, setMocksForProject] = useState<any[]>([]);

  // Sincroniza o mockId do sessionStorage ao focar na aba
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateMockId = () => setSelectedMockId(readMockIdFromStorage());
    updateMockId();
    window.addEventListener('focus', updateMockId);
    return () => {
      window.removeEventListener('focus', updateMockId);
    };
  }, []);

  // Escuta lista de mocks do projeto selecionado
  useEffect(() => {
    if (!db || !selectedProjectId) { setMocksForProject([]); return; }
    const unsubscribe = onSnapshot(
      collection(db, 'projects', selectedProjectId, 'mocks'),
      (snap) => setMocksForProject(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (error) => { console.error('[useObjectsMockSync] mocks error:', error); setMocksForProject([]); },
    );
    return () => unsubscribe();
  }, [db, selectedProjectId]);

  // Mock salva no localStorage pode ser de outro projeto — invalida para não consultar subcoleção vazia
  useEffect(() => {
    if (!selectedMockId || !mocksForProject.length) return;
    const belongsToProject = mocksForProject.some((m) => m.id === selectedMockId);
    if (!belongsToProject) {
      setSelectedMockId(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_KEYS.DASHBOARD_MOCK);
      }
    }
  }, [selectedMockId, mocksForProject]);

  // Escuta nome e status de bloqueio do mock selecionado
  useEffect(() => {
    if (!db || !selectedMockId || !selectedProjectId) {
      setSelectedMockName(null);
      setIsMockLocked(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, 'projects', selectedProjectId, 'mocks', selectedMockId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as { name?: string; isLocked?: boolean; status?: string } | undefined;
          if (!data) {
            setSelectedMockName(null);
            setIsMockLocked(false);
            return;
          }
          setSelectedMockName(data.name || null);
          setIsMockLocked((data.isLocked ?? false) || data.status === 'BLOQUEADO');
        } else {
          setSelectedMockName(null);
          setIsMockLocked(false);
        }
      },
      (error) => {
        console.error('[useObjectsMockSync] mock doc error:', error);
        setSelectedMockName(null);
        setIsMockLocked(false);
      },
    );
    return () => unsubscribe();
  }, [selectedMockId, db, selectedProjectId]);

  return { selectedMockId, selectedMockName, isMockLocked };
}
