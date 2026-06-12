"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import type { User as FirebaseAuthUser } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import {
    BarChart,
    LogOut,
    Info,
    FileText,
    ChevronDown,
    Settings,
    ScrollText,
    User,
    ShieldCheck,
    Wrench,
    Layout,
    Package,
    Table2,
    ChevronsUpDown,
    FolderKanban,
    Check,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
    useAuth,
    useUser,
    useFirestore,
    useDoc,
    useMemoFirebase,
    useCollection,
} from "@/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { doc, collection, query, where } from "firebase/firestore";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { safeRouterPush } from "@/lib/navigation/safe-router";
import { buildSidebarHref } from "@/lib/navigation/sidebar-href";
import { SheetClose } from "@/components/ui/sheet";

/** Mesmos critérios do seletor pós-login: admin vê todos; demais apenas `memberUids`. */
function useSwitchableProjects(
    user: FirebaseAuthUser | null,
    profileLoading: boolean,
    isAdmin: boolean,
    isUserLoading: boolean,
) {
    const db = useFirestore();
    const { projectId: currentPid, updateActiveProject } = useActiveProjectId();

    const projectsQuery = useMemoFirebase(() => {
        if (!db || !user || isUserLoading || profileLoading) return null;
        const projectsRef = collection(db, "projects");
        if (isAdmin) return projectsRef;
        return query(projectsRef, where("memberUids", "array-contains", user.uid));
    }, [db, user, isUserLoading, profileLoading, isAdmin]);

    const { data: switchableProjects } = useCollection<any>(projectsQuery);

    const sortedProjects = useMemo(() => {
        if (!switchableProjects?.length) return [];
        return [...switchableProjects].sort((a, b) =>
            String(a.name || a.id).localeCompare(String(b.name || b.id), "pt-BR"),
        );
    }, [switchableProjects]);

    const canSwitch =
        !!user &&
        Array.isArray(switchableProjects) &&
        switchableProjects.length > 1;

    return { sortedProjects, canSwitch, currentPid, updateActiveProject };
}

function useSignOut() {
    const auth = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    return async () => {
        try {
            sessionStorage.removeItem("migra_last_selected_project");
            if (auth) await signOut(auth);
            router.push("/login?reason=session_ended");
        } catch {
            toast({ variant: "destructive", description: "Erro ao sair." });
        }
    };
}

function ProjectPickerDialog({
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

/** Troca de projeto (Firestore: mesmos critérios do seletor pós-login). Só aparece com 2+ projetos. */
function SidebarProjectSwitcher({
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

/** Rodapé da sidebar vertical — conta e encerrar sessão. */
function SidebarAccountSection({
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

type SidebarMenuItem = {
    id: string;
    href?: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    skipParams?: boolean;
    alsoActiveOn?: string[];
    subItems?: { href: string; label: string; skipParams?: boolean }[];
};

/** Estilos da navegação vertical (Fiori). */
const NAV_STYLES = {
    item: "fiori-side-nav-item flex w-full items-center gap-3 rounded-[0.375rem] px-3 py-2.5 transition-colors duration-150",
    label: "text-[0.875rem] font-semibold tracking-normal",
    icon: "h-4 w-4 shrink-0",
    inactive: "text-[#6a6d70] hover:bg-[#e8e8e8] hover:text-[#32363a]",
    active: "bg-[#e8f3ff] text-[#0070f2]",
    disabled: "text-[#d9d9d9] cursor-not-allowed select-none opacity-60",
    subItem:
        "block rounded-[0.25rem] py-2 pl-3 text-[0.8125rem] font-medium tracking-normal transition-colors duration-150",
    subInactive: "text-[#6a6d70] hover:bg-[#e8e8e8] hover:text-[#32363a]",
    subActive: "bg-[#e8f3ff] text-[#0070f2] font-semibold",
} as const;

const HORIZONTAL_NAV_ITEM =
    "fiori-horizontal-nav-item flex items-center gap-2 px-4 py-2 text-[0.875rem] font-semibold";
const HORIZONTAL_NAV_ACTIVE = "fiori-horizontal-nav-item--active";
const HORIZONTAL_NAV_INACTIVE = "";

function formatSubNavLabel(label: string): string {
    return label.charAt(0) + label.slice(1).toLowerCase();
}

const HORIZONTAL_NAV_HOVER_CLOSE_MS = 180;

function HorizontalNavDropdownMenu({
    item,
    isActive,
    pathname,
    effectiveProjectId,
    onNavItemClick,
}: {
    item: SidebarMenuItem & { subItems: NonNullable<SidebarMenuItem["subItems"]> };
    isActive: boolean;
    pathname: string;
    effectiveProjectId: string | null;
    onNavItemClick?: () => void;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancelScheduledClose = useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const scheduleClose = useCallback(() => {
        cancelScheduledClose();
        closeTimerRef.current = setTimeout(() => setOpen(false), HORIZONTAL_NAV_HOVER_CLOSE_MS);
    }, [cancelScheduledClose]);

    const handleOpen = useCallback(() => {
        cancelScheduledClose();
        setOpen(true);
    }, [cancelScheduledClose]);

    useEffect(() => () => cancelScheduledClose(), [cancelScheduledClose]);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        HORIZONTAL_NAV_ITEM,
                        isActive ? HORIZONTAL_NAV_ACTIVE : HORIZONTAL_NAV_INACTIVE,
                    )}
                    onPointerEnter={handleOpen}
                    onPointerLeave={scheduleClose}
                    onFocus={handleOpen}
                >
                    {item.label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="fiori-dropdown-menu fiori-dropdown-menu--nav max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar"
                align="start"
                side="bottom"
                sideOffset={10}
                collisionPadding={{ top: 140, right: 8, bottom: 8, left: 8 }}
                onPointerEnter={cancelScheduledClose}
                onPointerLeave={scheduleClose}
            >
                <DropdownMenuLabel className="fiori-dropdown-menu-label">
                    {item.label}
                </DropdownMenuLabel>
                <DropdownMenuGroup className="fiori-dropdown-menu-items">
                    {item.subItems.map((sub) => {
                        const isSubActive =
                            pathname === sub.href ||
                            pathname.startsWith(`${sub.href}/`);

                        return (
                            <DropdownMenuItem
                                key={sub.href}
                                className={cn(
                                    "fiori-dropdown-menu-item",
                                    isSubActive && "fiori-dropdown-menu-item--active",
                                )}
                                onSelect={() => {
                                    onNavItemClick?.();
                                    safeRouterPush(
                                        router,
                                        buildSidebarHref(
                                            sub.href,
                                            effectiveProjectId,
                                            ("skipParams" in sub ? sub.skipParams : undefined) ??
                                                item.skipParams,
                                        ),
                                    );
                                }}
                            >
                                {formatSubNavLabel(sub.label)}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function SidebarNavLink({
    href,
    skipParams,
    projectId,
    onNavItemClick,
    className,
    children,
}: {
    href: string;
    skipParams?: boolean;
    projectId: string | null;
    onNavItemClick?: () => void;
    className?: string;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const resolvedHref = buildSidebarHref(href, projectId, skipParams);
    const closesMobileSheet = !!onNavItemClick;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!closesMobileSheet) return;
        e.preventDefault();
        try {
            router.push(resolvedHref);
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes("Router action dispatched before initialization")
            ) {
                safeRouterPush(router, resolvedHref);
            } else {
                throw error;
            }
        }
        onNavItemClick?.();
    };

    const link = (
        <Link
            href={resolvedHref}
            onClick={closesMobileSheet ? handleClick : undefined}
            className={className}
        >
            {children}
        </Link>
    );

    if (closesMobileSheet) {
        return <SheetClose asChild>{link}</SheetClose>;
    }

    return link;
}

function SidebarNavGroup({
    item,
    pathname,
    onNavItemClick,
    isActive,
    projectId,
}: {
    item: SidebarMenuItem;
    pathname: string;
    onNavItemClick?: () => void;
    isActive: boolean;
    projectId: string | null;
}) {
    const hasActiveSub = item.subItems?.some(
        (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`),
    );
    const [open, setOpen] = useState(!!hasActiveSub);

    useEffect(() => {
        if (hasActiveSub) setOpen(true);
    }, [hasActiveSub]);

    if (!item.subItems?.length) return null;

    const highlighted = isActive || hasActiveSub;

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        NAV_STYLES.item,
                        NAV_STYLES.label,
                        highlighted ? NAV_STYLES.active : NAV_STYLES.inactive,
                    )}
                >
                    <item.icon className={NAV_STYLES.icon} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                        className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                            open && "rotate-180",
                            highlighted ? "text-[#0070f2]" : "opacity-70",
                        )}
                        aria-hidden
                    />
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="ml-7 space-y-0.5 border-l border-[#e5e5e5] pl-3 pt-0.5">
                    {item.subItems.map((sub) => {
                        const isSubActive =
                            pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                        return (
                            <SidebarNavLink
                                key={sub.href}
                                href={sub.href}
                                skipParams={sub.skipParams ?? item.skipParams}
                                projectId={projectId}
                                onNavItemClick={onNavItemClick}
                                className={cn(
                                    NAV_STYLES.subItem,
                                    isSubActive ? NAV_STYLES.subActive : NAV_STYLES.subInactive,
                                )}
                            >
                                {formatSubNavLabel(sub.label)}
                            </SidebarNavLink>
                        );
                    })}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

/**
 * SidebarContent — Adaptado para suportar Horizontal e Vertical.
 */
export const SidebarContent = React.memo(function SidebarContent({
    onNavItemClick,
    projectIdFromUrl,
    mode = "vertical",
}: {
    onNavItemClick?: () => void;
    projectIdFromUrl: string | null;
    mode?: "vertical" | "horizontal";
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const pathname = usePathname();
    const router = useRouter();
    const db = useFirestore();
    const { user, isUserLoading } = useUser();
    const handleSignOut = useSignOut();

    const userDocRef = useMemoFirebase(
        () => (user && db && !isUserLoading ? doc(db, "users", user.uid) : null),
        [db, user, isUserLoading],
    );
    const { data: userProfile, isLoading: profileLoadingSidebar } = useDoc<any>(userDocRef);

    const { projectId: persistedProjectId } = useActiveProjectId();

    const effectiveProjectId = useMemo(() => {
        // Prioriza persistedProjectId (atualizado imediatamente via evento customizado)
        if (persistedProjectId && persistedProjectId !== "all") return persistedProjectId;
        // Fallback para URL (deep linking, navegação direta)
        if (projectIdFromUrl && projectIdFromUrl !== "all") return projectIdFromUrl;

        // Se tiver apenas 1 projeto, pode auto-selecionar.
        // Se tiver mais, deve forçar a escolha (retornar null).
        if (userProfile?.projectIds?.length === 1) {
            return userProfile.projectIds[0];
        }

        return null;
    }, [projectIdFromUrl, persistedProjectId, userProfile]);

    const projectDocRef = useMemoFirebase(() => {
        if (!db || !effectiveProjectId) return null;
        return doc(db, "projects", effectiveProjectId);
    }, [db, effectiveProjectId]);
    const { data: projectData } = useDoc<any>(projectDocRef);

    const isMaster = userProfile?.isMaster === true || userProfile?.role?.toLowerCase() === "master";
    const isAdmin = isMaster || userProfile?.role?.toLowerCase() === "admin";

    const menuItems = useMemo(() => [
        { id: "dashboard", href: "/", label: "Dashboard", icon: BarChart },
        { id: "projetos", href: "/projetos", label: "Projetos", icon: Layout, skipParams: true, alsoActiveOn: ["/mocks", "/objetos/"] },
        { id: "mocks", href: "/mocks", label: "Mocks", icon: Package },
        { id: "objetos", href: "/objetos", label: "Objetos", icon: Table2 },
        { id: "logs", href: "/logs", label: "Logs", icon: ScrollText },
        ...(isAdmin ? [{
            id: "relatorios",
            label: "Relatórios",
            icon: FileText,
            subItems: [
                { href: "/relatorios", label: "CONSOLIDADO" }
            ]
        }] : []),
        ...(isMaster ? [{
            id: "utilitarios",
            label: "Utilitários",
            icon: Wrench,
            subItems: [
                { href: "/utilitarios/clonar-projeto", label: "CLONAR PROJETO" },
                { href: "/utilitarios/clonar-mock", label: "CLONAR MOCK" },
                { href: "/utilitarios/backup", label: "BACKUP" },
                { href: "/utilitarios/limpar-logs", label: "LIMPAR LOGS" },
                { href: "/utilitarios/limpar-catalogo-master", label: "LIMPAR CATÁLOGO" },
            ]
        }] : []),
        ...(isAdmin ? [{
            id: "configuracoes",
            label: "Configurações",
            icon: Settings,
            skipParams: true,
            subItems: [
                { href: "/usuarios", label: "USUÁRIOS", skipParams: true },
                { href: "/grupos-atividade", label: "GRUPOS", skipParams: true },
                { href: "/configuracoes/emails", label: "E-MAILS", skipParams: true },
                ...(isMaster ? [{ href: "/configuracoes", label: "SISTEMA", skipParams: true }] : []),
            ]
        }] : []),
        {
            id: "info",
            label: "Info",
            icon: Info,
            subItems: [
                { href: "/docs", label: "DOCS", skipParams: true },
                { href: "/sobre", label: "SOBRE", skipParams: true },
            ]
        },
    ], [isAdmin, isMaster]);

    const activeId = menuItems.find(i => {
        if (i.href === "/") return pathname === "/";
        if (i.href && pathname.startsWith(i.href)) return true;
        if (i.alsoActiveOn?.some(p => pathname.startsWith(p))) return true;
        if (i.subItems?.some(s => pathname.startsWith(s.href))) return true;
        return false;
    })?.id;

    if (!mounted) return null;

    if (mode === "horizontal") {
        return (
            <div className="ml-4 flex h-auto min-h-12 items-center gap-1 overflow-x-auto overflow-y-visible py-1 lg:ml-8">
                {projectData ? (
                    <div className="mr-6 flex max-w-[220px] min-w-0 shrink-0 items-start gap-1 border-l border-[#e5e5e5] py-1 pl-4">
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[0.8125rem] font-semibold leading-none text-[#32363a]">
                                {projectData.name}
                            </span>
                            <span className="mt-1 truncate text-[0.6875rem] font-medium text-[#6a6d70]">
                                {projectData.company}
                            </span>
                        </div>
                        <TooltipProvider delayDuration={0}>
                            <SidebarProjectSwitcher
                                layout="horizontal"
                                user={user}
                                profileLoading={profileLoadingSidebar}
                                isAdmin={isAdmin}
                                isUserLoading={isUserLoading}
                            />
                        </TooltipProvider>
                    </div>
                ) : (
                    <TooltipProvider delayDuration={0}>
                        <div className="mr-4 shrink-0 py-1">
                            <SidebarProjectSwitcher
                                layout="horizontal"
                                user={user}
                                profileLoading={profileLoadingSidebar}
                                isAdmin={isAdmin}
                                isUserLoading={isUserLoading}
                            />
                        </div>
                    </TooltipProvider>
                )}

                <TooltipProvider delayDuration={0}>
                    <nav className="flex items-center gap-1 whitespace-nowrap">
                        {menuItems.map((item) => {
                            const isActive = activeId === item.id;
                            const isDisabled =
                            !item.skipParams &&
                            item.id !== "projetos" &&
                            item.id !== "dashboard" &&
                            !effectiveProjectId;

                            if (isDisabled) {
                                return (
                                    <Tooltip key={item.id}>
                                        <TooltipTrigger asChild>
                                            <div className={cn(HORIZONTAL_NAV_ITEM, "fiori-horizontal-nav-item--disabled")}>
                                                <span>{item.label}</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" variant="fiori">
                                            Selecione um projeto para habilitar
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }

                            if (item.subItems) {
                                return (
                                    <HorizontalNavDropdownMenu
                                        key={item.id}
                                        item={item as SidebarMenuItem & { subItems: NonNullable<SidebarMenuItem["subItems"]> }}
                                        isActive={isActive}
                                        pathname={pathname}
                                        effectiveProjectId={effectiveProjectId}
                                        onNavItemClick={onNavItemClick}
                                    />
                                );
                            }

                            return (
                                <SidebarNavLink
                                    key={item.id}
                                    href={item.href!}
                                    skipParams={item.skipParams}
                                    projectId={effectiveProjectId}
                                    className={cn(
                                        HORIZONTAL_NAV_ITEM,
                                        isActive ? HORIZONTAL_NAV_ACTIVE : HORIZONTAL_NAV_INACTIVE,
                                    )}
                                >
                                    {item.label}
                                </SidebarNavLink>
                            );
                        })}
                    </nav>
                </TooltipProvider>
            </div>
        );
    }

    return (
        <div className="fiori-side-nav flex-1 min-h-0 flex h-full flex-col overflow-y-auto overflow-x-hidden px-3 pt-4 pb-6">
            <TooltipProvider delayDuration={0}>
                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = activeId === item.id;
                        const isDisabled =
                            !item.skipParams &&
                            item.id !== "projetos" &&
                            item.id !== "dashboard" &&
                            !effectiveProjectId;

                        if (isDisabled) {
                            return (
                                <Tooltip key={item.id}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                NAV_STYLES.item,
                                                NAV_STYLES.label,
                                                NAV_STYLES.disabled,
                                            )}
                                        >
                                            <item.icon className={NAV_STYLES.icon} />
                                            <span>{item.label}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" variant="fiori">
                                        Selecione um projeto primeiro
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        if (item.subItems) {
                            return (
                                <SidebarNavGroup
                                    key={item.id}
                                    item={item}
                                    pathname={pathname}
                                    onNavItemClick={onNavItemClick}
                                    isActive={isActive}
                                    projectId={effectiveProjectId}
                                />
                            );
                        }

                        return (
                            <SidebarNavLink
                                key={item.id}
                                href={item.href!}
                                skipParams={item.skipParams}
                                projectId={effectiveProjectId}
                                onNavItemClick={onNavItemClick}
                                className={cn(
                                    NAV_STYLES.item,
                                    NAV_STYLES.label,
                                    isActive ? NAV_STYLES.active : NAV_STYLES.inactive,
                                )}
                            >
                                <item.icon className={NAV_STYLES.icon} />
                                <span>{item.label}</span>
                            </SidebarNavLink>
                        );
                    })}
                </nav>
            </TooltipProvider>
            <SidebarAccountSection
                user={user}
                profileLoading={profileLoadingSidebar}
                isAdmin={isAdmin}
                isUserLoading={isUserLoading}
                onNavItemClick={onNavItemClick}
                onSignOut={handleSignOut}
            />
        </div>
    );
});

export const MainSidebar = React.memo(function MainSidebar({
    activeProjectId,
    mode = "horizontal",
}: {
    activeProjectId: string | null;
    mode?: "horizontal";
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return (
        <div className="flex-1 flex print:hidden transition-all duration-300">
            <SidebarContent
                projectIdFromUrl={activeProjectId}
                mode={mode}
            />
        </div>
    );
});
