"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { CloneMockDialog } from "@/components/mocks/clone-mock-dialog";
import { useUsersData } from "@/hooks/use-users-data";
import { useMocksData } from "@/hooks/use-mocks-data";
import { useMocksActions } from "@/hooks/use-mocks-actions";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { getProjectCompanyName } from "@/lib/migration/project-company";
import {
  isMockCargaInProgress,
  isMockLocked,
  suggestNextMockSequenceFromSource,
  filterActiveMocks,
  isMockInactive,
} from "@/lib/mock-utils";
import { safeRouterReplace, useRouterReady } from "@/lib/navigation/safe-router";
import { Loader2, Layers, AlertCircle } from "lucide-react";
import { AccessDeniedScreen } from "@/components/usuarios";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Mock, UserProfile } from "@/types/migration";

export default function ClonarMockPage() {
  const { projectId } = useActiveProjectId();
  const router = useRouter();
  const isRouterReady = useRouterReady();
  const { toast } = useToast();
  const { isAdmin, isMaster, isProfileLoading, currentUserProfile } = useUsersData("");

  const { mocks, isLoading, projectData, objectsByMock } = useMocksData(projectId);
  const mocksActions = useMocksActions(
    projectId,
    isAdmin,
    currentUserProfile as UserProfile | null,
    isMaster,
  );
  const isProjectLocked = !!projectData?.isLocked;

  useEffect(() => {
    if (!isRouterReady || projectId) return;
    safeRouterReplace(router, "/projetos");
  }, [isRouterReady, projectId, router]);

  const sortedMocks = useMemo(
    () => [...filterActiveMocks(mocks || [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [mocks],
  );

  const nextSequence = useMemo(() => {
    const source = mocksActions.cloneSourceMock;
    if (!source || !mocks) return "01";
    return suggestNextMockSequenceFromSource(source, mocks);
  }, [mocksActions.cloneSourceMock, mocks]);

  const handleOpenClone = (mock: Mock) => {
    if (isMockInactive(mock) || isProjectLocked || isMockLocked(mock) || isMockCargaInProgress(mock)) {
      toast({
        variant: "destructive",
        description: "Esta mock não pode ser clonada no estado atual.",
      });
      return;
    }
    mocksActions.setCloneSourceMock(mock);
    mocksActions.setIsCloneDialogOpen(true);
  };

  if (isProfileLoading || (projectId && isLoading)) {
    return (
      <DashboardShell noPadding>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-SkyBlue-500" />
        </div>
      </DashboardShell>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full">
          <PageHeader variant="fiori" title="Clonar mock" subtitle="Utilitários" backHref="/" />
          <AccessDeniedScreen />
        </div>
      </DashboardShell>
    );
  }

  if (!projectId) {
    return null;
  }

  return (
    <DashboardShell noPadding>
      <div className="flex flex-col flex-1 min-h-[calc(100dvh-4rem)]">
        <PageHeader
          variant="fiori"
          title="Clonar mock"
          subtitle="Duplicação de janelas e objetos no projeto atual"
          icon={<Layers className="w-5 h-5" aria-hidden />}
          empresa={getProjectCompanyName(projectData) ?? undefined}
          projectName={projectData?.name}
          backHref="/mocks"
        />

        <div className="fiori-wizard-body custom-scrollbar">
          <div className="fiori-wizard-inner">
            <section className="fiori-wizard-panel">
              <h2 className="fiori-wizard-panel-title">
                <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Mocks disponíveis para clonagem
              </h2>
              <p className="fiori-wizard-panel-desc">
                Selecione a mock de origem. Os objetos vinculados serão duplicados para uma nova janela
                no mesmo projeto.
              </p>

              {isProjectLocked && (
                <div className="fiori-wizard-warning">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  <div>
                    <p className="fiori-wizard-warning-title">Projeto bloqueado</p>
                    <p className="fiori-wizard-warning-text">
                      Não é possível clonar mocks enquanto o projeto estiver bloqueado.
                    </p>
                  </div>
                </div>
              )}

              {sortedMocks.length > 0 ? (
                <div className="fiori-wizard-chip-grid">
                  {sortedMocks.map((mock) => {
                    const blocked =
                      isProjectLocked || isMockLocked(mock) || isMockCargaInProgress(mock);
                    const objectCount = objectsByMock?.[mock.id]?.length ?? 0;

                    return (
                      <button
                        key={mock.id}
                        type="button"
                        disabled={blocked}
                        onClick={() => handleOpenClone(mock)}
                        className={cn("fiori-chip", blocked && "opacity-50 cursor-not-allowed")}
                        title={
                          blocked
                            ? "Mock bloqueada, em carga ou projeto bloqueado"
                            : `Clonar ${mock.name}`
                        }
                      >
                        <span className="font-semibold">{mock.name}</span>
                        <span className="text-[0.6875rem] font-normal opacity-80">
                          {objectCount} objeto{objectCount !== 1 ? "s" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="fiori-wizard-empty">
                  <AlertCircle className="w-6 h-6 text-[var(--fiori-label)]" aria-hidden />
                  <p>Nenhuma mock encontrada neste projeto.</p>
                </div>
              )}

              <div className="fiori-wizard-footer">
                <Link href="/mocks" className="fiori-wizard-btn fiori-wizard-btn--ghost">
                  Fechar
                </Link>
                <span />
              </div>
            </section>
          </div>
        </div>

        <CloneMockDialog
          open={mocksActions.isCloneDialogOpen}
          onOpenChange={mocksActions.setIsCloneDialogOpen}
          sourceMock={mocksActions.cloneSourceMock}
          nextSequence={nextSequence}
          onConfirm={(data) =>
            mocksActions.handleConfirmClone(mocksActions.cloneSourceMock, data)
          }
        />
      </div>
    </DashboardShell>
  );
}
