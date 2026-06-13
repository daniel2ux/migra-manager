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
import { Lock } from "lucide-react";
import {
    dashboardAlertDialogContentProps,
    dashboardDialogRootProps,
} from "@/lib/dashboard/scroll-preservation";

const LOCK_EFFECTS = [
    "Informações do projeto ficam imutáveis",
    "Mocks associadas não podem ser editadas ou carregadas",
    "Objetos de migração bloqueados para alteração",
    "Somente administrador pode desbloquear depois",
] as const;

interface ProjectLockDialogProps {
    project: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function ProjectLockDialog({
    project,
    open,
    onOpenChange,
    onConfirm,
}: ProjectLockDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange} {...dashboardDialogRootProps}>
            <AlertDialogContent variant="fiori" open={open} {...dashboardAlertDialogContentProps}>
                <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
                    <div className="flex items-center gap-3">
                        <div className="fiori-dialog-icon fiori-dialog-icon--warning shrink-0">
                            <Lock className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <AlertDialogTitle variant="fiori">Bloquear projeto</AlertDialogTitle>
                            <AlertDialogDescription variant="fiori" className="truncate pt-0">
                                {project?.name ?? "—"}
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>

                <div className="fiori-message-box-body">
                    <p className="fiori-message-box-text">
                        Deseja bloquear este projeto? Após confirmar, nenhuma alteração será permitida
                        até que um administrador desbloqueie.
                    </p>

                    <ul className="fiori-message-box-effects">
                        {LOCK_EFFECTS.map((item) => (
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
                        className="fiori-btn-emphasized--warning"
                    >
                        Confirmar bloqueio
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
