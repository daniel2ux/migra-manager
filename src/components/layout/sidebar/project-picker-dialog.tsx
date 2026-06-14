"use client";

import { Check, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
            <DialogContent
                overlayClassName="fiori-dialog-overlay"
                className="fiori-dialog fiori-project-picker-dialog fiori-project-picker-dialog--switch !flex p-0 flex-col gap-0 overflow-hidden border-none bg-white shadow-lg !rounded-[var(--fiori-radius)] [&>button]:hidden"
            >
                <DialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
                    <div className="fiori-dialog-header-row">
                        <div className="fiori-dialog-header-main">
                            <div className="fiori-dialog-icon shrink-0">
                                <FolderKanban className="w-5 h-5" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="fiori-dialog-title">
                                    Alterar projeto
                                </DialogTitle>
                                <DialogDescription className="fiori-dialog-subtitle">
                                    Você está vinculado a mais de um projeto. Selecione o contexto em que deseja trabalhar.
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="fiori-project-picker-body">
                    <p className="fiori-dialog-info fiori-project-picker-info">
                        O escopo das telas (mocks, objetos, relatórios) seguirá o projeto escolhido até você alterar novamente.
                    </p>

                    <div className="fiori-project-picker-list custom-scrollbar">
                        <ul className="fiori-project-picker-items">
                            {sortedProjects.map((p) => {
                                const isCurrent = currentPid === p.id;
                                return (
                                    <li key={p.id}>
                                        <button
                                            type="button"
                                            aria-current={isCurrent ? "true" : undefined}
                                            className={cn(
                                                "fiori-project-picker-row",
                                                isCurrent && "fiori-project-picker-row--current",
                                            )}
                                            onClick={() => onPick(p.id)}
                                        >
                                            <FolderKanban
                                                className="fiori-project-picker-row-icon"
                                                aria-hidden
                                            />
                                            <span className="fiori-project-picker-row-text">
                                                <span className="fiori-project-picker-row-name">
                                                    {p.name || p.id}
                                                </span>
                                                {!!String(p.company || "").trim() && (
                                                    <span className="fiori-project-picker-row-meta">
                                                        {p.company}
                                                    </span>
                                                )}
                                            </span>
                                            {isCurrent ? (
                                                <Check
                                                    className="fiori-project-picker-row-check"
                                                    strokeWidth={2.5}
                                                    aria-hidden
                                                />
                                            ) : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
                    <Button
                        type="button"
                        variant="outline"
                        className="fiori-btn-transparent w-full shadow-none sm:w-auto sm:min-w-[7rem]"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
