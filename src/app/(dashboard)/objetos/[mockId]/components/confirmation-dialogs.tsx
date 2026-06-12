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

interface ConfirmationDialogsProps {


  // Global reset
  isGlobalResetOpen: boolean;
  onGlobalResetChange: (open: boolean) => void;
  onGlobalReset: () => void;

  // Reset progress
  isResetProgressOpen: boolean;
  resetProgress: number;
  resetCount: { current: number; total: number };

  // Individual reset
  isIndividualResetOpen: boolean;
  onIndividualResetChange: (open: boolean) => void;
  objectToReset: { name: string } | null;
  onClearObjectToReset: () => void;
  onIndividualReset: () => void;

  // Bulk delete
  isBulkDeleteOpen: boolean;
  onBulkDeleteChange: (open: boolean) => void;
  selectedCount: number;
  onBulkDelete: () => void;

  // Bulk reset
  isBulkResetOpen: boolean;
  onBulkResetChange: (open: boolean) => void;
  onBulkReset: () => void;
}

export function ConfirmationDialogs({
  isGlobalResetOpen, onGlobalResetChange, onGlobalReset,
  isResetProgressOpen, resetProgress, resetCount,
  isIndividualResetOpen, onIndividualResetChange, objectToReset, onClearObjectToReset, onIndividualReset,
  isBulkDeleteOpen, onBulkDeleteChange, selectedCount, onBulkDelete,
  isBulkResetOpen, onBulkResetChange, onBulkReset,
}: ConfirmationDialogsProps) {
  return (
    <>


      <AlertDialog open={isGlobalResetOpen} onOpenChange={onGlobalResetChange}>
        <AlertDialogContent className="rounded-none border-none shadow-2xl bg-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 font-black uppercase tracking-[0.2em] text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> AVISO: RESET TOTAL DAS CARGAS
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-slate-600 text-xs font-medium leading-relaxed pt-2 space-y-3">
                <p>Esta ação irá redefinir permanentemente o estado de carga de <strong>TODOS</strong> os objetos desta mock.</p>
                <div className="bg-red-50 p-4 border-l-4 border-red-500 space-y-2">
                  <p className="font-bold text-red-700 uppercase text-[10px]">Impacto da operação:</p>
                  <ul className="list-disc pl-4 space-y-1 text-red-600 text-[10px] font-bold uppercase">
                    <li>Status de todos os objetos voltará para PENDENTE</li>
                    <li>Datas de início e término serão apagadas</li>
                    <li>TODO o histórico de execuções será removido</li>
                    <li>Métricas de performance serão zeradas</li>
                  </ul>
                </div>
                <p className="font-bold uppercase text-slate-900 text-[10px]">Esta operação não pode ser desfeita. Deseja continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex gap-3">
            <AlertDialogCancel className="rounded-none border-slate-200 text-[10px] font-black uppercase tracking-widest h-10 px-6 hover:bg-slate-100 transition-all">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={onGlobalReset} className="rounded-none bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest h-10 px-6 hover:bg-slate-800 transition-all shadow-lg shadow-red-500/20 border-none">
              REINICIAR TUDO AGORA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isResetProgressOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md rounded-none border-none shadow-2xl bg-white p-0 overflow-hidden">
          <div className="p-8 space-y-6 text-center">
            <DialogHeader className="hidden">
              <DialogTitle>{resetProgress < 100 ? "PROCESSANDO RESET TOTAL" : "RESET CONCLUÍDO"}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              {resetProgress < 100 ? (
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-red-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCcw className="w-6 h-6 text-red-200" />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-full">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900" aria-hidden="true">
                {resetProgress < 100 ? "PROCESSANDO RESET TOTAL" : "RESET CONCLUÍDO"}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {resetProgress < 100
                  ? `REDEFININDO OBJETOS: ${resetCount.current} DE ${resetCount.total}`
                  : "TODOS OS OBJETOS FORAM REINICIADOS COM SUCESSO"}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-slate-700 uppercase">
                <span>PROGRESSO</span>
                <span>{resetProgress}%</span>
              </div>
              <Progress value={resetProgress} className={cn("h-2 bg-slate-100", resetProgress < 100 ? "text-red-500" : "text-emerald-500")} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isIndividualResetOpen} onOpenChange={onIndividualResetChange}>
        <AlertDialogContent className="rounded-none border-none shadow-2xl bg-white max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <Eraser className="w-4 h-4 text-SkyBlue-500" /> REINICIAR OBJETO: {objectToReset?.name}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-[11px] font-medium leading-relaxed pt-2">
              Esta ação irá redefinir o status deste objeto para <strong>PENDENTE</strong> e limpará todo o histórico de carga e datas de execução deste objeto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex gap-2">
            <AlertDialogCancel className="rounded-none border-slate-200 text-[10px] font-black uppercase tracking-widest h-9 px-4 hover:bg-slate-100 transition-all" onClick={onClearObjectToReset}>CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={onIndividualReset} className="rounded-none bg-SkyBlue-600 text-white text-[10px] font-black uppercase tracking-widest h-9 px-4 hover:bg-SkyBlue-700 transition-all border-none">
              CONFIRMAR RESET
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={onBulkDeleteChange}>
        <AlertDialogContent className="rounded-none border-none shadow-2xl bg-white max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> EXCLUIR SELECIONADOS
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-[11px] font-medium leading-relaxed pt-2">
              Tem certeza que deseja remover os <strong>{selectedCount}</strong> objetos selecionados desta mock?
              <br /><br />
              <span className="text-red-500 font-black">ESTA AÇÃO NÃO PODE SER DESFEITA.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex gap-2">
            <AlertDialogCancel className="rounded-none border-slate-200 text-[10px] font-black uppercase tracking-widest h-9 px-4 hover:bg-slate-100 transition-all">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={onBulkDelete} className="rounded-none bg-red-600 text-white text-[10px] font-black uppercase tracking-widest h-9 px-4 hover:bg-red-700 transition-all border-none">
              EXCLUIR AGORA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkResetOpen} onOpenChange={onBulkResetChange}>
        <AlertDialogContent className="rounded-none border-none shadow-2xl bg-white max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <RefreshCcw className="w-4 h-4" /> REINICIAR SELECIONADOS
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-[11px] font-medium leading-relaxed pt-2">
              Esta action irá redefinir o status dos <strong>{selectedCount}</strong> objetos selecionados para <strong>PENDENTE</strong> e limpará todo o histórico de carga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex gap-2">
            <AlertDialogCancel className="rounded-none border-slate-200 text-[10px] font-black uppercase tracking-widest h-9 px-4 hover:bg-slate-100 transition-all">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={onBulkReset} className="rounded-none bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest h-9 px-4 hover:bg-amber-600 transition-all border-none">
              REINICIAR SELECIONADOS
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
