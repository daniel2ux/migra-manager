"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { BackupManager, type BackupManagerHandle } from "@/components/backup/backup-manager";
import { useUsersData } from "@/hooks/use-users-data";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { useFirestore, useDoc, useMemoFirebase } from "@/supabase";
import { doc } from "firebase/firestore";
import { getProjectCompanyName } from "@/lib/migration/project-company";
import { safeRouterReplace, useRouterReady } from "@/lib/navigation/safe-router";
import { AccessDeniedScreen } from "@/components/usuarios";
import { Button } from "@/components/ui/button";
import { HardDrive, Loader2, RefreshCw } from "lucide-react";
import type { Project } from "@/types/migration";

const PAGE_TOOLBAR_BTN_LABELED =
  "fiori-toolbar-btn fiori-toolbar-btn--labeled !rounded-[0.375rem] !h-8 min-h-0 !w-auto !px-2.5";

export default function BackupPage() {
  const { isMaster, isProfileLoading } = useUsersData("");
  const { projectId } = useActiveProjectId();
  const router = useRouter();
  const isRouterReady = useRouterReady();
  const db = useFirestore();
  const backupRef = useRef<BackupManagerHandle>(null);
  const [isRefreshingList, setIsRefreshingList] = useState(false);

  const projectRef = useMemoFirebase(
    () => (db && projectId ? doc(db, "projects", projectId) : null),
    [db, projectId],
  );
  const { data: projectData } = useDoc<Project>(projectRef);

  useEffect(() => {
    if (!isRouterReady || projectId) return;
    safeRouterReplace(router, "/projetos");
  }, [isRouterReady, projectId, router]);

  if (isProfileLoading) {
    return (
      <DashboardShell noPadding>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-SkyBlue-500" />
        </div>
      </DashboardShell>
    );
  }

  if (!isMaster) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full">
          <PageHeader variant="fiori" title="Backup & restore" subtitle="Utilitários" backHref="/" />
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
          title="Backup & restore"
          subtitle="Exportação e restauração completa dos dados do Firestore"
          icon={<HardDrive className="w-5 h-5" aria-hidden />}
          empresa={getProjectCompanyName(projectData) ?? undefined}
          projectName={projectData?.name}
          backHref="/"
          actions={
            <div className="fiori-toolbar">
              <Button
                type="button"
                variant="ghost"
                asChild
                className={PAGE_TOOLBAR_BTN_LABELED}
              >
                <Link href="/" aria-label="Cancelar e voltar">
                  Cancelar
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => backupRef.current?.refresh()}
                disabled={isRefreshingList}
                className={PAGE_TOOLBAR_BTN_LABELED}
                aria-label="Atualizar lista de backups"
              >
                {isRefreshingList ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="w-4 h-4 shrink-0" aria-hidden />
                )}
                <span>Atualizar</span>
              </Button>
            </div>
          }
        />
        <div className="fiori-wizard-body custom-scrollbar">
          <div className="fiori-wizard-inner">
            <section className="fiori-wizard-panel">
              <BackupManager
                ref={backupRef}
                projectId={projectId}
                projectName={projectData?.name}
                onLoadingListChange={setIsRefreshingList}
              />
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
