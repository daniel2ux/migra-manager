"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';

interface ObjetosFiltersProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  statusFilter: 'ALL' | 'ATIVO' | 'INATIVO' | 'LEGACY';
  setStatusFilter: (val: 'ALL' | 'ATIVO' | 'INATIVO' | 'LEGACY') => void;
  activityGroups: any[];
  activityGroupFilter: string;
  setActivityGroupFilter: (val: string) => void;
  filteredCount: number;
  totalCount: number;
  handleClearFilters: () => void;
}

export function ObjetosFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  activityGroups,
  activityGroupFilter,
  setActivityGroupFilter,
  filteredCount,
  totalCount,
  handleClearFilters,
}: ObjetosFiltersProps) {
  if (!searchTerm && statusFilter === 'ALL' && activityGroupFilter === 'ALL') {
    return null;
  }

  return (
    <div className="px-4 md:px-8 pb-4 animate-in slide-in-from-top-2 duration-200">
      <div className="bg-amber-50/50 border border-amber-100 p-3 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-none shadow-xs">
        <div className="flex items-center gap-3 text-left w-full sm:w-auto">
          <div className="p-2 bg-amber-100/50 rounded-none shrink-0">
            <Filter className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-black uppercase text-amber-900 tracking-tight leading-none mb-1">
              Filtro Ativo Detectado
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mr-2 whitespace-nowrap">
                Mostrando{' '}
                <span className="font-black text-amber-900 underline underline-offset-2 decoration-amber-300">
                  {filteredCount}
                </span>{' '}
                de <span className="font-black text-amber-900">{totalCount}</span> objetos mestre
              </span>
              {searchTerm && (
                <Badge
                  variant="outline"
                  className="bg-white border-amber-200 text-amber-700 text-[8.5px] font-black px-2.5 h-6 flex items-center gap-2 uppercase rounded-none shadow-xs group whitespace-nowrap"
                >
                  Busca:{' '}
                  <span className="text-slate-500 font-medium truncate max-w-[150px]">
                    &quot;{searchTerm}&quot;
                  </span>
                  <X
                    className="w-2.5 h-2.5 cursor-pointer text-amber-400 group-hover:text-red-600 transition-colors"
                    onClick={() => setSearchTerm('')}
                  />
                </Badge>
              )}
              {statusFilter !== 'ALL' && (
                <Badge
                  variant="outline"
                  className="bg-white border-amber-200 text-amber-700 text-[8.5px] font-black px-2.5 h-6 flex items-center gap-2 uppercase rounded-none shadow-xs group whitespace-nowrap"
                >
                  Status: <span className="text-slate-500 font-medium">{statusFilter}</span>
                  <X
                    className="w-2.5 h-2.5 cursor-pointer text-amber-400 group-hover:text-red-600 transition-colors"
                    onClick={() => setStatusFilter('ALL')}
                  />
                </Badge>
              )}
              {activityGroupFilter !== 'ALL' && (
                <Badge
                  variant="outline"
                  className="bg-white border-amber-200 text-amber-700 text-[8.5px] font-black px-2.5 h-6 flex items-center gap-2 uppercase rounded-none shadow-xs group whitespace-nowrap"
                >
                  Grupo:{' '}
                  <span className="text-slate-500 font-medium">
                    {activityGroups.find((g) => g.id === activityGroupFilter)?.name ?? activityGroupFilter}
                  </span>
                  <X
                    className="w-2.5 h-2.5 cursor-pointer text-amber-400 group-hover:text-red-600 transition-colors"
                    onClick={() => setActivityGroupFilter('ALL')}
                  />
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="w-full sm:w-auto bg-white border-amber-200 text-amber-700 hover:bg-amber-100 font-black text-[10px] uppercase tracking-widest h-8 px-6 rounded-none transition-all active:scale-95 shadow-xs border"
        >
          LIMPAR TODOS OS FILTROS
        </Button>
      </div>
    </div>
  );
}
