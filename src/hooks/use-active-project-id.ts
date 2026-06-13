"use client";

import { useState, useEffect, useCallback } from "react";
import { SESSION_KEYS } from "@/lib/constants";

export const PROJECT_CHANGED_EVENT = "migra_project_changed";

function normalizeProjectId(id: string | null | undefined): string | null {
  if (!id || id === "all") return null;
  return id;
}

function readStoredProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeProjectId(sessionStorage.getItem(SESSION_KEYS.ACTIVE_PROJECT));
}

function persistProjectId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    sessionStorage.setItem(SESSION_KEYS.ACTIVE_PROJECT, id);
    sessionStorage.setItem(SESSION_KEYS.SEL_PROJECT, id);
    sessionStorage.removeItem(SESSION_KEYS.SEL_MOCK);
  } else {
    sessionStorage.removeItem(SESSION_KEYS.ACTIVE_PROJECT);
    sessionStorage.removeItem(SESSION_KEYS.SEL_PROJECT);
    sessionStorage.removeItem(SESSION_KEYS.SEL_MOCK);
  }
}

function broadcastProjectChange(id: string | null): void {
  window.dispatchEvent(new CustomEvent(PROJECT_CHANGED_EVENT, { detail: id }));
}

/**
 * Hook para gerenciar o ID do projeto ativo de forma reativa.
 * Persiste apenas em sessionStorage (por aba) — sem parâmetros na URL.
 */
export function useActiveProjectId() {
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    setProjectId(readStoredProjectId());
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const next = normalizeProjectId((e as CustomEvent<string | null>).detail);
      setProjectId(next);
    };
    window.addEventListener(PROJECT_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PROJECT_CHANGED_EVENT, handler);
  }, []);

  const updateActiveProject = useCallback((id: string | null) => {
    if (typeof window === "undefined") return;

    const normalized = normalizeProjectId(id);
    persistProjectId(normalized);
    setProjectId(normalized);
    broadcastProjectChange(normalized);
  }, []);

  return { projectId, updateActiveProject, isAll: !projectId };
}

/** Helper para atualizar projeto fora de hooks (ex: callbacks) */
export function dispatchProjectChange(id: string | null): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeProjectId(id);
  persistProjectId(normalized);
  broadcastProjectChange(normalized);
}
