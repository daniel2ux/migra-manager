"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Eye, MessageSquare, Pencil, PlayCircle,
  RefreshCcw, ScrollText, StopCircle,
  Terminal, Zap, Ban, RotateCcw, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isMigrationObjectInactive } from "@/lib/mock-utils";
import type { MigrationObject } from "@/types/migration";

interface ContextMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "warning" | "critical";
  disabled?: boolean;
}

function ContextMenuItem({ icon, label, onClick, variant = "default", disabled }: ContextMenuItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "fiori-dropdown-menu-item w-full text-left",
        variant === "warning" && "fiori-dropdown-menu-item--warning",
        variant === "critical" && "fiori-dropdown-menu-item--critical",
        disabled && "pointer-events-none opacity-50",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  );
}

interface ObjectContextMenuProps {
  ctxMenu: { x: number; y: number; obj: MigrationObject } | null;
  onClose: () => void;
  isAdmin: boolean;
  isAdminOrMaster: boolean;
  isMockLocked: boolean;
  isMockInProgress?: boolean;
  isMockCompleted?: boolean;
  onOpenDialog: (obj: MigrationObject) => void;
  onOpenCommentDialog: (obj: MigrationObject) => void;
  onToggleCargaStatus: (obj: MigrationObject) => void;
  onOpenQuickDialog: (obj: MigrationObject) => void;
  onImportLogs: (id: string) => void;
  onViewLogs: (obj: MigrationObject) => void;
  onResetObject: (obj: MigrationObject) => void;
  onToggleActive: (obj: MigrationObject, activate: boolean) => void;
  onRemoveFromMock: (obj: MigrationObject) => void;
}

export function ObjectContextMenu({
  ctxMenu,
  onClose,
  isAdmin,
  isAdminOrMaster,
  isMockLocked,
  isMockInProgress,
  isMockCompleted,
  onOpenDialog,
  onOpenCommentDialog,
  onToggleCargaStatus,
  onOpenQuickDialog,
  onImportLogs,
  onViewLogs,
  onResetObject,
  onToggleActive,
  onRemoveFromMock,
}: ObjectContextMenuProps) {
  const obj = ctxMenu?.obj;

  const successPct = useMemo(() => {
    if (!obj || obj.targetRecordsCount === 0) return 0;
    return Math.min(100, Math.round((obj.successfulRecordsCount / obj.targetRecordsCount) * 100));
  }, [obj]);

  const isInProgress = useMemo(() => {
    if (!obj) return false;
    return (
      obj.status === "CARGA_EM_ANDAMENTO" ||
      (!!obj.chargeStartTime && !obj.chargeEndTime)
    );
  }, [obj]);

  if (!ctxMenu || !obj) return null;

  const isInactive = isMigrationObjectInactive(obj);

  const handleOpenDetail = () => {
    onOpenDialog(obj);
    onClose();
  };

  const handleOpenComment = () => {
    onOpenCommentDialog(obj);
    onClose();
  };

  const handleToggleCarga = () => {
    onToggleCargaStatus(obj);
    onClose();
  };

  const handleReset = () => {
    onResetObject(obj);
    onClose();
  };

  const handleQuickEdit = () => {
    onOpenQuickDialog(obj);
    onClose();
  };

  const handleImportLogs = () => {
    onImportLogs(obj.id);
    onClose();
  };

  const handleViewLogs = () => {
    onViewLogs(obj);
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: ctxMenu.y,
        left: ctxMenu.x,
        zIndex: 9999,
      }}
      className="fiori-dropdown-menu min-w-[13.75rem]"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="fiori-dropdown-menu-label">{obj.name}</p>
      <div className="my-1 h-px bg-[#e5e5e5]" role="separator" />
      <ContextMenuItem
        icon={isAdmin
          ? <Pencil className="h-3.5 w-3.5" />
          : <Eye className="h-3.5 w-3.5" />}
        label={isAdmin ? "Detalhamento e histórico" : "Visualizar detalhamento"}
        onClick={handleOpenDetail}
        disabled={isInProgress}
      />
      {!isInactive && (
      <ContextMenuItem
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        label="Registrar comentário"
        onClick={handleOpenComment}
        disabled={isInProgress}
      />
      )}

      {isInactive && isAdmin && !isMockLocked && (
        <ContextMenuItem
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label="Remover da mock"
          onClick={() => { onRemoveFromMock(obj); onClose(); }}
          variant="critical"
        />
      )}

      {isInactive && isAdmin && !isMockLocked && (
        <ContextMenuItem
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          label="Reativar objeto"
          onClick={() => { onToggleActive(obj, true); onClose(); }}
        />
      )}

      {!isInactive && isAdmin && !isMockLocked && !isInProgress && (
        <ContextMenuItem
          icon={<Ban className="h-3.5 w-3.5" />}
          label="Inativar objeto"
          onClick={() => { onToggleActive(obj, false); onClose(); }}
        />
      )}

      {!isInactive && isAdmin && !isMockLocked && isMockInProgress && (
        <>
          <div className="my-1 h-px bg-[#e5e5e5]" role="separator" />
          <ContextMenuItem
            icon={isInProgress
              ? <StopCircle className="h-3.5 w-3.5" />
              : <PlayCircle className="h-3.5 w-3.5" />}
            label={isInProgress
              ? "Finalizar execução"
              : obj.status === "CARGA_CONCLUIDA"
                ? "Reprocessar carga"
                : "Iniciar carga"}
            onClick={handleToggleCarga}
            variant={isInProgress ? "warning" : "default"}
          />
          {!isMockCompleted && (
            <ContextMenuItem
              icon={<RefreshCcw className="h-3.5 w-3.5" />}
              label="Reiniciar objeto"
              onClick={handleReset}
              variant="critical"
              disabled={isInProgress}
            />
          )}
        </>
      )}

      {isAdminOrMaster && !isMockLocked && !isMockCompleted && !isInactive && (
        <ContextMenuItem
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Edição rápida"
          onClick={handleQuickEdit}
          disabled={isInProgress}
        />
      )}

      {isAdminOrMaster && !isMockLocked && !isMockCompleted && !isInactive && successPct < 100 && (
        <ContextMenuItem
          icon={<Terminal className="h-3.5 w-3.5" />}
          label="Importar logs"
          onClick={handleImportLogs}
          disabled={isInProgress}
        />
      )}

      {successPct < 100 && obj.hasTechLogs && (
        <>
          <div className="my-1 h-px bg-[#e5e5e5]" role="separator" />
          <ContextMenuItem
            icon={<ScrollText className="h-3.5 w-3.5" />}
            label="Relatório de erros"
            onClick={handleViewLogs}
            variant="critical"
            disabled={isInProgress}
          />
        </>
      )}
    </div>,
    document.body
  );
}
