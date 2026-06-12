"use client";

import Link from "next/link";
import { Loader2, ChevronLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export function ReportLoading() {
  return (
    <DashboardShell>
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-SkyBlue-500" />
      </div>
    </DashboardShell>
  );
}

export function ReportEmptyState() {
  return (
    <DashboardShell>
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 bg-white border-2 border-dashed border-slate-100 rounded-none px-8 max-w-5xl mx-auto">
        <div className="print:hidden w-full text-left mb-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="hover: font-black uppercase text-[10px] tracking-widest gap-2 h-10 px-4 transition-all active:scale-95 -ml-4"
            >
              <ChevronLeft className="w-4 h-4" />{" "}
              <span>VOLTAR PARA DASHBOARD</span>
            </Button>
          </Link>
        </div>
        <FileText className="w-16 h-16 text-slate-100" />
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight">
            Sem Dados Estruturados
          </h2>
          <p className="text-slate-400 font-medium max-w-md mx-auto">
            Não localizamos execuções de carga consolidadas para os filtros aplicados. Certifique-se de que existem mocks com objetos vinculados.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
