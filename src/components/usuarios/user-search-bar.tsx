"use client";

import { Search, ShieldAlert } from "lucide-react";

interface AccessDeniedScreenProps {
}

export function AccessDeniedScreen({ }: AccessDeniedScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-5 max-w-md w-full">
        <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] font-black text-red-700 uppercase tracking-widest">Acesso Restrito</p>
          <p className="text-[10px] text-red-600 mt-1">Esta página está disponível apenas para usuários com perfil Admin ou Master.</p>
        </div>
      </div>
    </div>
  );
}

interface UserGridEmptyStateProps {
  hasSearch: boolean;
}

export function UserGridEmptyState({ hasSearch }: UserGridEmptyStateProps) {
  return (
    <div className="fiori-wizard-empty col-span-full min-h-[12rem]">
      <Search className="w-6 h-6 text-[var(--fiori-label)]" aria-hidden />
      <p>
        {hasSearch ? "Nenhum profissional encontrado" : "Nenhum profissional cadastrado"}
      </p>
    </div>
  );
}
