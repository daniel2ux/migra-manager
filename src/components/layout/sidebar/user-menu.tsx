"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, ShieldCheck, User, FolderKanban } from "lucide-react";
import { doc } from "firebase/firestore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/supabase";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
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

    const db = useFirestore();
    const { user, isUserLoading } = useUser();
    const handleSignOut = useSignOut();
    const [projectSwitchOpen, setProjectSwitchOpen] = useState(false);

    const userDocRef = useMemoFirebase(
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

    const userPhoto = userProfile?.photoURL || user?.photoURL;
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
                className="w-56 border-slate-100 shadow-xl p-2 bg-white dashboard-no-rounded max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar"
            >
                <DropdownMenuLabel className="text-[8px]! font-bold text-slate-400 uppercase tracking-wider p-2">Minha Conta</DropdownMenuLabel>
                <DropdownMenuItem asChild className="focus:bg-slate-100 focus:text-slate-900">
                    <Link href="/perfil" className="text-[10px] font-bold text-slate-900 p-3 rounded-none">
                        Ver Perfil
                    </Link>
                </DropdownMenuItem>
                {canSwitch ? (
                    <DropdownMenuItem
                        onClick={() => setProjectSwitchOpen(true)}
                        className="cursor-pointer rounded-none p-3 text-[10px] font-bold text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                    >
                        <FolderKanban className="mr-2 w-4 h-4" aria-hidden />
                        Trocar projeto
                    </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-[10px] font-bold text-red-600 focus:bg-red-50 focus:text-red-600 p-3 rounded-none cursor-pointer"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Encerrar Sessão
                </DropdownMenuItem>
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
