import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { useActiveProjectId, PROJECT_CHANGED_EVENT } from "@/hooks/use-active-project-id";
import { safeRouterReplace, useRouterReady } from "@/lib/navigation/safe-router";
import type { Mock, Project } from "@/types/migration";

export function useDashboardNavigation(
  allMocks: Mock[] | undefined,
  _projects: Project[] | undefined,
  _isAdmin: boolean,
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const isRouterReady = useRouterReady();
  const { projectId: activeProjectId, updateActiveProject } = useActiveProjectId();

  const urlMockId = searchParams.get("mockId") || "all";
  const [selectedMockId, setSelectedMockId] = useLocalStorageState<string>(
    "dashboard_last_mock_id",
    urlMockId,
  );
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  /** Mesmo projeto escolhido no popup pós-login e na sidebar. */
  const selectedProjectId = activeProjectId ?? "all";

  useEffect(() => {
    if (urlMockId !== "all") setSelectedMockId(urlMockId);
    else if (!searchParams.get("mockId")) setSelectedMockId("all");
  }, [urlMockId, searchParams, setSelectedMockId]);

  useEffect(() => {
    const onProjectChanged = (e: Event) => {
      const pid = (e as CustomEvent<string | null>).detail;
      setHasAutoSelected(false);
      setSelectedMockId("all");
      if (pid && pid !== "all") {
        try {
          localStorage.setItem("dashboard_last_project_id", JSON.stringify(pid));
        } catch {
          /* quota / private mode */
        }
      }
    };
    window.addEventListener(PROJECT_CHANGED_EVENT, onProjectChanged);
    return () => window.removeEventListener(PROJECT_CHANGED_EVENT, onProjectChanged);
  }, [setSelectedMockId]);

  /** Mock selecionado deve pertencer ao projeto ativo. */
  useEffect(() => {
    if (selectedProjectId === "all" || !allMocks?.length) return;
    if (selectedMockId === "all") return;
    const mock = allMocks.find((m) => m.id === selectedMockId);
    if (!mock || mock.projectId !== selectedProjectId) {
      setSelectedMockId("all");
      setHasAutoSelected(false);
    }
  }, [selectedProjectId, selectedMockId, allMocks, setSelectedMockId]);

  /** Auto-seleciona mock apenas dentro do projeto ativo. */
  useEffect(() => {
    if (!isRouterReady || !allMocks?.length || hasAutoSelected) return;
    if (selectedProjectId === "all") return;

    const projectMocks = allMocks.filter((m) => m.projectId === selectedProjectId);
    if (!projectMocks.length) return;

    const runningMock = projectMocks
      .filter((m: Mock) => m.status === "CARGA_EM_ANDAMENTO" || m.isRunning)
      .sort(
        (a: Mock, b: Mock) =>
          new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime(),
      )[0];

    if (runningMock && selectedMockId === "all") {
      setSelectedMockId(runningMock.id);
      setHasAutoSelected(true);
      const params = new URLSearchParams(searchParams.toString());
      params.set("projectId", selectedProjectId);
      params.set("mockId", runningMock.id);
      startTransition(() => {
        safeRouterReplace(router, `/?${params.toString()}`, { scroll: false });
      });
      return;
    }

    if (selectedMockId === "all") {
      const recentMock = projectMocks.reduce((latest: Mock | null, m: Mock) => {
        if (!latest) return m;
        return new Date(m.startDate || 0).getTime() > new Date(latest.startDate || 0).getTime()
          ? m
          : latest;
      }, null);

      if (recentMock) {
        setSelectedMockId(recentMock.id);
        setHasAutoSelected(true);
        const params = new URLSearchParams(searchParams.toString());
        params.set("projectId", selectedProjectId);
        params.set("mockId", recentMock.id);
        startTransition(() => {
          safeRouterReplace(router, `/?${params.toString()}`, { scroll: false });
        });
      }
    }
  }, [
    isRouterReady,
    allMocks,
    selectedMockId,
    selectedProjectId,
    hasAutoSelected,
    searchParams,
    router,
    setSelectedMockId,
  ]);

  const handleProjectChange = (id: string) => {
    updateActiveProject(id === "all" ? null : id);
    setSelectedMockId("all");
    setHasAutoSelected(false);
  };

  const handleMockChange = (id: string) => {
    setSelectedMockId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (selectedProjectId !== "all") params.set("projectId", selectedProjectId);
    if (id === "all") params.delete("mockId");
    else params.set("mockId", id);
    startTransition(() => {
      safeRouterReplace(router, `/?${params.toString()}`, { scroll: false });
    });
  };

  return {
    selectedProjectId,
    selectedMockId,
    handleProjectChange,
    handleMockChange,
    router,
    searchParams,
  };
}
