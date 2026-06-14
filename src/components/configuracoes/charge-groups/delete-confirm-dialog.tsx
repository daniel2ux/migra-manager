"use client";

import { useState } from "react";
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
import { Trash2 } from "lucide-react";
import type { ChargeGroup } from "@/types/charge-group";
import { DELETE_CHARGE_GROUP_EFFECTS } from "./constants";

export function ChargeGroupDeleteDialog({
  open,
  onClose,
  onConfirm,
  group,
  objectCount,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  group: ChargeGroup | null;
  objectCount: number;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try { await onConfirm(); onClose(); } finally { setDeleting(false); }
  }

  if (!group) return null;

  return (
    <AlertDialog preserveDashboardScroll open={open} onOpenChange={(o) => { if (!o && !deleting) onClose(); }}>
      <AlertDialogContent open={open} variant="fiori" className="max-w-md">
        <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
          <div className="flex items-center gap-3">
            <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
              <Trash2 className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle variant="fiori">Excluir grupo</AlertDialogTitle>
              <AlertDialogDescription variant="fiori" className="truncate pt-0">
                {group.name}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="fiori-message-box-body">
          {group.description?.trim() ? (
            <p className="fiori-message-box-context">{group.description}</p>
          ) : null}
          <p className="fiori-message-box-text">
            Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.
          </p>

          <ul className="fiori-message-box-effects">
            {DELETE_CHARGE_GROUP_EFFECTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {objectCount > 0 && (
            <p className="fiori-message-box-text">
              Este grupo possui {objectCount} objeto{objectCount !== 1 ? "s" : ""} associado
              {objectCount !== 1 ? "s" : ""}. O campo Grupo de carga será limpo nos objetos.
            </p>
          )}
        </div>

        <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
          <AlertDialogCancel variant="fiori" disabled={deleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="fiori"
            disabled={deleting}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            className="fiori-btn-emphasized--negative"
          >
            {deleting ? "Excluindo…" : "Excluir grupo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
