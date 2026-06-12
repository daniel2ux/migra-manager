"use client";

import React, { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/supabase";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    type SidebarMenuItem,
    NAV_STYLES,
    HORIZONTAL_NAV_ITEM,
    HORIZONTAL_NAV_ACTIVE,
    HORIZONTAL_NAV_INACTIVE,
} from "./types";
import { buildMenuItems, findActiveMenuItemId, isMenuItemDisabled } from "./build-menu-items";
import { useSignOut } from "./use-sidebar-projects";
import { SidebarProjectSwitcher } from "./sidebar-project-switcher";
import { SidebarAccountSection } from "./sidebar-account-section";
import { HorizontalNavDropdownMenu, SidebarNavLink, SidebarNavGroup } from "./sidebar-nav";

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

    const menuItems = useMemo(
        () => buildMenuItems(isAdmin, isMaster),
        [isAdmin, isMaster],
    );

    const activeId = findActiveMenuItemId(menuItems, pathname);

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
                            const isDisabled = isMenuItemDisabled(item, effectiveProjectId);

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
                        const isDisabled = isMenuItemDisabled(item, effectiveProjectId);

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
