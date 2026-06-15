"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, ShieldCheck, User, FolderKanban } from "lucide-react";
import { doc } from "@/supabase/compat-db-shim";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { normalizeAvatarPublicUrl } from "@/lib/storage/avatar-url";
import { useDb, useUser, useDoc, useMemoDb } from "@/supabase";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectPickerDialog } from "./project-picker-dialog";
import { useSwitchableProjects, useSignOut } from "./use-sidebar-projects";

/**
 * UserMenu — Renderizado no canto direito.
 */
export function UserMenu() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const db = useDb();
    const { user, isUserLoading } = useUser();
    const handleSignOut = useSignOut();
    const [projectSwitchOpen, setProjectSwitchOpen] = useState(false);

    const userDocRef = useMemoDb(
        () => (user && db && !isUserLoading ? doc(db, "users", user.uid) : null),
        [db, user, isUserLoading],
    );
    const { data: userProfile, isLoading: profileLoading } = useDoc<any>(userDocRef);

    const isAdmin =
        userProfile?.isMaster === true ||
        userProfile?.role?.toLowerCase() === "master" ||
        userProfile?.role?.toLowerCase() === "admin";
    const { sortedProjects, canSwitch, currentPid, updateActiveProject } = useSwitchableProjects(
        user ?? null,
        profileLoading,
        isAdmin,
        isUserLoading,
    );

    if (!mounted || !user) return null;

    const userPhoto = normalizeAvatarPublicUrl(userProfile?.photoURL || user?.photoURL);
    const handleProjectPick = (id: string) => {
        updateActiveProject(id);
        setProjectSwitchOpen(false);
    };

    return (
        <>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-1.5 rounded-none hover:bg-slate-50 transition-all border-none group">
                    <div className="hidden sm:flex flex-col items-end mr-1">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight group-hover:text-SkyBlue-500 transition-colors">
                            {userProfile?.name || user.displayName || "Usuário"}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mt-0.5">
                            {userProfile?.position || (isAdmin ? 'Administrador' : 'Especialista')}
                        </span>
                    </div>
                    <div className="w-8 h-8 rounded-none bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-xs group-hover:border-SkyBlue-200 transition-all">
                        {userPhoto ? (
                            <Avatar className="w-full h-full rounded-none">
                                <AvatarImage src={userPhoto} alt={userProfile?.name} className="object-cover" />
                                <AvatarFallback className="bg-white rounded-none">
                                    {isAdmin ? <ShieldCheck className="w-4 h-4 text-SkyBlue-500" /> : <User className="w-4 h-4 text-slate-400" />}
                                </AvatarFallback>
                            </Avatar>
                        ) : (
                            isAdmin ? <ShieldCheck className="w-4 h-4 text-SkyBlue-500" /> : <User className="w-4 h-4 text-slate-400" />
                        )}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={4}
                className="fiori-dropdown-menu fiori-dropdown-menu--nav max-h-[calc(100vh-120px)] w-56 overflow-y-auto custom-scrollbar"
            >
                <DropdownMenuLabel className="fiori-dropdown-menu-label">
                    Minha Conta
                </DropdownMenuLabel>
                <DropdownMenuGroup className="fiori-dropdown-menu-items">
                    <DropdownMenuItem asChild className="fiori-dropdown-menu-item">
                        <Link href="/perfil">
                            <User className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            Ver Perfil
                        </Link>
                    </DropdownMenuItem>
                    {canSwitch ? (
                        <DropdownMenuItem
                            onClick={() => setProjectSwitchOpen(true)}
                            className="fiori-dropdown-menu-item"
                        >
                            <FolderKanban className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            Trocar projeto
                        </DropdownMenuItem>
                    ) : null}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup className="fiori-dropdown-menu-items">
                    <DropdownMenuItem
                        onClick={handleSignOut}
                        className="fiori-dropdown-menu-item fiori-dropdown-menu-item--critical"
                    >
                        <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        Encerrar Sessão
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
            </DropdownMenu>
            <ProjectPickerDialog
                open={projectSwitchOpen}
                onOpenChange={setProjectSwitchOpen}
                sortedProjects={sortedProjects}
                currentPid={currentPid}
                onPick={handleProjectPick}
            />
        </>
    );
}
