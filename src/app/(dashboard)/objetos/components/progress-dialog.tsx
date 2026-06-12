"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export interface ProgressState {
    open: boolean;
    title: string;
    current: number;
    total: number;
    done: boolean;
    error: string | null;
}

interface ProgressDialogProps {
    state: ProgressState;
    onOpenChange: (open: boolean) => void;
}

export function ProgressDialog({ state, onOpenChange }: ProgressDialogProps) {
    const pc = state.total > 0 ? (state.current / state.total) * 100 : 0;

    return (
        <Dialog open={state.open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-none border-none p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-6 bg-slate-900 text-white space-y-1">
                    <DialogTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3">
                        {state.done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : state.error ? (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                        ) : (
                            <Loader2 className="w-4 h-4 animate-spin text-SkyBlue-400" />
                        )}
                        {state.title}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1">
                        {state.done
                            ? "Operação concluída com sucesso"
                            : state.error
                              ? "Erro encontrado durante o processamento"
                              : "Processando registros no banco de dados..."}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-6 bg-white">
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Status do Processamento
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-900">
                                {state.current} / {state.total}
                            </span>
                        </div>
                        <Progress
                            value={pc}
                            className="h-2 rounded-none bg-slate-100"
                        />
                    </div>

                    {state.error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {state.error}
                        </div>
                    )}

                    {state.done && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Operação finalizada sem erros críticos.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
