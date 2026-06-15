'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BarChart,
  Download,
  GitCompare,
  Loader2,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Terminal,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const PAGE_TOOLBAR_BTN =
  'fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0';

const SEARCH_DEBOUNCE_MS = 250;

function MockObjectsSearchInput({
  searchTerm,
  onSearchTermChange,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(searchTerm);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setDraft(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (draft === searchTerm) return;
    debounceRef.current = setTimeout(() => {
      onSearchTermChange(draft);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [draft, searchTerm, onSearchTermChange]);

  const commitSearch = () => {
    clearTimeout(debounceRef.current);
    onSearchTermChange(draft);
  };

  const clearSearch = () => {
    clearTimeout(debounceRef.current);
    setDraft('');
    onSearchTermChange('');
  };

  return (
    <>
      <Input
        placeholder="Nome, grupo ou descrição..."
        className="fiori-input shadow-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitSearch();
        }}
      />
      {draft && (
        <button type="button" className="fiori-filter-popover-clear mt-2" onClick={clearSearch}>
          Limpar busca
        </button>
      )}
    </>
  );
}

interface MockObjectsToolbarProps {
  isAdmin: boolean;
  isAdminOrMaster: boolean;
  isEffectiveLocked: boolean;
  isMockLoading: boolean;
  isSyncing: boolean;
  isImporting: boolean;
  selectedObjectIds: string[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  performanceFilter: 'all' | 'green' | 'yellow' | 'red';
  onPerformanceFilterChange: (value: 'all' | 'green' | 'yellow' | 'red') => void;
  showPerformanceTable: boolean;
  onTogglePerformanceTable: () => void;
  onBulkReset: () => void;
  onBulkDelete: () => void;
  onSyncPreviousReferences: () => void;
  onOpenLogImport: () => void;
  navImportFileRef: React.RefObject<HTMLInputElement | null>;
  onImportFile: (file: File) => void;
  onGlobalReset: () => void;
  onOpenImportDialog: () => void;
  onExportJson: () => void;
  onAddObjects: () => void;
}

export function MockObjectsToolbar({
  isAdmin,
  isAdminOrMaster,
  isEffectiveLocked,
  isMockLoading,
  isSyncing,
  isImporting,
  selectedObjectIds,
  searchTerm,
  onSearchTermChange,
  performanceFilter,
  onPerformanceFilterChange,
  showPerformanceTable,
  onTogglePerformanceTable,
  onBulkReset,
  onBulkDelete,
  onSyncPreviousReferences,
  onOpenLogImport,
  navImportFileRef,
  onImportFile,
  onGlobalReset,
  onOpenImportDialog,
  onExportJson,
  onAddObjects,
}: MockObjectsToolbarProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="fiori-toolbar">
        {isAdmin && !isEffectiveLocked && selectedObjectIds.length > 0 && (
          <>
            <div className="fiori-toolbar-selection">
              <span className="fiori-toolbar-selection-count">
                {selectedObjectIds.length} selecionado{selectedObjectIds.length !== 1 ? 's' : ''}
              </span>
              <div className="fiori-toolbar-divider" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBulkReset}
                    className={PAGE_TOOLBAR_BTN}
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" variant="fiori">
                  Inicializar seleção
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBulkDelete}
                    className={cn(PAGE_TOOLBAR_BTN, 'fiori-toolbar-btn-danger')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" variant="fiori">
                  Excluir seleção
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="fiori-toolbar-divider" />
          </>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                PAGE_TOOLBAR_BTN,
                (searchTerm || performanceFilter !== 'all') && 'fiori-toolbar-btn-active',
              )}
            >
              <Search className="w-4 h-4" />
              {(searchTerm || performanceFilter !== 'all') && (
                <span className="fiori-toolbar-dot" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="fiori-filter-popover z-[100]" align="end">
            <div className="fiori-filter-popover-title">
              <Search className="w-3.5 h-3.5" />
              Buscar objetos
            </div>
            <MockObjectsSearchInput
              searchTerm={searchTerm}
              onSearchTermChange={onSearchTermChange}
            />
            <div className="fiori-filter-popover-section">
              <div className="fiori-filter-popover-section-title">
                <BarChart className="w-3.5 h-3.5" />
                Qualidade da carga
              </div>
              <div className="fiori-filter-chip-grid">
                {(
                  [
                    ['all', 'Todos', ''],
                    ['green', 'Sucesso', 'fiori-chip--success'],
                    ['yellow', 'Atenção', 'fiori-chip--warning'],
                    ['red', 'Crítico', 'fiori-chip--critical'],
                  ] as const
                ).map(([value, label, chipClass]) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      'fiori-chip',
                      chipClass,
                      performanceFilter === value && 'fiori-chip-selected',
                    )}
                    onClick={() => onPerformanceFilterChange(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {performanceFilter !== 'all' && (
                <button
                  type="button"
                  className="fiori-filter-popover-clear mt-2"
                  onClick={() => onPerformanceFilterChange('all')}
                >
                  Limpar filtro
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {isAdmin && !isEffectiveLocked && !isMockLoading && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSyncPreviousReferences}
                disabled={isSyncing}
                className={cn(PAGE_TOOLBAR_BTN, isSyncing && 'fiori-toolbar-btn-active')}
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GitCompare className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" variant="fiori">
              Sincronizar referências (mock anterior)
            </TooltipContent>
          </Tooltip>
        )}

        <div className="fiori-toolbar-divider" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePerformanceTable}
              className={cn(PAGE_TOOLBAR_BTN, showPerformanceTable && 'fiori-toolbar-btn-active')}
            >
              {showPerformanceTable ? (
                <BarChart className="w-4 h-4" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" variant="fiori">
            {showPerformanceTable ? 'Ver em grid' : 'Visão de performance'}
          </TooltipContent>
        </Tooltip>

        {isAdminOrMaster && !isEffectiveLocked && !isMockLoading && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenLogImport}
                className={PAGE_TOOLBAR_BTN}
              >
                <Terminal className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" variant="fiori">
              Importar logs
              {selectedObjectIds.length > 0
                ? ` (${selectedObjectIds.length} sel.)`
                : ' (todos)'}
            </TooltipContent>
          </Tooltip>
        )}

        {isAdmin && !isEffectiveLocked && !isMockLoading && (
          <>
            <input
              type="file"
              ref={navImportFileRef}
              className="hidden"
              accept=".csv,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportFile(file);
                if (navImportFileRef.current) {
                  navImportFileRef.current.value = '';
                }
              }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onGlobalReset}
                  className={cn(PAGE_TOOLBAR_BTN, 'fiori-toolbar-btn-danger')}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" variant="fiori">
                Reset total do mock
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenImportDialog}
                  disabled={isImporting}
                  className={PAGE_TOOLBAR_BTN}
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" variant="fiori">
                Importar JSON (ver layout)
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onExportJson}
                  className={PAGE_TOOLBAR_BTN}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" variant="fiori">
                Exportar JSON
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onAddObjects}
                  className={PAGE_TOOLBAR_BTN}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" variant="fiori">
                Adicionar objetos
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
