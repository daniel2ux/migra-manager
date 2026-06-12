"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Filter, X, SlidersHorizontal, Network, Database, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ObjetosFiltersProps {
  isSearchOpen: boolean;
  setIsSearchOpen: (val: boolean) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  mainSearchRef: React.RefObject<HTMLInputElement | null>;
  mainSearchTimerRef: React.MutableRefObject<any>;
  statusFilter: 'ALL' | 'ATIVO' | 'INATIVO' | 'LEGACY';
  setStatusFilter: (val: 'ALL' | 'ATIVO' | 'INATIVO' | 'LEGACY') => void;
  sortMode: 'EXECUTION' | 'ALPHABETICAL' | 'UPDATED';
  setSortMode: (val: 'EXECUTION' | 'ALPHABETICAL' | 'UPDATED') => void;
  activityGroups: any[];
  activityGroupFilter: string;
  setActivityGroupFilter: (val: string) => void;
  filteredCount: number;
  totalCount: number;
  handleClearFilters: () => void;
}

export function ObjetosFilters({
  isSearchOpen,
  setIsSearchOpen,
  searchTerm,
  setSearchTerm,
  mainSearchRef,
  mainSearchTimerRef,
  statusFilter,
  setStatusFilter,
  sortMode,
  setSortMode,
  activityGroups,
  activityGroupFilter,
  setActivityGroupFilter,
  filteredCount,
  totalCount,
  handleClearFilters
}: ObjetosFiltersProps) {
  if (!isSearchOpen && !searchTerm && statusFilter === 'ALL' && activityGroupFilter === 'ALL') {
    return null;
  }

  return (
    <div className="px-4 md:px-8 pb-4 animate-in slide-in-from-top-2 duration-200">
      {/* Search Bar */}
      {isSearchOpen && (
        <div className="bg-white p-1 flex items-center h-12 gap-2 relative shadow-xs mb-4">
          <div className="flex-1 relative flex items-center">
            <div className="flex-1 flex items-center gap-2 bg-slate-100 border border-slate-200 h-9 px-3 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-SkyBlue-500/20 focus-within:border-SkyBlue-400 shadow-inner group">
              <Search className={cn(
                "w-4 h-4 transition-colors",
                searchTerm ? "text-SkyBlue-500" : "text-slate-400 group-focus-within:text-SkyBlue-500"
              )} />
              <input
                autoFocus
                placeholder="PESQUISAR POR NOME OU DESCRIÇÃO..."
                className="flex-1 bg-transparent border-0 px-0 text-[11px] font-medium text-slate-700 placeholder:text-slate-400 focus-visible:ring-0 focus:outline-hidden"
                ref={mainSearchRef}
                defaultValue={searchTerm}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  e.target.value = val;
                  if (mainSearchTimerRef.current) clearTimeout(mainSearchTimerRef.current);
                  mainSearchTimerRef.current = setTimeout(() => setSearchTerm(val), 50);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsSearchOpen(false);
                }}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { if (mainSearchRef.current) mainSearchRef.current.value = ''; if (mainSearchTimerRef.current) clearTimeout(mainSearchTimerRef.current); setSearchTerm(''); }}
                  className="h-7 w-7 shrink-0 hover:bg-red-50 hover:text-red-500 border-0"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200" />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-10 px-4 font-black text-[10px] uppercase gap-2 rounded-none transition-all border-0",
                  (statusFilter !== 'ALL' || sortMode !== 'EXECUTION') ? "text-SkyBlue-600 bg-SkyBlue-50" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <Filter className="w-4 h-4" />
                FILTROS
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 rounded-none shadow-2xl z-100 border-none overflow-hidden" align="end">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest">Painel de Visualização</span>
                <SlidersHorizontal className="w-3.5 h-3.5 text-SkyBlue-400" />
              </div>
              <div className="p-2 space-y-1 bg-white">
                <div className="px-3 py-1.5 font-black text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-1">Ordenação Principal</div>
                {[
                  { id: 'EXECUTION', label: 'Ordem de Execução', icon: Network },
                  { id: 'ALPHABETICAL', label: 'Nome (A-Z)', icon: Database },
                  { id: 'UPDATED', label: 'Data de Modificação', icon: Zap }
                ].map((opt) => (
                  <Button
                    key={opt.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-[10px] font-black uppercase tracking-widest h-10 gap-3 rounded-none border-0",
                      sortMode === opt.id ? "bg-SkyBlue-50 text-SkyBlue-600 font-black" : "text-slate-500 hover:bg-slate-50"
                    )}
                    onClick={() => setSortMode(opt.id as any)}
                  >
                    <opt.icon className={cn("w-3.5 h-3.5", sortMode === opt.id ? "text-SkyBlue-600" : "text-slate-400")} />
                    {opt.label}
                  </Button>
                ))}

                {activityGroups.length > 0 && (<>
                  <div className="px-3 py-1.5 mt-2 border-t border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-1 pt-3">Grupo de Atividade</div>
                  {[{ id: 'ALL', name: 'TODOS OS GRUPOS', color: '', description: 'MOSTRAR OBJETOS DE TODOS OS GRUPOS' }, ...activityGroups].map((g) => (
                    <Tooltip key={g.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start text-[10px] font-black uppercase tracking-widest h-10 gap-3 rounded-none transition-all border-0",
                            activityGroupFilter === g.id ? "bg-SkyBlue-50 text-SkyBlue-600 font-black" : "text-slate-500 hover:bg-slate-50"
                          )}
                          onClick={() => setActivityGroupFilter(g.id)}
                        >
                          <span className="w-2 h-2 rounded-none shrink-0" style={{ backgroundColor: g.color || '#94a3b8' }} />
                          {g.name}
                        </Button>
                      </TooltipTrigger>
                      {g.description && (
                        <TooltipContent side="right" className="py-1.5 px-3 text-[9px] font-bold uppercase tracking-widest rounded-none z-110">
                          {g.description}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </>)}

                <div className="px-3 py-1.5 mt-2 border-t border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-1 pt-3">Filtro de Status</div>
                {['ALL', 'ATIVO', 'INATIVO', 'LEGACY'].map((status) => (
                  <Button
                    key={status}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-[10px] font-black uppercase tracking-widest h-10 gap-3 rounded-none border-0",
                      statusFilter === status ? "bg-amber-50 text-amber-600 font-black" : "text-slate-500 hover:bg-slate-50"
                    )}
                    onClick={() => setStatusFilter(status as any)}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      status === 'ALL' ? "bg-slate-300" :
                        status === 'ATIVO' ? "bg-emerald-500" :
                          status === 'LEGACY' ? "bg-amber-500" : "bg-rose-500"
                    )} />
                    {status === 'ALL' ? 'TODOS OS STATUS' : status}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 text-slate-400 hover:text-red-600 border-0"
            onClick={() => setIsSearchOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Active Filter Badges */}
      {(searchTerm || statusFilter !== 'ALL' || activityGroupFilter !== 'ALL') && (
        <div className="bg-amber-50/50 border border-amber-100 p-3 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-none shadow-xs">
          <div className="flex items-center gap-3 text-left w-full sm:w-auto">
            <div className="p-2 bg-amber-100/50 rounded-none shrink-0"><Filter className="w-4 h-4 text-amber-600" /></div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase text-amber-900 tracking-tight leading-none mb-1">Filtro Ativo Detectado</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mr-2 whitespace-nowrap">
                  Mostrando <span className="font-black text-amber-900 underline underline-offset-2 decoration-amber-300">{filteredCount}</span> de <span className="font-black text-amber-900">{totalCount}</span> objetos mestre
                </span>
                {searchTerm && (
                  <Badge variant="outline" className="bg-white border-amber-200 text-amber-700 text-[8.5px] font-black px-2.5 h-6 flex items-center gap-2 uppercase rounded-none shadow-xs group whitespace-nowrap">
                    Busca: <span className="text-slate-500 font-medium truncate max-w-[150px]">&quot;{searchTerm}&quot;</span>
                    <X className="w-2.5 h-2.5 cursor-pointer text-amber-400 group-hover:text-red-600 transition-colors" onClick={() => setSearchTerm('')} />
                  </Badge>
                )}
                {statusFilter !== 'ALL' && (
                  <Badge variant="outline" className="bg-white border-amber-200 text-amber-700 text-[8.5px] font-black px-2.5 h-6 flex items-center gap-2 uppercase rounded-none shadow-xs group whitespace-nowrap">
                    Status: <span className="text-slate-500 font-medium">{statusFilter}</span>
                    <X className="w-2.5 h-2.5 cursor-pointer text-amber-400 group-hover:text-red-600 transition-colors" onClick={() => setStatusFilter('ALL')} />
                  </Badge>
                )}
                {activityGroupFilter !== 'ALL' && (
                  <Badge variant="outline" className="bg-white border-amber-200 text-amber-700 text-[8.5px] font-black px-2.5 h-6 flex items-center gap-2 uppercase rounded-none shadow-xs group whitespace-nowrap">
                    Grupo: <span className="text-slate-500 font-medium">{activityGroups.find(g => g.id === activityGroupFilter)?.name ?? activityGroupFilter}</span>
                    <X className="w-2.5 h-2.5 cursor-pointer text-amber-400 group-hover:text-red-600 transition-colors" onClick={() => setActivityGroupFilter('ALL')} />
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleClearFilters} className="w-full sm:w-auto bg-white border-amber-200 text-amber-700 hover:bg-amber-100 font-black text-[10px] uppercase tracking-widest h-8 px-6 rounded-none transition-all active:scale-95 shadow-xs border">
            LIMPAR TODOS OS FILTROS
          </Button>
        </div>
      )}
    </div>
  );
}
