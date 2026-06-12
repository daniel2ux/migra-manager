"use client";

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Plus, Search, RefreshCcw, Trash2, X
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

const PAGE_TOOLBAR_BTN =
  "fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0";

interface MockHeaderProps {
  isAdmin: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  onAddMock: () => void;
  onBulkDelete: () => void;
  onBulkRestart: () => void;
  selectedMockId: string;
  _filteredCount: number;
  empresa?: string;
  projectName?: string;
  mockName?: string;
}

export function MockHeader({
  isAdmin, searchTerm, setSearchTerm, isSearchOpen, setIsSearchOpen,
  onAddMock, onBulkDelete, onBulkRestart, selectedMockId, _filteredCount,
  empresa, projectName, mockName,
}: MockHeaderProps) {
  const isAll = selectedMockId === 'all';

  const actions = (
      <div className="fiori-toolbar">
        <div className={cn("fiori-toolbar-search", isSearchOpen && "fiori-toolbar-search--open")}>
          <div className="fiori-search-shell">
            <Search className="fiori-search-icon" aria-hidden />
            <input
              type="search"
              autoFocus={isSearchOpen}
              placeholder="Pesquisar mocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="fiori-search-input"
              aria-label="Pesquisar mocks"
            />
            {searchTerm && (
              <button
                type="button"
                className="fiori-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                PAGE_TOOLBAR_BTN,
                (isSearchOpen || searchTerm) && "fiori-toolbar-btn-active"
              )}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label={isSearchOpen ? "Fechar busca" : "Pesquisar mocks"}
            >
              <Search className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" variant="fiori">
            {isSearchOpen ? "Fechar busca" : "Pesquisar mocks"}
          </TooltipContent>
        </Tooltip>

        {isAdmin && (
          <>
            {!isAll && (
              <>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={PAGE_TOOLBAR_BTN}
                      onClick={onBulkRestart}
                      aria-label="Reiniciar selecionado"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" variant="fiori">
                    Reiniciar selecionado
                  </TooltipContent>
                </Tooltip>

                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(PAGE_TOOLBAR_BTN, "fiori-toolbar-btn-danger")}
                      onClick={onBulkDelete}
                      aria-label="Excluir selecionado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" variant="fiori">
                    Excluir selecionado
                  </TooltipContent>
                </Tooltip>
              </>
            )}

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  onClick={onAddMock}
                  variant="ghost"
                  size="icon"
                  className={PAGE_TOOLBAR_BTN}
                  aria-label="Nova janela"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" variant="fiori">
                Nova janela
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
  );

  return (
    <PageHeader
      variant="fiori"
      title="Mocks"
      empresa={empresa}
      projectName={projectName}
      mockName={mockName}
      backHref="/projetos"
      actions={actions}
    />
  );
}
