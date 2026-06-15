"use client";

import {
  Lock, Unlock, RotateCcw, ExternalLink, Pencil, Trash2,
  FolderOpen, Zap, CheckCircle2,
  PlayCircle, StopCircle, Loader2, ChevronDown, Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dispatchProjectChange } from '@/hooks/use-active-project-id';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isProjectInactive } from '@/lib/project-utils';

const CARD_TOOLBAR_BTN =
  "fiori-card-toolbar-btn !rounded-[0.375rem] !size-7 min-h-0 min-w-0";

export type ProjectExecutionStatus = "ATIVO" | "EM_EXECUCAO" | "ENCERRADO";

interface ProjectCardProps {
  project: any;
  canEdit?: boolean;
  canLock?: boolean;
  canDelete?: boolean;
  canReset?: boolean;
  membersCount: number;
  mocksCount: number;
  hasMocksInProgress?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
  onToggleLock: () => void;
  onToggleStatus?: () => void;
  onStatusChange?: (status: ProjectExecutionStatus) => void;
  onToggleActive?: (activate: boolean) => void;
  isToggling?: boolean;
  isActive?: boolean;
}

type StatusMeta = {
  label: string;
  labelClass: string;
  icon: React.ReactNode;
};

const PROJECT_STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativo", dotClass: "fiori-select-status-dot--success" },
  { value: "EM_EXECUCAO", label: "Em execução", dotClass: "fiori-select-status-dot--warning" },
  { value: "ENCERRADO", label: "Encerrado", dotClass: "fiori-select-status-dot--neutral" },
] as const;

function stopCardEvent(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function resolveProjectExecutionStatus(
  project: { executionStatus?: string },
  hasMocksInProgress: boolean,
): ProjectExecutionStatus {
  const status = project.executionStatus;
  if (status === "EM_EXECUCAO" || status === "ENCERRADO" || status === "ATIVO") return status;
  return hasMocksInProgress ? "EM_EXECUCAO" : "ATIVO";
}

function getStatusMeta(
  isLocked: boolean,
  executionStatus: ProjectExecutionStatus,
  inactive: boolean,
): StatusMeta {
  if (inactive) {
    return {
      label: "Inativo",
      labelClass: "text-[#6a6d70]",
      icon: null,
    };
  }

  if (isLocked) {
    return {
      label: "Bloqueado",
      labelClass: "text-amber-700",
      icon: <Lock className="w-3 h-3" />,
    };
  }

  if (executionStatus === "EM_EXECUCAO") {
    return {
      label: "Em execução",
      labelClass: "text-orange-700",
      icon: <Zap className="w-3 h-3 fill-current" />,
    };
  }

  if (executionStatus === "ENCERRADO") {
    return {
      label: "Encerrado",
      labelClass: "text-[#0070f2]",
      icon: <CheckCircle2 className="w-3 h-3" />,
    };
  }

  return {
    label: "Ativo",
    labelClass: "text-[#107e3e]",
    icon: <CheckCircle2 className="w-3 h-3" />,
  };
}

function CardStatusControl({
  isLocked,
  executionStatus,
  inactive,
  editable,
  isToggling,
  onChange,
}: {
  isLocked: boolean;
  executionStatus: ProjectExecutionStatus;
  inactive: boolean;
  editable: boolean;
  isToggling: boolean;
  onChange: (status: ProjectExecutionStatus) => void;
}) {
  const meta = getStatusMeta(isLocked, executionStatus, inactive);

  if (!editable) {
    return (
      <div className={cn("fiori-project-card-status-label shrink-0", meta.labelClass)}>
        {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : meta.icon}
        {meta.label}
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
            meta.labelClass,
          )}
          onClick={stopCardEvent}
          onMouseDown={stopCardEvent}
          disabled={isToggling}
          aria-label="Alterar status do projeto"
        >
          {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : meta.icon}
          {meta.label}
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
        {PROJECT_STATUS_OPTIONS.map((option) => {
          const isSelected = executionStatus === option.value;
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

export function ProjectCard({
  project,
  canEdit = false,
  canLock = false,
  canDelete = false,
  canReset = false,
  membersCount,
  mocksCount,
  hasMocksInProgress = false,
  onEdit,
  onDelete,
  onReset,
  onToggleLock,
  onToggleStatus,
  onStatusChange,
  onToggleActive,
  isToggling = false,
  isActive = false,
  onSelect,
}: ProjectCardProps & { onSelect?: () => void }) {
  const isLocked = project.isLocked;
  const isInactive = isProjectInactive(project);
  const executionStatus = resolveProjectExecutionStatus(project, hasMocksInProgress);
  const isExecuting = executionStatus === "EM_EXECUCAO";
  const canEditStatus = canEdit && !isLocked && !isInactive;
  const showToolbar = canEdit || canLock || canReset || canDelete;

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
        if (isInactive) return;
        const target = e.target as HTMLElement;
        const clickedButton = target.closest("button");
        const clickedLink = target.closest("a");
        const isDragHandle = target.closest('[title="Arraste para reordenar"]');
        if (!clickedButton && !clickedLink && !isDragHandle && onSelect) {
          onSelect();
        }
      }}
      className={cn(
        "fiori-project-card group relative overflow-hidden p-3 flex flex-col gap-2.5 select-none",
        isInactive
          ? "fiori-project-card--inactive fiori-project-card--readonly cursor-default"
          : "fiori-project-card--neutral-hover cursor-pointer",
        isActive && !isInactive && "fiori-project-card--active",
        isDragging && "fiori-project-card--dragging"
      )}
    >
      <div className="fiori-project-card-header flex items-center gap-2 min-w-0">
        <div
          {...listeners}
          className="fiori-project-card-drag shrink-0"
          title="Arraste para reordenar"
        >
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
        </div>
        <span className="fiori-project-card-title truncate min-w-0 flex-1">
          {project.name}
        </span>
        <CardStatusControl
          isLocked={isLocked}
          executionStatus={executionStatus}
          inactive={isInactive}
          editable={canEditStatus && !!onStatusChange}
          isToggling={isToggling}
          onChange={(status) => onStatusChange?.(status)}
        />
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
          {showToolbar && (
            <>
              {isInactive ? (
                canEdit && !isLocked && onToggleActive && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={CARD_TOOLBAR_BTN}
                        disabled={isToggling}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleActive(true);
                        }}
                      >
                        {isToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent variant="fiori">Reativar projeto</TooltipContent>
                  </Tooltip>
                )
              ) : (
                <>
              {canEditStatus && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      CARD_TOOLBAR_BTN,
                      isExecuting && "fiori-card-toolbar-btn-active",
                    )}
                    disabled={isToggling}
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
                  {isExecuting ? "Concluir execução" : "Iniciar execução"}
                </TooltipContent>
              </Tooltip>
              )}

              {canEdit && (
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
              )}

              {canLock && (
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
              )}

              {canReset && (
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
              )}

              {canDelete && (
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
              )}

              {canEdit && !isLocked && onToggleActive && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(CARD_TOOLBAR_BTN, isExecuting && "opacity-40")}
                      disabled={isToggling || isExecuting}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isExecuting) onToggleActive(false);
                      }}
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent variant="fiori">
                    {isExecuting ? "Projeto em execução" : "Inativar projeto"}
                  </TooltipContent>
                </Tooltip>
              )}
                </>
              )}
            </>
          )}
        </div>

        {!isInactive && (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/mocks"
              onClick={(e) => {
                e.stopPropagation();
                dispatchProjectChange(project.id);
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="fiori-project-card-mocks-btn shadow-none"
                aria-label="Mocks"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent variant="fiori">Mocks</TooltipContent>
        </Tooltip>
        )}
        {isInactive && canEdit && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="fiori-project-card-mocks-btn shadow-none opacity-40"
                disabled
                aria-label="Mocks indisponíveis"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent variant="fiori">Projeto inativo</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
