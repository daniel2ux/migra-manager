"use client";

import { Button } from "@/components/ui/button";
import { RefreshCcw, Trash2 } from "lucide-react";

interface BulkSelectionBarProps {
    count: number;
    onReset: () => void;
    onDelete: () => void;
    onCancel: () => void;
}

export function BulkSelectionBar({ count, onReset, onDelete, onCancel }: BulkSelectionBarProps) {
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seleção em Massa</span>
                <span className="text-xs font-black uppercase whitespace-nowrap">{count} Objetos Selecionados</span>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className="h-8 px-3 text-[10px]! font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-slate-800 rounded-none border-0"
                >
                    <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Reiniciar
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-8 px-3 text-[10px]! font-black uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-900 rounded-none border-0"
                >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    className="h-8 px-3 text-[10px]! font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-800 rounded-none border-0"
                >
                    Cancelar
                </Button>
            </div>
        </div>
    );
}
