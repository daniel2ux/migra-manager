"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { safeRouterReplace } from "@/lib/navigation/safe-router";

const STORAGE_KEY = "migra_last_selected_project";
const SELECTION_PROJECT_KEY = "migra_sel_project";
const SELECTION_MOCK_KEY = "migra_sel_mock";
export const PROJECT_CHANGED_EVENT = "migra_project_changed";

function normalizeProjectId(id: string | null | undefined): string | null {
  if (!id || id === "all") return null;
  return id;
}

function readStoredProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeProjectId(sessionStorage.getItem(STORAGE_KEY));
}

function persistProjectId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    sessionStorage.setItem(STORAGE_KEY, id);
    sessionStorage.setItem(SELECTION_PROJECT_KEY, id);
    sessionStorage.removeItem(SELECTION_MOCK_KEY);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SELECTION_PROJECT_KEY);
    sessionStorage.removeItem(SELECTION_MOCK_KEY);
  }
}

function broadcastProjectChange(id: string | null): void {
  window.dispatchEvent(new CustomEvent(PROJECT_CHANGED_EVENT, { detail: id }));
}

/**
 * Hook para gerenciar o ID do projeto ativo de forma reativa.
 * Sincroniza entre URL, SessionStorage e eventos customizados.
 */
export function useActiveProjectId() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlProjectId = normalizeProjectId(searchParams?.get("projectId"));

  const [projectId, setProjectId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return urlProjectId ?? readStoredProjectId();
  });

  useEffect(() => {
    if (urlProjectId) {
      setProjectId(urlProjectId);
      persistProjectId(urlProjectId);
    }
  }, [urlProjectId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const next = normalizeProjectId((e as CustomEvent<string | null>).detail);
      setProjectId(next);
    };
    window.addEventListener(PROJECT_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PROJECT_CHANGED_EVENT, handler);
  }, []);

  const updateActiveProject = useCallback(
    (id: string | null) => {
      if (typeof window === "undefined") return;

      const normalized = normalizeProjectId(id);
      persistProjectId(normalized);
      setProjectId(normalized);

      // Notifica sidebar, dashboard e SelectionContext antes da navegação
      broadcastProjectChange(normalized);

      const base = pathname || "/";
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const prevProjectId = params.get("projectId");
      if (normalized) {
        params.set("projectId", normalized);
        if (prevProjectId !== normalized) params.delete("mockId");
      } else {
        params.delete("projectId");
        params.delete("mockId");
      }
      const qs = params.toString();
      safeRouterReplace(router, qs ? `${base}?${qs}` : base, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { projectId, updateActiveProject, isAll: !projectId };
}

/**
 * Helper para atualizar projeto fora de hooks (ex: callbacks)
 */
export function dispatchProjectChange(id: string | null): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeProjectId(id);
  persistProjectId(normalized);
  broadcastProjectChange(normalized);
}
