"use client";

import {
  Lock, Unlock, RefreshCcw, Package, Clock,
  Copy, Pencil, Eye, Ban, RotateCcw,
  Zap, CheckCircle2,
  LayoutGrid,
  PlayCircle, StopCircle, Loader2,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Mock, MigrationObject } from '@/types/migration';
import { renderDuration } from '@/lib/formatters';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelection } from '@/context/selection-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { calculateMockTotalDuration, isMockInactive, isMockLocked, isMockCargaInProgress, isMockConcluida } from '@/lib/mock-utils';

const CARD_TOOLBAR_BTN =
  "fiori-card-toolbar-btn !rounded-[0.375rem] !size-7 min-h-0 min-w-0";

interface MockCardProps {
  mock: Mock;
  isSelected: boolean;
  onSelect: (id: string) => void;
  canEdit?: boolean;
  canLock?: boolean;
  canClone?: boolean;
  canRestart?: boolean;
  /** @deprecated use canEdit/canLock/canClone/canRestart */
  isAdmin?: boolean;
  isMaster?: boolean;
  isProjectLocked?: boolean;
  currentUserId: string;
  projectId: string | null;
  isTogglingLoad: string | null;
  isDeleting: string | null;
  onToggleLock: (mock: Mock) => void;
  onToggleLoadStatus: (mock: Mock) => void;
  onClone: (mock: Mock) => void;
  onEdit: (mock: Mock) => void;
  onView: (mock: Mock) => void;
  onToggleActive: (mock: Mock, activate: boolean) => void;
  onStatusChange?: (mock: Mock, status: string) => void;
  onContextMenu: (e: React.MouseEvent, mock: Mock) => void;
  objects?: MigrationObject[];
  catalogObjectCount?: number;
}

export interface MockCardHandle {
  focus: () => void;
  scrollIntoView: () => void;
}

type StatusMeta = {
  label: string;
  labelClass: string;
  icon: React.ReactNode;
};

const MOCK_STATUS_OPTIONS = [
  { value: "PENDENTE", label: "Aberto", dotClass: "fiori-select-status-dot--neutral" },
  { value: "CARGA_EM_ANDAMENTO", label: "Em andamento", dotClass: "fiori-select-status-dot--warning" },
  { value: "CARGA_CONCLUIDA", label: "Concluída", dotClass: "fiori-select-status-dot--success" },
  { value: "BLOQUEADO", label: "Bloqueado", dotClass: "fiori-select-status-dot--critical" },
] as const;

function stopCardEvent(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function normalizeMockStatus(mock: Mock): string {
  if (isMockInactive(mock)) return "INATIVO";
  return mock.status || (mock.isRunning ? "CARGA_EM_ANDAMENTO" : "PENDENTE");
}

function mockStatusMeta(status: string): StatusMeta {
  const normalized = status.trim().toUpperCase();
  if (normalized === "CARGA_EM_ANDAMENTO") {
    return {
      label: "Em andamento",
      labelClass: "text-orange-700",
      icon: <Zap className="w-3 h-3 fill-current" />,
    };
  }
  if (normalized === "CARGA_CONCLUIDA" || normalized === "FINALIZADA") {
    return {
      label: "Concluída",
      labelClass: "text-[#107e3e]",
      icon: <CheckCircle2 className="w-3 h-3" />,
    };
  }
  if (normalized === "BLOQUEADO") {
    return {
      label: "Bloqueado",
      labelClass: "text-amber-700",
      icon: <Lock className="w-3 h-3" />,
    };
  }
  if (normalized === "INATIVO") {
    return {
      label: "Inativo",
      labelClass: "text-[#6a6d70]",
      icon: null,
    };
  }
  return {
    label: "Aberto",
    labelClass: "text-[#6a6d70]",
    icon: null,
  };
}

function getStatusMeta(mock: Mock): StatusMeta {
  if (isMockInactive(mock)) {
    return mockStatusMeta("INATIVO");
  }
  if (isMockCargaInProgress(mock)) {
    return mockStatusMeta("CARGA_EM_ANDAMENTO");
  }
  if (isMockConcluida(mock)) {
    return mockStatusMeta("CARGA_CONCLUIDA");
  }
  if (isMockLocked(mock)) {
    return mockStatusMeta("BLOQUEADO");
  }
  return mockStatusMeta(normalizeMockStatus(mock));
}

function CardStatusControl({
  mock,
  editable,
  isToggling,
  onChange,
}: {
  mock: Mock;
  editable: boolean;
  isToggling: boolean;
  onChange: (status: string) => void;
}) {
  const normalized = normalizeMockStatus(mock);
  const statusMeta = getStatusMeta(mock);

  if (!editable) {
    return (
      <div className={cn("fiori-project-card-status-label shrink-0", statusMeta.labelClass)}>
        {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : statusMeta.icon}
        {statusMeta.label}
      </div>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "fiori-project-card-status-label fiori-card-meta-editable shrink-0",
            statusMeta.labelClass,
          )}
          onClick={stopCardEvent}
          onMouseDown={stopCardEvent}
          disabled={isToggling}
          aria-label="Alterar status da janela"
        >
          {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : statusMeta.icon}
          {statusMeta.label}
          <ChevronDown className="w-2.5 h-2.5 opacity-60" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={4}
        className="fiori-dropdown-menu fiori-dropdown-menu--table-rows w-40"
        onClick={stopCardEvent}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuLabel className="fiori-dropdown-menu-label">Status</DropdownMenuLabel>
        {MOCK_STATUS_OPTIONS.map((option) => {
          const isSelected = normalized === option.value;
          return (
            <DropdownMenuItem
              key={option.value}
              className={cn(
                "fiori-dropdown-menu-item",
                isSelected && "fiori-dropdown-menu-item--selected",
              )}
              onSelect={() => {
                if (!isSelected) onChange(option.value);
              }}
            >
              <span className="fiori-status-picker-row-icon" aria-hidden>
                <span className={cn("fiori-select-status-dot", option.dotClass)} />
              </span>
              <span className="fiori-type-picker-row-label">{option.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const MockCard = forwardRef<MockCardHandle, Omit<MockCardProps, 'currentUserId' | 'onDelete'>>(
  ({
    mock, isSelected, onSelect,
    canEdit: canEditProp,
    canLock: canLockProp,
    canClone: canCloneProp,
    canRestart: canRestartProp,
    isAdmin,
    isMaster: _isMaster,
    isProjectLocked = false, projectId,
    isTogglingLoad, objects = [], catalogObjectCount = 0, onToggleLock, onToggleLoadStatus, onClone, onEdit, onView, onToggleActive, onStatusChange, onContextMenu
  }, ref) => {
    const canEdit = canEditProp ?? !!isAdmin;
    const canLock = canLockProp ?? !!isAdmin;
    const canClone = canCloneProp ?? !!isAdmin;
    const canRestart = canRestartProp ?? canEdit;
    const cardRef = useRef<HTMLDivElement>(null);
    const { setSelection } = useSelection();
    const router = useRouter();
    const { toast } = useToast();

    useImperativeHandle(ref, () => ({
      focus: () => cardRef.current?.focus(),
      scrollIntoView: () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    }));

    const handleGestaoClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (isInactive) return;
      onSelect(mock.id);
      setSelection(projectId, mock.id);

      if (catalogObjectCount === 0) {
        toast({
          description:
            "Nenhum objeto cadastrado na gestão de objetos. Cadastre objetos de migração no catálogo antes de gerenciar a janela.",
        });
        router.push("/objetos");
        return;
      }

      router.push("/objetos/gestao");
    };

    const isInactive = isMockInactive(mock);
    const isLocked = isMockLocked(mock) || isProjectLocked;
    const mockSelfLocked = isMockLocked(mock);
    const showOpenPadlock = mockSelfLocked || isProjectLocked;
    const isCargaInProgress = isMockCargaInProgress(mock);
    const isDone = isMockConcluida(mock);
    const canEditStatus = canEdit && !isProjectLocked && !isInactive && (isCargaInProgress || !isMockLocked(mock));
    const isTogglingStatus = isTogglingLoad === mock.id;

    const totalDurationMs = calculateMockTotalDuration(mock, objects);
    const hasDuration = totalDurationMs > 0;

    const fmtDate = (d: string) => format(new Date(d), 'dd/MM/yyyy');
    const fmtTime = (d: string) => format(new Date(d), 'HH:mm');

    return (
      <div
        ref={cardRef}
        tabIndex={0}
        onContextMenu={(e) => onContextMenu(e, mock)}
        onClick={() => onSelect(mock.id)}
        className={cn(
          "fiori-project-card fiori-project-card--neutral-hover group relative overflow-hidden p-3 flex flex-col gap-2.5 select-none",
          isInactive ? "fiori-project-card--readonly cursor-default" : "cursor-pointer",
          isSelected && "fiori-project-card--active"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="fiori-project-card-drag shrink-0 mt-0.5">
              <Package className="w-3.5 h-3.5 shrink-0" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="fiori-project-card-title truncate">
                {mock.name}
              </span>
              <span className="fiori-mock-card-desc">
                {mock.explanatoryText ?? ""}
              </span>
            </div>
          </div>

          <CardStatusControl
            mock={mock}
            editable={canEditStatus && !!onStatusChange}
            isToggling={isTogglingStatus}
            onChange={(status) => onStatusChange?.(mock, status)}
          />
        </div>

        <div className="fiori-mock-card-info">
          <div className="fiori-mock-card-metrics">
            <div className={cn("fiori-mock-card-metric", !mock.startDate && "opacity-50")}>
              <span className="fiori-project-card-metric-label">Início</span>
              {mock.startDate ? (
                <>
                  <span className="fiori-project-card-metric-value">{fmtDate(mock.startDate)}</span>
                  <span className="fiori-mock-card-metric-time">
                    <Clock className="w-2.5 h-2.5" />
                    {fmtTime(mock.startDate)}
                  </span>
                </>
              ) : (
                <span className="fiori-project-card-metric-value">—</span>
              )}
            </div>

            <div className="fiori-project-card-metric-divider" aria-hidden />

            <div className={cn("fiori-mock-card-metric", !mock.endDate && "opacity-50")}>
              <span className="fiori-project-card-metric-label">Fim</span>
              {mock.endDate ? (
                <>
                  <span className="fiori-project-card-metric-value">{fmtDate(mock.endDate)}</span>
                  <span className="fiori-mock-card-metric-time">
                    <Clock className="w-2.5 h-2.5" />
                    {fmtTime(mock.endDate)}
                  </span>
                </>
              ) : (
                <span className="fiori-project-card-metric-value">—</span>
              )}
            </div>
          </div>

          {hasDuration && (
            <>
              <div className="fiori-mock-card-info-divider" aria-hidden />
              <div className="fiori-mock-card-duration">
                <span className="fiori-mock-card-duration-label">
                  <Clock className="w-3 h-3" />
                  Duração total
                </span>
                <span className="fiori-mock-card-duration-value">
                  {renderDuration(totalDurationMs)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="fiori-card-footer flex items-center justify-between gap-2 mt-auto">
          <div className="fiori-card-toolbar">
            {isInactive ? (
              <>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={CARD_TOOLBAR_BTN}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(mock.id);
                        onView(mock);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent variant="fiori">Visualizar janela</TooltipContent>
                </Tooltip>
                {canEdit && !isProjectLocked && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={CARD_TOOLBAR_BTN}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(mock.id);
                          onToggleActive(mock, true);
                        }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent variant="fiori">Reativar janela</TooltipContent>
                  </Tooltip>
                )}
              </>
            ) : (
              <>
            {(canEdit || (isDone && canRestart)) && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      CARD_TOOLBAR_BTN,
                      isCargaInProgress && "fiori-card-toolbar-btn-active",
                      isLocked && "opacity-40"
                    )}
                    disabled={isTogglingLoad === mock.id || isLocked || (isDone && !canRestart) || (!isDone && !canEdit)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(mock.id);
                      if (!isLocked) onToggleLoadStatus(mock);
                    }}
                  >
                    {isTogglingLoad === mock.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isCargaInProgress ? (
                      <StopCircle className="w-3.5 h-3.5" />
                    ) : isDone ? (
                      <RefreshCcw className="w-3.5 h-3.5" />
                    ) : (
                      <PlayCircle className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant="fiori">
                  {isLocked
                    ? "Mock ou projeto bloqueado"
                    : isCargaInProgress
                      ? "Concluir carga"
                      : isDone
                        ? "Reiniciar carga"
                        : "Iniciar carga"}
                </TooltipContent>
              </Tooltip>
            )}

            {canLock && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={
                    isCargaInProgress
                      ? "Bloqueio indisponível durante execução"
                      : isProjectLocked
                        ? "Projeto bloqueado"
                        : mockSelfLocked
                          ? "Desbloquear mock"
                          : "Bloquear mock"
                  }
                  className={cn(
                    CARD_TOOLBAR_BTN,
                    (mockSelfLocked || isProjectLocked) && "fiori-card-toolbar-btn-active",
                    isCargaInProgress && "opacity-40"
                  )}
                  disabled={isCargaInProgress || isProjectLocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(mock.id);
                    if (!isCargaInProgress && !isProjectLocked) onToggleLock(mock);
                  }}
                >
                  {showOpenPadlock ? (
                    <Unlock className="w-3.5 h-3.5" aria-hidden />
                  ) : (
                    <Lock className="w-3.5 h-3.5" aria-hidden />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent variant="fiori" className="max-w-[220px]">
                {isCargaInProgress
                  ? "Mock em execução"
                  : isProjectLocked
                    ? "Projeto bloqueado — desbloqueie em Projetos para alterar o bloqueio da janela."
                    : mockSelfLocked
                      ? "Mock bloqueada — clique para desbloquear."
                      : "Bloquear ou desbloquear"}
              </TooltipContent>
            </Tooltip>
            )}

            {canClone && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    CARD_TOOLBAR_BTN,
                    (isCargaInProgress || isLocked) && "opacity-40"
                  )}
                  disabled={isCargaInProgress || isLocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(mock.id);
                    if (!isCargaInProgress && !isLocked) onClone(mock);
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent variant="fiori">
                {isLocked
                  ? "Mock ou projeto bloqueado"
                  : isCargaInProgress
                    ? "Mock em execução"
                    : "Clonar janela"}
              </TooltipContent>
            </Tooltip>
            )}

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(CARD_TOOLBAR_BTN, isCargaInProgress && "opacity-40")}
                  disabled={isCargaInProgress}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(mock.id);
                    if (!isCargaInProgress) {
                      if (isLocked || !canEdit) onView(mock);
                      else onEdit(mock);
                    }
                  }}
                >
                  {isLocked ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent variant="fiori">
                {isCargaInProgress
                  ? "Mock em execução"
                  : isLocked
                    ? "Visualizar janela"
                    : "Editar janela"}
              </TooltipContent>
            </Tooltip>

            {canEdit && !isProjectLocked && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(CARD_TOOLBAR_BTN, isCargaInProgress && "opacity-40")}
                    disabled={isCargaInProgress}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(mock.id);
                      if (!isCargaInProgress) onToggleActive(mock, false);
                    }}
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant="fiori">
                  {isCargaInProgress ? "Mock em execução" : "Inativar janela"}
                </TooltipContent>
              </Tooltip>
            )}
              </>
            )}
          </div>

          {!isInactive && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGestaoClick}
                className={cn(CARD_TOOLBAR_BTN, "fiori-mock-card-gestao-btn !size-7")}
                aria-label="Gestão"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent variant="fiori">
              Gestão de objetos
            </TooltipContent>
          </Tooltip>
          )}
        </div>
      </div>
    );
  }
);

MockCard.displayName = 'MockCard';
