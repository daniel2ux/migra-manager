// src/components/dashboard/restart-carga-dialog.tsx
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
import { dashboardAlertDialogContentProps, dashboardDialogRootProps } from "@/lib/dashboard/scroll-preservation";

interface RestartCargaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mockToRestart: any;
    handleConfirmRestart: () => void;
}

export function RestartCargaDialog({
    open,
    onOpenChange,
    mockToRestart,
    handleConfirmRestart,
}: RestartCargaDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange} {...dashboardDialogRootProps}>
            <AlertDialogContent className="border shadow-2xl bg-white rounded-none" open={open} {...dashboardAlertDialogContentProps}>
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-bold uppercase tracking-tight text-slate-900 flex items-center gap-2">
                        <RefreshCcw className="w-5 h-5 text-amber-500" /> REINICIAR CICLO DA JANELA?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-medium text-slate-500">
                        Deseja <span className="font-bold text-amber-600">REINICIAR</span> o ciclo da janela <span className="font-bold text-slate-800">&quot;{mockToRestart?.name}&quot;</span>? 
                        As datas de início e término da última execução serão <span className="font-bold text-red-600">LIMPAS</span> no painel principal, mas o histórico de execuções passadas será preservado. 
                        Esta ação é necessária para iniciar um novo carregamento do zero.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 border-t pt-4 mt-4">
                    <AlertDialogCancel className="font-bold uppercase text-[10px]! tracking-widest h-9 px-6 hover:bg-slate-100 transition-all rounded-none">
                        MANTER COMO ESTÁ
                    </AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleConfirmRestart}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase text-[10px]! tracking-widest h-9 px-8 shadow-lg shadow-amber-100 transition-all rounded-none border-none"
                    >
                        REINICIAR E LIMPAR DATAS
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
