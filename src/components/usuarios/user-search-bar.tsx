"use client";

import { Search, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UserSearchBarProps {
  searchTerm: string;
  isSearchOpen: boolean;
  onSearch: (value: string) => void;
  onClear: () => void;
}

export function UserSearchBar({
  searchTerm,
  isSearchOpen,
  onSearch,
  onClear,
}: Omit<UserSearchBarProps, 'onToggle'>) {
  if (!isSearchOpen) return null;

  return (
    <div className="px-4 md:px-8 pb-4 animate-in slide-in-from-top-2 duration-200">
      <div className="relative group max-w-2xl mx-auto lg:mx-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-SkyBlue-500 transition-colors" />
        <Input
          placeholder="EX: NOME, EMAIL OU EMPRESA"
          className="h-11 pl-10 pr-12 rounded-none"
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 hover:bg-slate-200 text-slate-400"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

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
