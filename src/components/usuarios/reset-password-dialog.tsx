"use client";

import { Loader2, KeyRound, Check, Copy, AlertTriangle, Trash2 } from "lucide-react";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { UserProfile, ResetPasswordResult } from "@/types/usuarios";

interface ResetPasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserProfile | null;
  onConfirm: () => Promise<void>;
  isResetting: boolean;
}

export function ResetPasswordConfirmDialog({
  open,
  onOpenChange,
  targetUser,
  onConfirm,
  isResetting,
}: ResetPasswordConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent variant="fiori" overlayClassName="fiori-dialog-overlay">
        <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
          <div className="flex items-center gap-3">
            <div className="fiori-dialog-icon fiori-dialog-icon--warning shrink-0">
              <AlertTriangle className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle variant="fiori">Reset de senha</AlertDialogTitle>
              <AlertDialogDescription variant="fiori" className="truncate pt-0">
                {targetUser?.name || targetUser?.email || "—"}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="fiori-message-box-body">
          <p className="fiori-message-box-text">
            Deseja resetar a senha deste profissional? Uma senha temporária será gerada
            e exibida na sequência.
          </p>
        </div>

        <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
          <AlertDialogCancel variant="fiori" disabled={isResetting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="fiori"
            disabled={isResetting}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            className="fiori-btn-emphasized--warning inline-flex items-center gap-1.5"
          >
            {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            Confirmar reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ResetPasswordResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ResetPasswordResult | null;
  onCopy: () => Promise<void>;
  copied: boolean;
}

export function ResetPasswordResultDialog({
  open,
  onOpenChange,
  result,
  onCopy,
  copied,
}: ResetPasswordResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="fiori"
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog fiori-dialog--form flex w-[calc(100vw-1rem)] max-w-md flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            Senha temporária gerada com sucesso
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <KeyRound className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="fiori-dialog-title">Senha gerada</DialogTitle>
              <p className="fiori-dialog-subtitle truncate">
                {result?.name || "Profissional"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-dialog-body space-y-4">
          <p className="fiori-message-box-text m-0">
            Copie a senha temporária abaixo e repasse ao profissional de forma segura.
          </p>

          <div className="fiori-id-preview items-center gap-2">
            <code className="fiori-id-preview-value min-w-0 flex-1 font-mono text-sm">
              {result?.tempPassword}
            </code>
            <button
              type="button"
              onClick={() => void onCopy()}
              className="fiori-icon-btn fiori-icon-btn-bordered shrink-0"
              aria-label={copied ? "Senha copiada" : "Copiar senha"}
            >
              {copied ? (
                <Check className="h-4 w-4 text-[var(--fiori-positive,#107e3e)]" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>

          <div role="note" className="fiori-message-warning m-0">
            Troca obrigatória no primeiro acesso.
          </div>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="fiori-btn-emphasized"
          >
            Fechar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteUserConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserProfile | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

const DELETE_EFFECTS = [
  "Conta removida do Firebase Authentication",
  "Perfil excluído do diretório de profissionais",
  "Vínculos e permissões associados revogados",
] as const;

export function DeleteUserConfirmDialog({
  open,
  onOpenChange,
  targetUser,
  onConfirm,
  isDeleting,
}: DeleteUserConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent variant="fiori" overlayClassName="fiori-dialog-overlay">
        <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
          <div className="flex items-center gap-3">
            <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
              <Trash2 className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle variant="fiori">Excluir profissional</AlertDialogTitle>
              <AlertDialogDescription variant="fiori" className="truncate pt-0">
                {targetUser?.name || targetUser?.email || "—"}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="fiori-message-box-body">
          <p className="fiori-message-box-text">
            Esta ação remove permanentemente o profissional do sistema. Não é possível desfazer.
          </p>

          <ul className="fiori-message-box-effects">
            {DELETE_EFFECTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
          <AlertDialogCancel variant="fiori" disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="fiori"
            disabled={isDeleting}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            className="fiori-btn-emphasized--negative inline-flex items-center gap-1.5"
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            Excluir permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
