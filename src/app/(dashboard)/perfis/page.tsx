"use client";

import React, { useRef } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Shield, ShieldAlert, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PerfisManager, PerfisManagerRef } from "@/components/configuracoes/perfis-manager";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/supabase";
import { doc } from "firebase/firestore";

export default function PerfisPage() {
  const db = useFirestore();
  const { user } = useUser();
  const managerRef = useRef<PerfisManagerRef>(null);

  const userDocRef = useMemoFirebase(
    () => (user && db ? doc(db, "users", user.uid) : null),
    [db, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userDocRef);

  const isMaster = userProfile?.role === "master";

  if (!isProfileLoading && !isMaster) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full">
          <PageHeader
            title="GERENCIAR PERFIS"
            subtitle="Acesso Restrito"
            icon={<Shield className="w-5 h-5 text-white" />}
            backHref="/configuracoes"
          />
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-5 max-w-md w-full">
              <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-black text-red-700 uppercase tracking-widest">Acesso Restrito</p>
                <p className="text-[10px] text-red-600 mt-1">Esta página está disponível apenas para o perfil Master.</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell noPadding>
      <div className="flex flex-col w-full min-h-screen bg-slate-50/30">
        <PageHeader
          title="GERENCIAR PERFIS"
          subtitle="Gestão de perfis e acessos"
          icon={<Shield className="w-5 h-5 text-white" />}
          backHref="/configuracoes"
          actions={
            <div className="flex items-center gap-1.5 pt-1">
              <div className="flex items-center gap-1 p-1">
                {isMaster && (
                  <Button
                    variant="ghost"
                    onClick={() => managerRef.current?.openNewProfile()}
                    className="h-8 rounded-none transition-all text-slate-500 hover:text-SkyBlue-600 hover:bg-slate-200 text-[10px] font-bold uppercase tracking-widest gap-1.5 px-3"
                    title="Novo Perfil"
                  >
                    <Plus className="w-4 h-4" /> NOVO PERFIL
                  </Button>
                )}
              </div>
            </div>
          }
        />

        <div className="w-full flex-1 flex flex-col items-stretch min-h-0 bg-white">
          <PerfisManager ref={managerRef} />
        </div>
      </div>
    </DashboardShell>
  );
}
