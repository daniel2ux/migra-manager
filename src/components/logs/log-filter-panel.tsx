"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import type { MigrationLogStatus } from "@/types/migration";

interface Filters { object: string; mock: string; status: MigrationLogStatus | ""; dateFrom: string; dateTo: string; }

interface LogFilterPanelProps {
  draft: Filters;
  onDraftChange: (f: Filters) => void;
  textSearch: string;
  onTextSearchChange: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  isLoading: boolean;
  mockOptions: string[];
  objectOptions: string[];
  hasDraftFilters: boolean;
  total: number | null;
  page: number;
  hasNext: boolean;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
}

export function LogFilterPanel({
  draft, onDraftChange, textSearch, onTextSearchChange,
  onSearch, onClear, isLoading, mockOptions, objectOptions,
  hasDraftFilters, total, page, hasNext, from, to, onPageChange,
}: LogFilterPanelProps) {
  const toDate = (isoDate: string): Date | undefined => {
    if (!isoDate) return undefined;
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return undefined;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? undefined : dt;
  };

  const toIsoDate = (date: Date | undefined): string => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const toBrDate = (isoDate: string): string => {
    const dt = toDate(isoDate);
    if (!dt) return "";
    return dt.toLocaleDateString("pt-BR");
  };

  return (
    <div className="fiori-log-filter-panel">
      <div className="fiori-log-filter-fields">
        <div className="fiori-log-filter-field">
          <span className="fiori-log-filter-label">Mock</span>
          <Select
            value={draft.mock || "__all__"}
            onValueChange={(v) => onDraftChange({ ...draft, mock: v === "__all__" ? "" : v, object: "" })}
          >
            <SelectTrigger className="fiori-select-trigger shadow-none">
              <SelectValue placeholder="Selecionar mock" />
            </SelectTrigger>
            <SelectContent className="fiori-select-content">
              <SelectItem value="__all__" className="fiori-select-item">Todas</SelectItem>
              {mockOptions.map((name) => (
                <SelectItem key={name} value={name} className="fiori-select-item">{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="fiori-log-filter-field">
          <span className="fiori-log-filter-label">Objeto</span>
          <Select
            value={draft.object || "__all__"}
            onValueChange={(v) => onDraftChange({ ...draft, object: v === "__all__" ? "" : v })}
            disabled={!draft.mock || objectOptions.length === 0}
          >
            <SelectTrigger className="fiori-select-trigger shadow-none">
              <SelectValue placeholder="Todos os objetos" />
            </SelectTrigger>
            <SelectContent className="fiori-select-content">
              <SelectItem value="__all__" className="fiori-select-item">Todos os objetos</SelectItem>
              {objectOptions.map((name) => (
                <SelectItem key={name} value={name} className="fiori-select-item">{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="fiori-log-filter-field">
          <span className="fiori-log-filter-label">Data início</span>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="fiori-log-filter-date-trigger">
                <span className={cn(!draft.dateFrom && "text-[var(--fiori-label)]")}>
                  {toBrDate(draft.dateFrom) || "Selecionar data"}
                </span>
                <CalendarDays className="w-4 h-4 shrink-0 text-[var(--fiori-label)]" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent variant="fiori" align="start" className="fiori-datetime-popover p-0">
              <Calendar
                variant="fiori"
                mode="single"
                selected={toDate(draft.dateFrom)}
                onSelect={(date) => onDraftChange({ ...draft, dateFrom: toIsoDate(date) })}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="fiori-log-filter-field">
          <span className="fiori-log-filter-label">Data fim</span>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="fiori-log-filter-date-trigger">
                <span className={cn(!draft.dateTo && "text-[var(--fiori-label)]")}>
                  {toBrDate(draft.dateTo) || "Selecionar data"}
                </span>
                <CalendarDays className="w-4 h-4 shrink-0 text-[var(--fiori-label)]" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent variant="fiori" align="start" className="fiori-datetime-popover p-0">
              <Calendar
                variant="fiori"
                mode="single"
                selected={toDate(draft.dateTo)}
                onSelect={(date) => onDraftChange({ ...draft, dateTo: toIsoDate(date) })}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="fiori-log-filter-toolbar">
        <div className="fiori-log-filter-search fiori-search-shell">
          <Search className="fiori-search-icon" aria-hidden />
          <input
            type="search"
            placeholder="Buscar em mensagem ou chave…"
            value={textSearch}
            onChange={(e) => onTextSearchChange(e.target.value)}
            className="fiori-search-input shadow-none"
            aria-label="Buscar em mensagem ou chave"
          />
          {textSearch && (
            <button
              type="button"
              className="fiori-search-clear"
              onClick={() => onTextSearchChange("")}
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          )}
        </div>

        <div className="fiori-log-filter-actions">
          <button
            type="button"
            onClick={onSearch}
            disabled={isLoading || !draft.mock}
            className="fiori-log-filter-btn fiori-log-filter-btn--emphasized"
          >
            <Search className="w-3.5 h-3.5" aria-hidden />
            Buscar
          </button>
          {hasDraftFilters && (
            <button
              type="button"
              onClick={onClear}
              disabled={isLoading}
              className="fiori-log-filter-btn fiori-log-filter-btn--ghost"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
              Limpar
            </button>
          )}
        </div>

        {total !== null && to > 0 && (
          <div className="fiori-log-filter-pager">
            <span className="fiori-log-filter-pager-label">
              {from}–{to} de {total.toLocaleString("pt-BR")}
            </span>
            <div className="fiori-log-filter-pager-nav">
              <button
                type="button"
                disabled={page === 1 || isLoading}
                onClick={() => onPageChange(page - 1)}
                className="fiori-log-filter-pager-btn"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled={!hasNext || isLoading}
                onClick={() => onPageChange(page + 1)}
                className="fiori-log-filter-pager-btn"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
