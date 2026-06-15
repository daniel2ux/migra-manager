"use client";

import { Check, ChevronsUpDown, FolderKanban } from "lucide-react";
import type { User as CompatAuthUser } from "@/supabase/auth-shim";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSwitchableProjects } from "./use-sidebar-projects";

/** Troca de projeto (CompatDb: mesmos critérios do seletor pós-login). Só aparece com 2+ projetos. */
export function SidebarProjectSwitcher({
    user,
    profileLoading,
    isAdmin,
    isUserLoading,
    layout,
    onNavItemClick,
}: {
    user: CompatAuthUser | null;
    profileLoading: boolean;
    isAdmin: boolean;
    isUserLoading: boolean;
    layout: "horizontal" | "vertical";
    onNavItemClick?: () => void;
}) {
    const { sortedProjects, canSwitch, currentPid, updateActiveProject } = useSwitchableProjects(
        user,
        profileLoading,
        isAdmin,
        isUserLoading,
    );

    const handlePick = (id: string) => {
        updateActiveProject(id);
        onNavItemClick?.();
    };

    const menuBlocks = sortedProjects.map((p) => {
        const isCurrent = currentPid === p.id;
        const company = String(p.company || "").trim();

        return (
            <DropdownMenuItem
                key={p.id}
                onClick={() => handlePick(p.id)}
                className={cn(
                    "fiori-dropdown-menu-item",
                    isCurrent && "fiori-dropdown-menu-item--selected",
                )}
            >
                <FolderKanban className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                    <p className="truncate">{p.name || p.id}</p>
                    {company ? (
                        <p className="fiori-dropdown-menu-item-desc truncate">{company}</p>
                    ) : null}
                </div>
                {isCurrent ? (
                    <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                ) : null}
            </DropdownMenuItem>
        );
    });

    if (!canSwitch) return null;

    if (layout === "horizontal") {
        return (
            <DropdownMenu>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="Trocar projeto"
                                className="flex shrink-0 items-center justify-center rounded-none border border-slate-200 bg-white px-1.5 py-1 text-slate-600 hover:bg-slate-50 hover:text-SkyBlue-600"
                            >
                                <ChevronsUpDown className="w-3.5 h-3.5 opacity-70" aria-hidden />
                            </button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        Trocar projeto
                    </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    className="fiori-dropdown-menu fiori-dropdown-menu--nav w-[260px] max-h-[min(360px,calc(100vh-140px))] overflow-y-auto custom-scrollbar"
                >
                    <DropdownMenuLabel className="fiori-dropdown-menu-label">
                        Alterar projeto
                    </DropdownMenuLabel>
                    <DropdownMenuGroup className="fiori-dropdown-menu-items">
                        {menuBlocks}
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return null;
}
