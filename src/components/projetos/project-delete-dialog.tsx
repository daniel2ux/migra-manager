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
import { Trash2 } from "lucide-react";
import {
    dashboardAlertDialogContentProps,
    dashboardDialogRootProps,
} from "@/lib/dashboard/scroll-preservation";

const DELETE_EFFECTS = [
    "Mocks vinculadas ao projeto",
    "Objetos de migração e histórico de carga",
    "Comentários e observações associados",
    "Vínculos de membros com o projeto",
] as const;

interface ProjectDeleteDialogProps {
    project: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function ProjectDeleteDialog({
    project,
    open,
    onOpenChange,
    onConfirm,
}: ProjectDeleteDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange} {...dashboardDialogRootProps}>
            <AlertDialogContent variant="fiori" {...dashboardAlertDialogContentProps}>
                <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
                    <div className="flex items-center gap-3">
                        <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
                            <Trash2 className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <AlertDialogTitle variant="fiori">Excluir projeto</AlertDialogTitle>
                            <AlertDialogDescription variant="fiori" className="truncate pt-0">
                                {project?.name ?? "—"}
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>

                <div className="fiori-message-box-body">
                    <p className="fiori-message-box-text">
                        Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita
                        e remove permanentemente todos os dados associados.
                    </p>

                    <ul className="fiori-message-box-effects">
                        {DELETE_EFFECTS.map((item) => (
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
                        onClick={onConfirm}
                        className="fiori-btn-emphasized--negative"
                    >
                        Excluir projeto
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
