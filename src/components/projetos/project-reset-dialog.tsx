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
import { Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    dashboardAlertDialogContentProps,
    dashboardDialogRootProps,
} from "@/lib/dashboard/scroll-preservation";

const RESET_EFFECTS = [
    "Mocks vinculadas ao projeto",
    "Objetos de migração e histórico de carga",
    "Comentários e observações associados",
] as const;

interface ProjectResetDialogProps {
    project: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
    isResetting: boolean;
}

export function ProjectResetDialog({
    project,
    open,
    onOpenChange,
    onConfirm,
    isResetting,
}: ProjectResetDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={(next) => !isResetting && onOpenChange(next)} {...dashboardDialogRootProps}>
            <AlertDialogContent variant="fiori" open={open} {...dashboardAlertDialogContentProps}>
                <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
                    <div className="flex items-center gap-3">
                        <div className="fiori-dialog-icon fiori-dialog-icon--warning shrink-0">
                            <RotateCcw className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <AlertDialogTitle variant="fiori">Reiniciar projeto</AlertDialogTitle>
                            <AlertDialogDescription variant="fiori" className="truncate pt-0">
                                {project?.name ?? "—"}
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>

                <div className="fiori-message-box-body">
                    <p className="fiori-message-box-text">
                        Tem certeza que deseja reiniciar este projeto? Os dados de carga serão apagados
                        e o projeto voltará ao estado inicial. Esta ação não pode ser desfeita.
                    </p>

                    <ul className="fiori-message-box-effects">
                        {RESET_EFFECTS.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>

                <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
                    <AlertDialogCancel variant="fiori" disabled={isResetting}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant="fiori"
                        onClick={onConfirm}
                        disabled={isResetting}
                        className={cn("fiori-btn-emphasized--warning", isResetting && "gap-2")}
                    >
                        {isResetting ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                Reiniciando…
                            </>
                        ) : (
                            "Reiniciar projeto"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
