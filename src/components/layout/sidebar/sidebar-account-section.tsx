"use client";

import { useState } from "react";
import { LogOut, FolderKanban } from "lucide-react";
import type { User as FirebaseAuthUser } from "firebase/auth";
import { ProjectPickerDialog } from "./project-picker-dialog";
import { useSwitchableProjects } from "./use-sidebar-projects";

/** Rodapé da sidebar vertical — conta e encerrar sessão. */
export function SidebarAccountSection({
    user,
    profileLoading,
    isAdmin,
    isUserLoading,
    onNavItemClick,
    onSignOut,
}: {
    user: FirebaseAuthUser | null;
    profileLoading: boolean;
    isAdmin: boolean;
    isUserLoading: boolean;
    onNavItemClick?: () => void;
    onSignOut: () => void | Promise<void>;
}) {
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const { sortedProjects, canSwitch, currentPid, updateActiveProject } = useSwitchableProjects(
        user,
        profileLoading,
        isAdmin,
        isUserLoading,
    );

    const handlePick = (id: string) => {
        updateActiveProject(id);
        setSwitcherOpen(false);
        onNavItemClick?.();
    };

    return (
        <>
            <div className="fiori-side-nav-account shrink-0">
                <p className="fiori-side-nav-section-label">Minha conta</p>
                {canSwitch ? (
                    <button
                        type="button"
                        onClick={() => setSwitcherOpen(true)}
                        className="fiori-side-nav-account-btn"
                    >
                        <FolderKanban className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                        Trocar projeto
                    </button>
                ) : null}
                <div className="fiori-side-nav-divider" role="separator" />
                <button
                    type="button"
                    onClick={() => {
                        void onSignOut();
                        onNavItemClick?.();
                    }}
                    className="fiori-side-nav-account-btn fiori-side-nav-account-btn--danger"
                >
                    <LogOut className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                    Encerrar sessão
                </button>
            </div>

            <ProjectPickerDialog
                open={switcherOpen}
                onOpenChange={setSwitcherOpen}
                sortedProjects={sortedProjects}
                currentPid={currentPid}
                onPick={handlePick}
            />
        </>
    );
}
