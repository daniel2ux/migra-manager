"use client";

import { useCallback, useState } from "react";
import { doc, serverTimestamp, type CompatDb } from "@/supabase/compat-db-shim";
import { updateDoc } from "@/supabase/query-builder";
import { updateDocumentNonBlocking } from "@/supabase/mutations";
import {
  resolveProjectExecutionStatus,
  type ProjectExecutionStatus,
} from "@/components/projetos";
import type { Project } from "@/types/migration";
import type { useToast } from "@/hooks/use-toast";

type ToastFn = ReturnType<typeof useToast>["toast"];

export function useProjectStatusActions({
  db,
  canEdit,
  activeProjectId,
  updateActiveProject,
  toast,
}: {
  db: CompatDb | null;
  canEdit: boolean;
  activeProjectId: string | null;
  updateActiveProject: (id: string | null) => void;
  toast: ToastFn;
}) {
  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);

  const changeProjectStatus = useCallback(
    async (project: Project, newStatus: ProjectExecutionStatus) => {
      if (!canEdit || project.isLocked || !db) return;
      setStatusTogglingId(project.id);
      try {
        const projectRef = doc(db, "projects", project.id);
        await updateDocumentNonBlocking(projectRef, {
          executionStatus: newStatus,
          updatedAt: serverTimestamp(),
        });
      } catch {
        toast({ variant: "destructive", description: "Erro ao alterar status do projeto." });
      } finally {
        setStatusTogglingId(null);
      }
    },
    [canEdit, db, toast],
  );

  const handleToggleActive = useCallback(
    async (project: Project, activate: boolean, hasMocksInProgress: boolean) => {
      if (!canEdit || project.isLocked || !db) return;
      if (!activate) {
        const current = resolveProjectExecutionStatus(project, hasMocksInProgress);
        if (current === "EM_EXECUCAO" || hasMocksInProgress) {
          toast({
            variant: "destructive",
            description: "Não é possível inativar um projeto em execução.",
          });
          return;
        }
      }
      setStatusTogglingId(project.id);
      try {
        const projectRef = doc(db, "projects", project.id);
        await updateDoc(projectRef, {
          isActive: activate,
          updatedAt: serverTimestamp(),
        });
        if (!activate && project.id === activeProjectId) {
          updateActiveProject(null);
        }
        toast({
          description: activate
            ? `Projeto ${project.name} reativado.`
            : `Projeto ${project.name} inativado.`,
        });
      } catch (err) {
        const message =
          err instanceof Error && err.message.includes("is_active")
            ? "Coluna is_active ausente no banco. Aplique a migration de projetos inativos."
            : "Erro ao alterar status do projeto.";
        toast({ variant: "destructive", description: message });
      } finally {
        setStatusTogglingId(null);
      }
    },
    [canEdit, db, activeProjectId, updateActiveProject, toast],
  );

  return {
    statusTogglingId,
    changeProjectStatus,
    handleToggleActive,
  };
}
