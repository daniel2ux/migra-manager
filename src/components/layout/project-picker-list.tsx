"use client";

import { useMemo } from "react";
import { Check, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterActiveProjects, isProjectInactive } from "@/lib/project-utils";

export type ProjectPickerItem = {
  id: string;
  name?: string;
  company?: string;
  isActive?: boolean;
};

export function useSortedProjects(projects: ProjectPickerItem[] | null | undefined) {
  return useMemo(() => {
    if (!projects?.length) return [];
    return [...projects].sort((a, b) =>
      (a.name ?? a.id).localeCompare(b.name ?? b.id, "pt-BR"),
    );
  }, [projects]);
}

function useProjectPickerDisplay(
  projects: ProjectPickerItem[] | null | undefined,
  showInactive: boolean,
) {
  const sorted = useSortedProjects(projects);
  return useMemo(() => {
    const active = filterActiveProjects(sorted);
    if (!showInactive) return active;
    const inactive = sorted.filter(isProjectInactive);
    return [...active, ...inactive];
  }, [sorted, showInactive]);
}

export function ProjectPickerList({
  projects,
  showInactive,
  currentPid,
  onPick,
  showCurrentCheck = false,
  allowInactiveSelection = false,
}: {
  projects: ProjectPickerItem[] | null | undefined;
  showInactive: boolean;
  currentPid?: string | null;
  onPick: (id: string) => void;
  showCurrentCheck?: boolean;
  /** Quando true, projetos inativos podem ser selecionados (ex.: reativar em /projetos). */
  allowInactiveSelection?: boolean;
}) {
  const displayProjects = useProjectPickerDisplay(projects, showInactive);

  return (
    <ul className="fiori-project-picker-items">
      {displayProjects.map((p) => {
        const inactive = isProjectInactive(p);
        const selectable = !inactive || allowInactiveSelection;
        const isCurrent = showCurrentCheck && currentPid === p.id;
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-current={isCurrent ? "true" : undefined}
              aria-disabled={!selectable || undefined}
              disabled={!selectable}
              className={cn(
                "fiori-project-picker-row",
                isCurrent && "fiori-project-picker-row--current",
                inactive && "fiori-project-picker-row--inactive",
                inactive && allowInactiveSelection && "fiori-project-picker-row--inactive-selectable",
              )}
              onClick={() => {
                if (selectable) onPick(p.id);
              }}
            >
              <FolderKanban className="fiori-project-picker-row-icon" aria-hidden />
              <span className="fiori-project-picker-row-text">
                <span className="fiori-project-picker-row-name">{p.name || p.id}</span>
                {p.company?.trim() ? (
                  <span className="fiori-project-picker-row-meta">{p.company}</span>
                ) : null}
              </span>
              {inactive ? (
                <span className="fiori-project-picker-row-badge">Inativo</span>
              ) : isCurrent ? (
                <Check className="fiori-project-picker-row-check" strokeWidth={2.5} aria-hidden />
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
