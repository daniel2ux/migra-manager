"use client";

import {
  Lock, Unlock, RotateCcw, ExternalLink, Pencil, Trash2,
  FolderOpen, Zap, CheckCircle2,
  PlayCircle, StopCircle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dispatchProjectChange } from '@/hooks/use-active-project-id';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FioriSemaphore, type FioriSemaphoreVariant } from '@/components/fiori/fiori-semaphore';

const CARD_TOOLBAR_BTN =
  "fiori-card-toolbar-btn !rounded-[0.375rem] !size-7 min-h-0 min-w-0";

interface ProjectCardProps {
  project: any;
  isAdmin: boolean;
  isMaster: boolean;
  membersCount: number;
  mocksCount: number;
  hasMocksInProgress?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
  onToggleLock: () => void;
  onToggleStatus?: () => void;
  isToggling?: boolean;
  isActive?: boolean;
}

function getStatusMeta(isLocked: boolean, executionStatus?: string) {
  if (isLocked) {
    return {
      semaphore: "critical" as FioriSemaphoreVariant,
      label: "Bloqueado",
      labelClass: "text-amber-700",
      icon: <Lock className="w-3 h-3" />,
      pulse: false,
    };
  }

  if (executionStatus === "EM_EXECUCAO") {
    return {
      semaphore: "warning" as FioriSemaphoreVariant,
      label: "Em execução",
      labelClass: "text-orange-700",
      icon: <Zap className="w-3 h-3 fill-current" />,
      pulse: true,
    };
  }

  if (executionStatus === "ENCERRADO") {
    return {
      semaphore: "informative" as FioriSemaphoreVariant,
      label: "Encerrado",
      labelClass: "text-[#0070f2]",
      icon: <CheckCircle2 className="w-3 h-3" />,
      pulse: false,
    };
  }

  return {
    semaphore: "positive" as FioriSemaphoreVariant,
    label: "Ativo",
    labelClass: "text-[#107e3e]",
    icon: <CheckCircle2 className="w-3 h-3" />,
    pulse: false,
  };
}

export function ProjectCard({
  project,
  isAdmin,
  membersCount,
  mocksCount,
  hasMocksInProgress = false,
  onEdit,
  onDelete,
  onReset,
  onToggleLock,
  onToggleStatus,
  isToggling = false,
  isActive = false,
  onSelect,
}: ProjectCardProps & { onSelect?: () => void }) {
  const isLocked = project.isLocked;
  const executionStatus = project.executionStatus || (hasMocksInProgress ? "EM_EXECUCAO" : "ATIVO");
  const meta = getStatusMeta(isLocked, executionStatus);
  const isExecuting = executionStatus === "EM_EXECUCAO";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : (isLocked ? 0.85 : 1),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-selectable="true"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const clickedButton = target.closest("button");
        const clickedLink = target.closest("a");
        const isDragHandle = target.closest('[title="Arraste para reordenar"]');
        if (!clickedButton && !clickedLink && !isDragHandle && onSelect) {
          onSelect();
        }
      }}
      className={cn(
        "fiori-project-card fiori-project-card--neutral-hover group relative border border-slate-200 hover:border-slate-400 transition-all duration-300 hover:scale-[1.03] hover:z-10 overflow-hidden bg-white p-3 flex flex-col gap-2.5 select-none cursor-pointer",
        "outline-hidden focus-visible:ring-2 focus-visible:ring-[#0070f2] focus-visible:ring-offset-2",
        isActive && "fiori-project-card--active",
        isDragging && "fiori-project-card--dragging"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            {...listeners}
            className="fiori-project-card-drag shrink-0"
            title="Arraste para reordenar"
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="fiori-project-card-title truncate">
              {project.name}
            </span>
          </div>
        </div>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="fiori-project-card-status-dot border-0 bg-transparent p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <FioriSemaphore variant={meta.semaphore} pulse={meta.pulse} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" variant="fiori">
            {meta.label}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className={cn("fiori-project-card-status-label", meta.labelClass)}>
        {meta.icon}
        {meta.label}
      </div>

      <div className="fiori-project-card-metrics fiori-project-card-metrics--inline">
        <div className={cn("fiori-project-card-metric", !project.company && "opacity-50")}>
          <span className="fiori-project-card-metric-label">Empresa</span>
          <span className="fiori-project-card-metric-value">
            {project.company || "—"}
          </span>
        </div>

        <div className="fiori-project-card-metric-divider" aria-hidden />

        <div className="fiori-project-card-metric">
          <span className="fiori-project-card-metric-label">Membros</span>
          <span className="fiori-project-card-metric-value">{membersCount}</span>
        </div>

        <div className="fiori-project-card-metric-divider" aria-hidden />

        <div className="fiori-project-card-metric">
          <span className="fiori-project-card-metric-label">Mocks</span>
          <span className="fiori-project-card-metric-value">{mocksCount}</span>
        </div>
      </div>

      <div className="fiori-card-footer flex items-center justify-between gap-2 mt-auto">
        <div className="fiori-card-toolbar">
          {isAdmin && (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      CARD_TOOLBAR_BTN,
                      isExecuting && "fiori-card-toolbar-btn-active",
                      isLocked && "opacity-40"
                    )}
                    disabled={isToggling || isLocked}
                    onClick={(e) => { e.stopPropagation(); onToggleStatus?.(); }}
                  >
                    {isToggling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isExecuting ? (
                      <StopCircle className="w-3.5 h-3.5" />
                    ) : (
                      <PlayCircle className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant="fiori">
                  {isLocked ? "Projeto bloqueado" : isExecuting ? "Concluir execução" : "Iniciar execução"}
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(CARD_TOOLBAR_BTN, isLocked && "opacity-40")}
                    disabled={isLocked}
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant="fiori">
                  {isLocked ? "Projeto bloqueado" : "Editar projeto"}
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      CARD_TOOLBAR_BTN,
                      isLocked && "fiori-card-toolbar-btn-active"
                    )}
                    disabled={isExecuting || isToggling}
                    onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                  >
                    {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant="fiori">
                  {isLocked ? "Desbloquear projeto" : "Bloquear projeto"}
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      CARD_TOOLBAR_BTN,
                      (isExecuting || isLocked) && "opacity-40"
                    )}
                    disabled={isExecuting || isLocked}
                    onClick={(e) => { e.stopPropagation(); onReset(); }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant="fiori">
                  {isLocked ? "Projeto bloqueado" : "Reiniciar projeto"}
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      CARD_TOOLBAR_BTN,
                      "fiori-card-toolbar-btn-danger",
                      (isExecuting || isLocked) && "opacity-40"
                    )}
                    disabled={isExecuting || isLocked}
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant="fiori">
                  {isExecuting ? "Projeto em execução" : isLocked ? "Projeto bloqueado" : "Excluir projeto"}
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        <Link
          href="/mocks"
          onClick={(e) => {
            e.stopPropagation();
            dispatchProjectChange(project.id);
          }}
        >
          <Button variant="ghost" className="fiori-project-card-mocks-btn shadow-none">
            <span>Mocks</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
