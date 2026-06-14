"use client";

import React, { useRef } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Shield, ShieldAlert, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PerfisManager, PerfisManagerRef } from "@/components/configuracoes/perfis-manager";
import { useCurrentUserPermissions } from "@/hooks/use-current-user-permissions";

const PAGE_TOOLBAR_ICON_BTN =
  "fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0";

export default function PerfisPage() {
  const managerRef = useRef<PerfisManagerRef>(null);
  const { isProfileLoading, can } = useCurrentUserPermissions();

  const canManageProfiles = can("access_profiles.manage");

  if (!isProfileLoading && !canManageProfiles) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col flex-1 min-h-[calc(100dvh-4rem)]">
          <PageHeader
            variant="fiori"
            title="Perfis de acesso"
            subtitle="Acesso restrito"
            icon={<Shield className="w-5 h-5" aria-hidden />}
            backHref="/configuracoes"
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
                  Você não possui permissão para gerenciar perfis de acesso.
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
          title="Perfis de acesso"
          subtitle="Gestão de perfis e permissões"
          icon={<Shield className="w-5 h-5" aria-hidden />}
          backHref="/configuracoes"
          actions={
            canManageProfiles ? (
              <TooltipProvider delayDuration={0}>
                <div className="fiori-toolbar">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => managerRef.current?.openNewProfile()}
                        className={PAGE_TOOLBAR_ICON_BTN}
                        aria-label="Novo perfil"
                      >
                        <Plus className="w-4 h-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" variant="fiori">
                      Novo perfil
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            ) : undefined
          }
        />

        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white">
          <PerfisManager ref={managerRef} />
        </div>
      </div>
    </DashboardShell>
  );
}
