"use client";

import { Check, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function ProjectPickerDialog({
    open,
    onOpenChange,
    sortedProjects,
    currentPid,
    onPick,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sortedProjects: any[];
    currentPid: string | null;
    onPick: (id: string) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="dashboard-no-rounded flex max-h-[min(560px,calc(100dvh-80px))] flex-col gap-2 border-slate-200 sm:max-w-md [&>button.absolute]:hidden">
                <DialogHeader className="shrink-0 text-left">
                    <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900">
                        Alterar projeto
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-600">
                        Você está vinculado a mais de um projeto. Selecione o contexto em que deseja trabalhar.
                    </DialogDescription>
                </DialogHeader>
                <ul className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
                    {sortedProjects.map((p) => {
                        const isCurrent = currentPid === p.id;
                        return (
                            <li key={p.id}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    aria-current={isCurrent ? "true" : undefined}
                                    className={cn(
                                        "h-auto w-full justify-start gap-3 rounded-none px-4 py-3 text-left transition-colors",
                                        isCurrent
                                            ? "border-2 border-SkyBlue-500 bg-SkyBlue-50 text-slate-900 shadow-sm ring-1 ring-SkyBlue-500/15"
                                            : "border border-slate-200 hover:border-SkyBlue-300 hover:bg-SkyBlue-50/50",
                                    )}
                                    onClick={() => onPick(p.id)}
                                >
                                    <span
                                        className={cn(
                                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                                            isCurrent
                                                ? "bg-SkyBlue-200/90 text-SkyBlue-900"
                                                : "bg-slate-100 text-SkyBlue-600",
                                        )}
                                    >
                                        <FolderKanban className="h-4 w-4" aria-hidden />
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                                        <span className="truncate text-[11px] font-black uppercase tracking-tight text-slate-900">
                                            {p.name || p.id}
                                        </span>
                                        {!!String(p.company || "").trim() && (
                                            <span className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-600">
                                                {p.company}
                                            </span>
                                        )}
                                    </span>
                                    {isCurrent ? (
                                        <Check
                                            className="h-5 w-5 shrink-0 text-SkyBlue-600"
                                            strokeWidth={2.5}
                                            aria-hidden
                                        />
                                    ) : null}
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            </DialogContent>
        </Dialog>
    );
}
