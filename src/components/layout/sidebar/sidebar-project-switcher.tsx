"use client";

import { ChevronsUpDown } from "lucide-react";
import type { User as FirebaseAuthUser } from "firebase/auth";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
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

/** Troca de projeto (Firestore: mesmos critérios do seletor pós-login). Só aparece com 2+ projetos. */
export function SidebarProjectSwitcher({
    user,
    profileLoading,
    isAdmin,
    isUserLoading,
    layout,
    onNavItemClick,
}: {
    user: FirebaseAuthUser | null;
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

    const menuBlocks = sortedProjects.map((p) => (
        <DropdownMenuItem
            key={p.id}
            onClick={() => handlePick(p.id)}
            className={cn(
                "cursor-pointer rounded-none text-[10px] font-bold uppercase",
                currentPid === p.id && "bg-SkyBlue-50 text-SkyBlue-700 focus:bg-SkyBlue-50 focus:text-SkyBlue-700",
            )}
        >
            <span className="flex flex-col gap-0.5 py-1">
                <span>{p.name || p.id}</span>
                {!!String(p.company || "").trim() && (
                    <span className="text-[8px] font-semibold uppercase text-slate-500">{p.company}</span>
                )}
            </span>
        </DropdownMenuItem>
    ));

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
                    <TooltipContent side="bottom" className="border-0 bg-slate-800 text-[9px] font-bold uppercase tracking-widest text-white">
                        Trocar projeto
                    </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                    align="start"
                    className="custom-scrollbar max-h-[min(360px,calc(100vh-140px))] w-[260px] overflow-y-auto rounded-none border-slate-100"
                >
                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Alterar projeto
                    </DropdownMenuLabel>
                    {menuBlocks}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return null;
}
