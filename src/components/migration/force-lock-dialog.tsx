"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { dashboardDialogContentProps, dashboardDialogRootProps } from "@/lib/dashboard/scroll-preservation";

interface ForceLockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    target: { name: string } | null;
    blockerName: string | null;
    onForceAcquire: () => void;
    onViewOnly?: () => void;
    contextLabel?: string;
    preserveScroll?: boolean;
}

export function ForceLockDialog({
    open,
    onOpenChange,
    target,
    blockerName,
    onForceAcquire,
    onViewOnly,
    contextLabel = "no Dashboard",
    preserveScroll = false,
}: ForceLockDialogProps) {
    const title = onViewOnly ? "Registro Bloqueado" : "Objeto Bloqueado";
    const description = onViewOnly
        ? `Conflito de edição ${contextLabel}`
        : "Conflito de edição detectado";

    const dialogRootProps = preserveScroll ? dashboardDialogRootProps : {};
    const dialogContentProps = preserveScroll ? dashboardDialogContentProps : {};

    return (
        <Dialog open={open} onOpenChange={onOpenChange} {...dialogRootProps}>
            <DialogContent
                open={open}
                className="sm:max-w-md bg-white rounded-none border-none shadow-2xl p-0 overflow-hidden text-left"
                {...dialogContentProps}
            >
                <DialogHeader className="p-6 bg-slate-900 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/20 rounded-none">
                            <AlertCircle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-sm font-black uppercase tracking-widest leading-none">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-tight mt-1">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="bg-slate-50 p-4 border border-slate-100 space-y-3 font-sans">
                        <p className="text-[11px] font-medium text-slate-600 leading-relaxed uppercase tracking-tight">
                            O objeto <span className="font-black text-slate-900">&quot;{target?.name}&quot;</span> está sendo editado por:
                        </p>
                        <div className="flex items-center gap-3 bg-white p-3 border border-slate-100 shadow-xs">
                            <div className="w-8 h-8 rounded-none bg-SkyBlue-100 flex items-center justify-center font-black text-SkyBlue-600 text-[10px]">
                                {blockerName?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[12px] font-black text-slate-900 uppercase tracking-tighter">{blockerName}</span>
                        </div>
                    </div>

                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest text-center">
                        {onViewOnly
                            ? "Como administrador, você pode visualizar este registro em modo de leitura ou forçar a liberação para edição rápida."
                            : "Como administrador, você pode forçar a liberação deste registro para edição imediata."}
                    </p>
                </div>

                <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 gap-2 flex flex-row justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="rounded-none text-[10px] font-black uppercase tracking-widest h-10 px-6 hover:bg-slate-200 border-0"
                    >
                        Cancelar
                    </Button>
                    {onViewOnly && (
                        <Button
                            variant="outline"
                            onClick={onViewOnly}
                            className="rounded-none border-slate-300 text-[10px] font-black uppercase tracking-widest h-10 px-6 hover:bg-slate-200"
                        >
                            Apenas Visualizar
                        </Button>
                    )}
                    <Button
                        onClick={onForceAcquire}
                        className="rounded-none bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest h-10 px-6 border-0 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                    >
                        Forçar Liberação
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
