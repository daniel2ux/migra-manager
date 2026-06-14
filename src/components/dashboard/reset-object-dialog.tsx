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
import { RefreshCcw } from "lucide-react";
import type { AggregatedObject } from "@/types/migration";

const RESET_EFFECTS = [
    "Status alterado para Carga em andamento",
    "Histórico de carga removido",
    "Datas de execução apagadas",
    "Contadores de processamento zerados",
] as const;

interface ResetObjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    objectToReset: AggregatedObject | null;
    onConfirm: () => void;
    onClear: () => void;
}

export function ResetObjectDialog({
    open,
    onOpenChange,
    objectToReset,
    onConfirm,
    onClear,
}: ResetObjectDialogProps) {
    return (
        <AlertDialog
            preserveDashboardScroll
            open={open}
            onOpenChange={(nextOpen) => {
                onOpenChange(nextOpen);
                if (!nextOpen) onClear();
            }}
        >
            <AlertDialogContent
                variant="fiori"
                open={open}
            >
                <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
                    <div className="flex items-center gap-3">
                        <div className="fiori-dialog-icon fiori-dialog-icon--warning shrink-0">
                            <RefreshCcw className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <AlertDialogTitle variant="fiori">Reiniciar carga</AlertDialogTitle>
                            <AlertDialogDescription variant="fiori" className="truncate pt-0">
                                {objectToReset?.name ?? "—"}
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>

                <div className="fiori-message-box-body">
                    <p className="fiori-message-box-text">
                        Inicie um novo ciclo de carga para este objeto. Os dados do ciclo concluído serão apagados
                        e o status passará imediatamente para carga em andamento.
                    </p>

                    <ul className="fiori-message-box-effects">
                        {RESET_EFFECTS.map((item) => (
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
                        Reiniciar carga
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
