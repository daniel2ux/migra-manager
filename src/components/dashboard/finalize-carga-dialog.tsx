// src/components/dashboard/finalize-carga-dialog.tsx
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
import { StopCircle } from "lucide-react";

interface FinalizeCargaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loadStatusToConfirm: any;
    confirmFinalizeCarga: () => void;
}

export function FinalizeCargaDialog({
    open,
    onOpenChange,
    loadStatusToConfirm,
    confirmFinalizeCarga,
}: FinalizeCargaDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="border shadow-2xl bg-white rounded-none" open={open}>
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-bold uppercase tracking-tight text-slate-900 flex items-center gap-2">
                        <StopCircle className="w-5 h-5 text-red-500" /> FINALIZAR CARGA DA JANELA?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-medium text-slate-500">
                        Tem certeza que deseja <span className="font-bold text-red-600">FINALIZAR</span> a execução da janela <span className="font-bold text-slate-800">&quot;{loadStatusToConfirm?.name}&quot;</span>? 
                        Esta ação irá interromper o andamento atual, marcar a janela como <span className="font-bold text-emerald-600">CONCLUÍDA</span> e bloqueá-la para alterações futuras.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 border-t pt-4 mt-4">
                    <AlertDialogCancel className="font-bold uppercase text-[10px]! tracking-widest h-9 px-6 hover:bg-slate-100 transition-all rounded-none">
                        CANCELAR
                    </AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={confirmFinalizeCarga}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px]! tracking-widest h-9 px-8 shadow-lg shadow-red-100 transition-all rounded-none border-none"
                    >
                        CONFIRMAR E FINALIZAR
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
