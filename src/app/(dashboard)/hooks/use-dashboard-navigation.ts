import { useEffect, useState, useTransition } from "react";
import { useActiveProjectId, PROJECT_CHANGED_EVENT } from "@/hooks/use-active-project-id";
import { useSessionStorageState } from "@/hooks/use-session-storage-state";
import { SESSION_KEYS } from "@/lib/constants";
import type { Mock, Project } from "@/types/migration";

export function useDashboardNavigation(
  allMocks: Mock[] | undefined,
  _projects: Project[] | undefined,
  _isAdmin: boolean,
) {
  const [, startTransition] = useTransition();
  const { projectId: activeProjectId, updateActiveProject } = useActiveProjectId();

  const [selectedMockId, setSelectedMockId] = useSessionStorageState<string>(
    SESSION_KEYS.DASHBOARD_MOCK,
    "all",
  );
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const selectedProjectId = activeProjectId ?? "all";

  useEffect(() => {
    const onProjectChanged = () => {
      setHasAutoSelected(false);
      setSelectedMockId("all");
    };
    window.addEventListener(PROJECT_CHANGED_EVENT, onProjectChanged);
    return () => window.removeEventListener(PROJECT_CHANGED_EVENT, onProjectChanged);
  }, [setSelectedMockId]);

  useEffect(() => {
    if (selectedProjectId === "all" || !allMocks?.length) return;
    if (selectedMockId === "all") return;
    const mock = allMocks.find((m) => m.id === selectedMockId);
    if (!mock || mock.projectId !== selectedProjectId) {
      setSelectedMockId("all");
      setHasAutoSelected(false);
    }
  }, [selectedProjectId, selectedMockId, allMocks, setSelectedMockId]);

  useEffect(() => {
    if (!allMocks?.length || hasAutoSelected) return;
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
      startTransition(() => {
        setSelectedMockId(runningMock.id);
        setHasAutoSelected(true);
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
        startTransition(() => {
          setSelectedMockId(recentMock.id);
          setHasAutoSelected(true);
        });
      }
    }
  }, [
    allMocks,
    selectedMockId,
    selectedProjectId,
    hasAutoSelected,
    setSelectedMockId,
  ]);

  const handleProjectChange = (id: string) => {
    updateActiveProject(id === "all" ? null : id);
    setSelectedMockId("all");
    setHasAutoSelected(false);
  };

  const handleMockChange = (id: string) => {
    setSelectedMockId(id);
  };

  return {
    selectedProjectId,
    selectedMockId,
    handleProjectChange,
    handleMockChange,
  };
}
