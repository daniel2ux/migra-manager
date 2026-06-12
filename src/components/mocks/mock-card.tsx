"use client";

import {
  Lock, Unlock, RefreshCcw, Package, Clock,
  Copy, Pencil, Eye,
  Zap, CheckCircle2,
  LayoutGrid,
  PlayCircle, StopCircle, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Mock, MigrationObject } from '@/types/migration';
import { renderDuration } from '@/lib/formatters';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelection } from '@/context/selection-context';
import { useRouter } from 'next/navigation';
import { calculateMockTotalDuration, isMockLocked, isMockCargaInProgress, isMockConcluida } from '@/lib/mock-utils';

const CARD_TOOLBAR_BTN =
  "fiori-card-toolbar-btn !rounded-[0.375rem] !size-7 min-h-0 min-w-0";

interface MockCardProps {
  mock: Mock;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isAdmin: boolean;
  isMaster: boolean;
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
  onDelete: (mock: Mock) => void;
  onContextMenu: (e: React.MouseEvent, mock: Mock) => void;
  objects?: MigrationObject[];
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

function getStatusMeta(mock: Mock): StatusMeta {
  const isRunning = isMockCargaInProgress(mock);
  const isDone = isMockConcluida(mock);
  const isLocked = isMockLocked(mock);

  if (isRunning) {
    return {
      label: "Em andamento",
      labelClass: "text-orange-700",
      icon: <Zap className="w-3 h-3 fill-current" />,
    };
  }
  if (isDone) {
    return {
      label: "Concluída",
      labelClass: "text-[#107e3e]",
      icon: <CheckCircle2 className="w-3 h-3" />,
    };
  }
  if (isLocked) {
    return {
      label: "Bloqueado",
      labelClass: "text-amber-700",
      icon: <Lock className="w-3 h-3" />,
    };
  }
  return {
    label: "Pendente",
    labelClass: "text-[#6a6d70]",
    icon: null,
  };
}

export const MockCard = forwardRef<MockCardHandle, Omit<MockCardProps, 'currentUserId' | 'onDelete'>>(
  ({
    mock, isSelected, onSelect, isAdmin, isMaster: _isMaster, isProjectLocked = false, projectId,
    isTogglingLoad, objects = [], onToggleLock, onToggleLoadStatus, onClone, onEdit, onView, onContextMenu
  }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const { setSelection } = useSelection();
    const router = useRouter();

    useImperativeHandle(ref, () => ({
      focus: () => cardRef.current?.focus(),
      scrollIntoView: () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    }));

    const handleGestaoClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect(mock.id);
      setSelection(projectId, mock.id);
      router.push('/objetos/gestao');
    };

    const isLocked = isMockLocked(mock) || isProjectLocked;
    const mockSelfLocked = isMockLocked(mock);
    const showOpenPadlock = mockSelfLocked || isProjectLocked;
    const isCargaInProgress = isMockCargaInProgress(mock);
    const isDone = isMockConcluida(mock);
    const meta = getStatusMeta(mock);

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
          "fiori-project-card fiori-project-card--neutral-hover group relative border border-slate-200 hover:border-slate-400 transition-all duration-300 hover:scale-[1.03] hover:z-10 overflow-hidden bg-white p-3 flex flex-col gap-2.5 select-none cursor-pointer",
          "outline-hidden focus-visible:ring-2 focus-visible:ring-[#0070f2] focus-visible:ring-offset-2",
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

          <div className={cn("fiori-project-card-status-label shrink-0", meta.labelClass)}>
            {meta.icon}
            {meta.label}
          </div>
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
            {isAdmin && (
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
                    disabled={isTogglingLoad === mock.id || isLocked}
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
                      if (isLocked) onView(mock);
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
          </div>

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
        </div>
      </div>
    );
  }
);

MockCard.displayName = 'MockCard';
