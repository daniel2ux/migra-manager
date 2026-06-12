"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SheetClose } from "@/components/ui/sheet";
import { safeRouterPush } from "@/lib/navigation/safe-router";
import { buildSidebarHref } from "@/lib/navigation/sidebar-href";
import {
    type SidebarMenuItem,
    NAV_STYLES,
    HORIZONTAL_NAV_ITEM,
    HORIZONTAL_NAV_ACTIVE,
    HORIZONTAL_NAV_INACTIVE,
    HORIZONTAL_NAV_HOVER_CLOSE_MS,
} from "./types";

export function formatSubNavLabel(label: string): string {
    return label.charAt(0) + label.slice(1).toLowerCase();
}

export function HorizontalNavDropdownMenu({
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

export function SidebarNavLink({
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

export function SidebarNavGroup({
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
