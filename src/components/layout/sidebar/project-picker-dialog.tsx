"use client";

import { useMemo } from "react";
import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { STORAGE_KEYS } from "@/lib/constants";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { isProjectInactive } from "@/lib/project-utils";
import {
    ProjectPickerList,
    type ProjectPickerItem,
} from "@/components/layout/project-picker-list";
import { ProjectPickerInactiveToggle } from "@/components/layout/project-picker-inactive-toggle";

export function ProjectPickerDialog({
    open,
    onOpenChange,
    sortedProjects,
    currentPid,
    onPick,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sortedProjects: ProjectPickerItem[];
    currentPid: string | null;
    onPick: (id: string) => void;
}) {
    const [showInactive, setShowInactive] = useLocalStorageState<boolean>(
        STORAGE_KEYS.PROJECTS_SHOW_INACTIVE,
        false,
    );

    const inactiveCount = useMemo(
        () => sortedProjects.filter((p) => isProjectInactive(p)).length,
        [sortedProjects],
    );

    const handlePick = (id: string) => {
        const project = sortedProjects.find((p) => p.id === id);
        if (!project) return;
        if (isProjectInactive(project)) {
            setShowInactive(true);
        }
        onPick(id);
    };

    return (
        <Dialog preserveDashboardScroll open={open} onOpenChange={onOpenChange}>
            <DialogContent
                open={open}
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
                                    Selecione o contexto em que deseja trabalhar. Projetos inativos
                                    podem ser reativados em Projetos.
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="fiori-dialog-header-actions">
                            <ProjectPickerInactiveToggle
                                showInactive={showInactive}
                                onToggle={() => setShowInactive(!showInactive)}
                                inactiveCount={inactiveCount}
                            />
                        </div>
                    </div>
                </DialogHeader>

                <div className="fiori-project-picker-body">
                    <div className="fiori-project-picker-list custom-scrollbar">
                        <ProjectPickerList
                            projects={sortedProjects}
                            showInactive={showInactive}
                            currentPid={currentPid}
                            onPick={handlePick}
                            showCurrentCheck
                            allowInactiveSelection
                        />
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
