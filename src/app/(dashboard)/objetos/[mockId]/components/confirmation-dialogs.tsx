"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Eraser, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GLOBAL_RESET_EFFECTS = [
  "Status de todos os objetos volta para PENDENTE",
  "Datas de início e término serão apagadas",
  "Todo o histórico de execuções será removido",
  "Métricas de performance serão zeradas",
] as const;

const INDIVIDUAL_RESET_EFFECTS = [
  "Status do objeto volta para PENDENTE",
  "Histórico de carga será removido",
  "Datas de início e término serão apagadas",
] as const;

const BULK_RESET_EFFECTS = [
  "Status dos objetos selecionados volta para PENDENTE",
  "Histórico de carga será removido",
  "Datas de execução serão apagadas",
] as const;

const BULK_DELETE_EFFECTS = [
  "Objetos removidos desta mock",
  "Comentários e dados de execução associados",
] as const;

interface ConfirmationDialogsProps {
  isGlobalResetOpen: boolean;
  onGlobalResetChange: (open: boolean) => void;
  onGlobalReset: () => void;

  isResetProgressOpen: boolean;
  resetProgress: number;
  resetCount: { current: number; total: number };

  isIndividualResetOpen: boolean;
  onIndividualResetChange: (open: boolean) => void;
  objectToReset: { name: string } | null;
  onClearObjectToReset: () => void;
  onIndividualReset: () => void;

  isRemoveFromMockOpen: boolean;
  onRemoveFromMockChange: (open: boolean) => void;
  objectToRemove: { name: string } | null;
  onClearObjectToRemove: () => void;
  onConfirmRemoveFromMock: () => void;

  isBulkDeleteOpen: boolean;
  onBulkDeleteChange: (open: boolean) => void;
  selectedCount: number;
  onBulkDelete: () => void;

  isBulkResetOpen: boolean;
  onBulkResetChange: (open: boolean) => void;
  onBulkReset: () => void;
}

export function ConfirmationDialogs({
  isGlobalResetOpen, onGlobalResetChange, onGlobalReset,
  isResetProgressOpen, resetProgress, resetCount,
  isIndividualResetOpen, onIndividualResetChange, objectToReset, onClearObjectToReset, onIndividualReset,
  isRemoveFromMockOpen, onRemoveFromMockChange, objectToRemove, onClearObjectToRemove, onConfirmRemoveFromMock,
  isBulkDeleteOpen, onBulkDeleteChange, selectedCount, onBulkDelete,
  isBulkResetOpen, onBulkResetChange, onBulkReset,
}: ConfirmationDialogsProps) {
  return (
    <>
      <AlertDialog preserveDashboardScroll open={isGlobalResetOpen} onOpenChange={onGlobalResetChange}>
        <AlertDialogContent open={isGlobalResetOpen} variant="fiori" className="max-w-md">
          <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
                <AlertCircle className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle variant="fiori">Reiniciar todas as cargas</AlertDialogTitle>
                <AlertDialogDescription variant="fiori" className="pt-0">
                  Reset total da mock
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="fiori-message-box-body">
            <p className="fiori-message-box-text">
              Esta ação irá redefinir permanentemente o estado de carga de todos os objetos desta mock.
              Esta operação não pode ser desfeita.
            </p>
            <ul className="fiori-message-box-effects">
              {GLOBAL_RESET_EFFECTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <AlertDialogCancel variant="fiori">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="fiori"
              onClick={onGlobalReset}
              className="fiori-btn-emphasized--negative"
            >
              Reiniciar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog preserveDashboardScroll open={isResetProgressOpen} onOpenChange={() => {}}>
        <DialogContent open={isResetProgressOpen} className="fiori-dialog fiori-message-box flex max-w-md flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]">
          <div className="p-8 space-y-6 text-center">
            <DialogHeader className="hidden">
              <DialogTitle>{resetProgress < 100 ? "Processando reset total" : "Reset concluído"}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              {resetProgress < 100 ? (
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-[var(--fiori-brand)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCcw className="h-6 w-6 text-[var(--fiori-brand-light)]" />
                  </div>
                </div>
              ) : (
                <div className="rounded-full bg-[#f1fdf6] p-4">
                  <CheckCircle2 className="h-12 w-12 text-[#107e3e]" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--fiori-text)]" aria-hidden="true">
                {resetProgress < 100 ? "Processando reset total" : "Reset concluído"}
              </h3>
              <p className="text-xs text-[var(--fiori-label)]">
                {resetProgress < 100
                  ? `Redefinindo objetos: ${resetCount.current} de ${resetCount.total}`
                  : "Todos os objetos foram reiniciados com sucesso."}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-[var(--fiori-text)]">
                <span>Progresso</span>
                <span>{resetProgress}%</span>
              </div>
              <Progress
                value={resetProgress}
                className={cn("h-2 bg-[#f5f6f7]", resetProgress < 100 ? "text-[var(--fiori-brand)]" : "text-[#107e3e]")}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog preserveDashboardScroll
        open={isIndividualResetOpen}
        onOpenChange={(open) => {
          onIndividualResetChange(open);
          if (!open) onClearObjectToReset();
        }}
      >
        <AlertDialogContent open={isGlobalResetOpen} variant="fiori" className="max-w-md">
          <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className="fiori-dialog-icon fiori-dialog-icon--warning shrink-0">
                <Eraser className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle variant="fiori">Reiniciar objeto</AlertDialogTitle>
                <AlertDialogDescription variant="fiori" className="truncate pt-0">
                  {objectToReset?.name ?? "—"}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="fiori-message-box-body">
            <p className="fiori-message-box-text">
              Esta ação irá redefinir o status deste objeto para PENDENTE e limpará todo o
              histórico de carga e datas de execução.
            </p>
            <ul className="fiori-message-box-effects">
              {INDIVIDUAL_RESET_EFFECTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <AlertDialogCancel variant="fiori">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="fiori"
              onClick={onIndividualReset}
              className="fiori-btn-emphasized--warning"
            >
              Confirmar reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        preserveDashboardScroll
        open={isRemoveFromMockOpen}
        onOpenChange={(open) => {
          onRemoveFromMockChange(open);
          if (!open) onClearObjectToRemove();
        }}
      >
        <AlertDialogContent open={isRemoveFromMockOpen} variant="fiori" className="max-w-md">
          <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
                <Trash2 className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle variant="fiori">Remover da mock</AlertDialogTitle>
                <AlertDialogDescription variant="fiori" className="truncate pt-0">
                  {objectToRemove?.name ?? "—"}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="fiori-message-box-body">
            <p className="fiori-message-box-text">
              Tem certeza que deseja remover este objeto desta mock?
              O cadastro mestre no catálogo não será excluído.
            </p>
            <ul className="fiori-message-box-effects">
              {BULK_DELETE_EFFECTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <AlertDialogCancel variant="fiori">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="fiori"
              onClick={onConfirmRemoveFromMock}
              className="fiori-btn-emphasized--negative"
            >
              Remover agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog preserveDashboardScroll open={isBulkDeleteOpen} onOpenChange={onBulkDeleteChange}>
        <AlertDialogContent open={isGlobalResetOpen} variant="fiori" className="max-w-md">
          <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
                <Trash2 className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle variant="fiori">Excluir selecionados</AlertDialogTitle>
                <AlertDialogDescription variant="fiori" className="pt-0">
                  {selectedCount} objeto{selectedCount !== 1 ? "s" : ""}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="fiori-message-box-body">
            <p className="fiori-message-box-text">
              Tem certeza que deseja remover os objetos selecionados desta mock?
              Esta ação não pode ser desfeita.
            </p>
            <ul className="fiori-message-box-effects">
              {BULK_DELETE_EFFECTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <AlertDialogCancel variant="fiori">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="fiori"
              onClick={onBulkDelete}
              className="fiori-btn-emphasized--negative"
            >
              Excluir agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog preserveDashboardScroll open={isBulkResetOpen} onOpenChange={onBulkResetChange}>
        <AlertDialogContent open={isGlobalResetOpen} variant="fiori" className="max-w-md">
          <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className="fiori-dialog-icon fiori-dialog-icon--warning shrink-0">
                <RefreshCcw className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle variant="fiori">Reiniciar selecionados</AlertDialogTitle>
                <AlertDialogDescription variant="fiori" className="pt-0">
                  {selectedCount} objeto{selectedCount !== 1 ? "s" : ""}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="fiori-message-box-body">
            <p className="fiori-message-box-text">
              Esta ação irá redefinir o status dos objetos selecionados para PENDENTE e limpará
              todo o histórico de carga.
            </p>
            <ul className="fiori-message-box-effects">
              {BULK_RESET_EFFECTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <AlertDialogCancel variant="fiori">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="fiori"
              onClick={onBulkReset}
              className="fiori-btn-emphasized--warning"
            >
              Reiniciar selecionados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
