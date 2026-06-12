"use client";

import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Layers, Loader2, Plus, ShieldAlert } from "lucide-react";
import { ActivityGroupsManager } from "@/components/configuracoes/activity-groups-manager";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { getProjectCompanyName } from "@/lib/migration/project-company";
import type { Project } from "@/types/migration";

const PAGE_TOOLBAR_BTN =
  "fiori-toolbar-btn fiori-toolbar-btn--labeled !rounded-[0.375rem] !h-8 min-h-0 !w-auto !px-2.5";

export default function GruposAtividadePage() {
  const db = useFirestore();
  const { user } = useUser();
  const { projectId } = useActiveProjectId();

  const userDocRef = useMemoFirebase(
    () => (user && db ? doc(db, "users", user.uid) : null),
    [db, user],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<{
    isMaster?: boolean;
    role?: string;
  }>(userDocRef);

  const projectRef = useMemoFirebase(
    () => (db && projectId ? doc(db, "projects", projectId) : null),
    [db, projectId],
  );
  const { data: projectData } = useDoc<Project>(projectRef);

  const isAdminOrMaster =
    userProfile?.isMaster ||
    userProfile?.role?.toLowerCase() === "admin" ||
    userProfile?.role?.toLowerCase() === "master";

  if (isProfileLoading) {
    return (
      <DashboardShell noPadding>
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0070f2]" aria-hidden />
        </div>
      </DashboardShell>
    );
  }

  if (!isAdminOrMaster) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col flex-1 min-h-[calc(100dvh-4rem)]">
          <PageHeader
            variant="fiori"
            title="Grupos de atividade"
            subtitle="Acesso restrito"
            icon={<Layers className="w-5 h-5" aria-hidden />}
            empresa={getProjectCompanyName(projectData) ?? undefined}
            projectName={projectData?.name}
            backHref="/"
          />
          <div className="flex flex-1 items-center justify-center p-8">
            <div
              role="alert"
              className="flex max-w-md w-full items-start gap-3 rounded border border-[#fecaca] bg-[#fef2f2] p-4"
            >
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#bb0000]" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-[#32363a]">Acesso restrito</p>
                <p className="mt-1 text-xs text-[#6a6d70]">
                  Esta página está disponível apenas para usuários com perfil Governança ou Master.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell noPadding>
      <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 w-full flex-col overflow-hidden">
        <PageHeader
          variant="fiori"
          title="Grupos de atividade"
          subtitle="Gestão de agrupamentos lógico-operacionais"
          icon={<Layers className="w-5 h-5" aria-hidden />}
          empresa={getProjectCompanyName(projectData) ?? undefined}
          projectName={projectData?.name}
          backHref="/"
          actions={
            <div className="fiori-toolbar">
              <ActivityGroupsManagerTrigger />
            </div>
          }
        />

        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white">
          <Suspense
            fallback={
              <div className="flex h-full min-h-[12rem] items-center justify-center p-8">
                <p className="text-sm font-medium text-[#6a6d70]">Carregando grupos…</p>
              </div>
            }
          >
            <ActivityGroupsManager
              empresa={getProjectCompanyName(projectData) ?? undefined}
              projectName={projectData?.name}
            />
          </Suspense>
        </div>
      </div>
    </DashboardShell>
  );
}

function ActivityGroupsManagerTrigger() {
  const dispatchEvent = () => {
    window.dispatchEvent(new CustomEvent("open-new-group-dialog"));
  };

  return (
    <button
      type="button"
      onClick={dispatchEvent}
      className={PAGE_TOOLBAR_BTN}
    >
      <Plus className="h-4 w-4" aria-hidden />
      <span>Novo grupo</span>
    </button>
  );
}
