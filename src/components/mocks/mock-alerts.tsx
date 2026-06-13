"use client";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, RefreshCcw, Trash2, Loader2, Lock, Unlock
} from 'lucide-react';
import { Mock } from "@/types/migration";
import { cn } from "@/lib/utils";
import {
  dashboardAlertDialogContentProps,
  dashboardDialogContentProps,
  dashboardDialogRootProps,
} from "@/lib/dashboard/scroll-preservation";

const BULK_RESTART_EFFECTS = [
  "Objetos de migração da janela",
  "Histórico de comentários e observações",
  "Status e progresso de carga dos objetos",
] as const;

const BULK_DELETE_EFFECTS = [
  "Janela e configurações associadas",
  "Objetos de migração vinculados",
  "Histórico de comentários e carga",
] as const;

function MockAlertContext({ description }: { description?: string | null }) {
  const text = description?.trim();
  if (!text) return null;
  return <p className="fiori-message-box-context">{text}</p>;
}

interface MockAlertsProps {
  // Carga Confirm
  isCargaConfirmOpen: boolean;
  setIsCargaConfirmOpen: (open: boolean) => void;
  loadStatusToConfirm: Mock | null;
  confirmFinalizeCarga: () => void;

  // Restart Confirm
  isRestartConfirmOpen: boolean;
  setIsRestartConfirmOpen: (open: boolean) => void;
  mockToRestart: Mock | null;
  handleConfirmRestart: () => void;

  // Bulk Delete
  isBulkDeleteConfirmOpen: boolean;
  setIsBulkDeleteConfirmOpen: (open: boolean) => void;
  selectedMockName?: string;
  selectedMockDescription?: string;
  handleBulkDelete: () => void;

  // Bulk Restart
  isBulkRestartConfirmOpen: boolean;
  setIsBulkRestartConfirmOpen: (open: boolean) => void;
  isBulkReseting: boolean;
  handleBulkReset: () => void;

  // Force Lock
  isForceLockOpen: boolean;
  setIsForceLockOpen: (open: boolean) => void;
  forceLockBlockerName: string | null;
  handleForceAcquire: () => void;
}

export function MockAlerts({
  isCargaConfirmOpen, setIsCargaConfirmOpen, loadStatusToConfirm, confirmFinalizeCarga,
  isRestartConfirmOpen, setIsRestartConfirmOpen, mockToRestart, handleConfirmRestart,
  isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen, selectedMockName, selectedMockDescription, handleBulkDelete,
  isBulkRestartConfirmOpen, setIsBulkRestartConfirmOpen, isBulkReseting, handleBulkReset,
  isForceLockOpen, setIsForceLockOpen, forceLockBlockerName, handleForceAcquire
}: MockAlertsProps) {
  return (
    <>
      {/* Finalize Carga Alert */}
      <AlertDialog open={isCargaConfirmOpen} onOpenChange={setIsCargaConfirmOpen} {...dashboardDialogRootProps}>
        <AlertDialogContent variant="fiori" open={isCargaConfirmOpen} {...dashboardAlertDialogContentProps}>
          <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className="fiori-dialog-icon shrink-0">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle variant="fiori">Finalizar carga de dados</AlertDialogTitle>
                <AlertDialogDescription variant="fiori" className="truncate pt-0">
                  {loadStatusToConfirm?.name ?? "—"}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="fiori-message-box-body">
            <MockAlertContext description={loadStatusToConfirm?.explanatoryText} />
            <p className="fiori-message-box-text">
              Deseja finalizar a carga desta janela? O horário de término será registrado
              e o status passará para concluído.
            </p>
          </div>

          <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <AlertDialogCancel variant="fiori">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction variant="fiori" onClick={confirmFinalizeCarga}>
              Confirmar e finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restart Ciclo Alert */}
      <AlertDialog open={isRestartConfirmOpen} onOpenChange={setIsRestartConfirmOpen} {...dashboardDialogRootProps}>
        <AlertDialogContent variant="fiori" open={isRestartConfirmOpen} {...dashboardAlertDialogContentProps}>
          <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className="fiori-dialog-icon fiori-dialog-icon--warning shrink-0">
                <RefreshCcw className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle variant="fiori">Reiniciar carga da janela</AlertDialogTitle>
                <AlertDialogDescription variant="fiori" className="truncate pt-0">
                  {mockToRestart?.name ?? "—"}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="fiori-message-box-body">
            <MockAlertContext description={mockToRestart?.explanatoryText} />
            <p className="fiori-message-box-text">
              A carga voltará para <strong>Em andamento</strong>. As datas e demais
              informações da janela serão mantidas.
            </p>
          </div>

          <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <AlertDialogCancel variant="fiori">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="fiori"
              onClick={handleConfirmRestart}
              className="fiori-btn-emphasized--warning"
            >
              Reiniciar carga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Alert */}
      <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen} {...dashboardDialogRootProps}>
        <AlertDialogContent variant="fiori" open={isBulkDeleteConfirmOpen} {...dashboardAlertDialogContentProps}>
          <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
                <Trash2 className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle variant="fiori">Excluir janela selecionada</AlertDialogTitle>
                <AlertDialogDescription variant="fiori" className="truncate pt-0">
                  {selectedMockName ?? "—"}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="fiori-message-box-body">
            <MockAlertContext description={selectedMockDescription} />
            <p className="fiori-message-box-text">
              Esta ação é irreversível e remove permanentemente a janela e todos os dados
              associados.
            </p>

            <ul className="fiori-message-box-effects">
              {BULK_DELETE_EFFECTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <AlertDialogCancel variant="fiori">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="fiori"
              onClick={handleBulkDelete}
              className="fiori-btn-emphasized--negative"
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Restart Alert */}
      <AlertDialog
        open={isBulkRestartConfirmOpen}
        onOpenChange={(open) => !isBulkReseting && setIsBulkRestartConfirmOpen(open)}
        {...dashboardDialogRootProps}
      >
        <AlertDialogContent variant="fiori" open={isBulkRestartConfirmOpen} {...dashboardAlertDialogContentProps}>
          <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className="fiori-dialog-icon fiori-dialog-icon--warning shrink-0">
                <RefreshCcw className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle variant="fiori">Reiniciar objetos da janela</AlertDialogTitle>
                <AlertDialogDescription variant="fiori" className="truncate pt-0">
                  {selectedMockName ?? "—"}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="fiori-message-box-body">
            <MockAlertContext description={selectedMockDescription} />
            <p className="fiori-message-box-text">
              Tem certeza que deseja reiniciar os objetos desta janela? Os dados de carga
              serão apagados e os objetos voltarão ao estado inicial.
            </p>

            <ul className="fiori-message-box-effects">
              {BULK_RESTART_EFFECTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <AlertDialogCancel variant="fiori" disabled={isBulkReseting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="fiori"
              disabled={isBulkReseting}
              onClick={(e) => { e.preventDefault(); handleBulkReset(); }}
              className={cn("fiori-btn-emphasized--warning", isBulkReseting && "gap-2")}
            >
              {isBulkReseting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Reiniciando…
                </>
              ) : (
                "Confirmar reinicialização"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Unlock Dialog */}
      <Dialog open={isForceLockOpen} onOpenChange={setIsForceLockOpen} {...dashboardDialogRootProps}>
        <DialogContent
          open={isForceLockOpen}
          className="sm:max-w-[380px] rounded-none"
          {...dashboardDialogContentProps}
        >
          <DialogHeader>
            <AlertDialogTitle className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900/80 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-amber-500" /> FORÇAR LIBERAÇÃO DE TRAVA
            </AlertDialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-2">
            <Lock className="w-10 h-10 text-amber-200 mx-auto" />
            <p className="text-[11px] text-slate-600">
              A janela está bloqueada por <strong className="text-amber-600">{forceLockBlockerName}</strong>. Deseja forçar a liberação?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsForceLockOpen(false)} className="font-bold uppercase text-[10px] tracking-widest h-9 px-6 hover:bg-slate-200 rounded-none">
              CANCELAR
            </Button>
            <Button onClick={handleForceAcquire} className="bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] tracking-widest h-9 px-8 transition-all active:scale-95 rounded-none">
              FORÇAR LIBERAÇÃO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
