"use client";

import { Suspense, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Package, Loader2, Plus, Search, ShieldAlert, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChargeGroupsManager } from "@/components/configuracoes/charge-groups-manager";
import { useDb, useUser, useDoc, useMemoDb } from "@/supabase";
import { doc } from "@/supabase/compat-db-shim";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { getProjectCompanyName } from "@/lib/migration/project-company";
import type { Project } from "@/types/migration";

const PAGE_TOOLBAR_BTN =
  "fiori-toolbar-btn fiori-toolbar-btn--labeled !rounded-[0.375rem] !h-8 min-h-0 !w-auto !px-2.5";

const PAGE_TOOLBAR_ICON_BTN =
  "fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0";

export default function GruposObjetosPage() {
  const db = useDb();
  const { user } = useUser();
  const { projectId } = useActiveProjectId();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const userDocRef = useMemoDb(
    () => (user && db ? doc(db, "users", user.uid) : null),
    [db, user],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<{
    isMaster?: boolean;
    role?: string;
  }>(userDocRef);

  const projectRef = useMemoDb(
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
            title="Grupos de objetos"
            subtitle="Acesso restrito"
            icon={<Package className="w-5 h-5" aria-hidden />}
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
          title="Grupos de objetos"
          subtitle="Gestão de grupos de carga (G1, G2, G3…)"
          icon={<Package className="w-5 h-5" aria-hidden />}
          empresa={getProjectCompanyName(projectData) ?? undefined}
          projectName={projectData?.name}
          backHref="/"
          context={searchTerm ? (
            <>
              <span className="fiori-page-context-dot animate-pulse" />
              <span>Busca ativa</span>
            </>
          ) : null}
          actions={
            <TooltipProvider delayDuration={0}>
              <div className="fiori-toolbar">
                <div className={cn("fiori-toolbar-search", isSearchOpen && "fiori-toolbar-search--open")}>
                  <div className="fiori-search-shell">
                    <Search className="fiori-search-icon" aria-hidden />
                    <input
                      type="search"
                      autoFocus={isSearchOpen}
                      placeholder="Pesquisar grupos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setIsSearchOpen(false);
                      }}
                      className="fiori-search-input"
                      aria-label="Pesquisar grupos de objetos"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="fiori-search-clear"
                        onClick={() => setSearchTerm("")}
                        aria-label="Limpar busca"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(!isSearchOpen)}
                      className={cn(
                        PAGE_TOOLBAR_ICON_BTN,
                        (isSearchOpen || searchTerm) && "fiori-toolbar-btn-active",
                      )}
                      aria-label={isSearchOpen ? "Fechar busca" : "Pesquisar grupos"}
                    >
                      <Search className="w-4 h-4" aria-hidden />
                      {searchTerm && !isSearchOpen && <span className="fiori-toolbar-dot" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" variant="fiori">
                    {isSearchOpen ? "Fechar busca" : "Pesquisar grupos"}
                  </TooltipContent>
                </Tooltip>

                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-new-charge-group-dialog"))}
                  className={PAGE_TOOLBAR_BTN}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  <span>Novo grupo</span>
                </button>
              </div>
            </TooltipProvider>
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
            <ChargeGroupsManager
              empresa={getProjectCompanyName(projectData) ?? undefined}
              projectName={projectData?.name}
              searchTerm={searchTerm}
            />
          </Suspense>
        </div>
      </div>
    </DashboardShell>
  );
}
