"use client";

import { useEffect, useCallback, useState, Suspense } from "react";
import { MainSidebar, SidebarContent, UserMenu } from "@/components/layout/main-sidebar";
import { useUser, useDb, useMemoDb, useDoc } from "@/supabase";
import { UserProfile } from "@/types/migration";
import { doc } from "@/supabase/compat-db-shim";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { usePresence } from "@/hooks/use-presence";
import { Loader2, Menu, Zap, LogOut, X } from "lucide-react";
import { DashboardHomeLink } from "@/components/layout/dashboard-home-link";
import { useSignOut } from "@/components/layout/sidebar/use-sidebar-projects";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MandatoryProjectPicker } from "@/components/layout/mandatory-project-picker";
import { safeRouterPush } from "@/lib/navigation/safe-router";
import { stripNavigationQueryParams } from "@/lib/auth/app-session";
import { SESSION_KEYS } from "@/lib/constants";
import { PROJECT_CHANGED_EVENT } from "@/hooks/use-active-project-id";

function StripNavigationQueryParams() {
    useEffect(() => {
        stripNavigationQueryParams();
    }, []);
    return null;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const isPasswordChangeRoute = pathname === "/alterar-senha";

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const handleCloseMobileMenu = useCallback(() => {
        setIsMobileMenuOpen(false);
    }, []);
    const handleSignOut = useSignOut();
    const handleMobileSignOut = useCallback(() => {
        void handleSignOut();
        handleCloseMobileMenu();
    }, [handleSignOut, handleCloseMobileMenu]);

    const db = useDb();

    const userDocRef = useMemoDb(
        () => (user && db && !isUserLoading ? doc(db, "users", user.uid) : null),
        [db, user, isUserLoading],
    );
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    usePresence(!isUserLoading ? userProfile || undefined : undefined);

    const isAuthenticating = isUserLoading;

    useEffect(() => {
        if (!isUserLoading && !user) {
            safeRouterPush(router, "/login");
        }
    }, [user, isUserLoading, router]);

    useEffect(() => {
        if (!user || isUserLoading || !userProfile) return;
        if (userProfile.mustChangePassword && !isPasswordChangeRoute) {
            safeRouterPush(router, "/alterar-senha");
        }
    }, [user, isUserLoading, userProfile, isPasswordChangeRoute, router]);

    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = sessionStorage.getItem(SESSION_KEYS.ACTIVE_PROJECT);
        if (stored && stored !== "all") setActiveProjectId(stored);
    }, []);

    useEffect(() => {
        const onProjectChanged = (e: Event) => {
            const pid = (e as CustomEvent<string | null>).detail;
            setActiveProjectId(pid && pid !== "all" ? pid : null);
        };
        window.addEventListener(PROJECT_CHANGED_EVENT, onProjectChanged);
        return () => window.removeEventListener(PROJECT_CHANGED_EVENT, onProjectChanged);
    }, []);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    return (
        <DashboardShell noPadding>
            <div className="h-dvh bg-slate-50/50 flex flex-col overflow-hidden dashboard-no-rounded relative">
                <Suspense fallback={null}>
                    <StripNavigationQueryParams />
                </Suspense>

                {!isPasswordChangeRoute && (
                <header className="fixed top-0 left-0 right-0 flex items-center justify-between min-h-16 h-auto py-2 px-4 md:px-8 z-[70] print:hidden dashboard-mobile-header">
                    <div className="flex items-center gap-6">
                        <Suspense
                            fallback={
                                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                    <div className="fiori-shell-brand-icon">
                                        <Zap className="w-4 h-4 text-white fill-white" />
                                    </div>
                                    <span className="text-lg font-black text-slate-900 tracking-tight">Migra</span>
                                </Link>
                            }
                        >
                            <DashboardHomeLink className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <div className="fiori-shell-brand-icon">
                                    <Zap className="w-4 h-4 text-white fill-white" />
                                </div>
                                <span className="text-lg font-black text-slate-900 tracking-tight">Migra</span>
                            </DashboardHomeLink>
                        </Suspense>

                        <div className="hidden xl:block">
                            {mounted && !isUserLoading && (
                                <MainSidebar activeProjectId={activeProjectId} />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden xl:block">
                            {mounted && !isUserLoading && <UserMenu />}
                        </div>

                        <div className="xl:hidden">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 border border-slate-100">
                                        <Menu className="h-5 w-5 text-slate-600" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    side="right"
                                    overlayClassName="fiori-nav-sheet-overlay"
                                    className="fiori-nav-sheet p-0 w-72 h-dvh flex flex-col gap-0"
                                    hideCloseButton
                                >
                                    <SheetHeader className="fiori-nav-sheet-header space-y-0 text-left">
                                        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                                        <div className="fiori-nav-sheet-header-row">
                                            <Suspense
                                                fallback={
                                                    <Link href="/" className="fiori-nav-sheet-brand">
                                                        <div className="fiori-nav-sheet-brand-icon">
                                                            <Zap className="w-5 h-5 fill-current" />
                                                        </div>
                                                        <span className="fiori-nav-sheet-brand-title">Migra</span>
                                                    </Link>
                                                }
                                            >
                                                <DashboardHomeLink
                                                    onNavigate={handleCloseMobileMenu}
                                                    className="fiori-nav-sheet-brand min-w-0"
                                                >
                                                    <div className="fiori-nav-sheet-brand-icon">
                                                        <Zap className="w-5 h-5 fill-current" />
                                                    </div>
                                                    <span className="fiori-nav-sheet-brand-title">Migra</span>
                                                </DashboardHomeLink>
                                            </Suspense>
                                            <div className="fiori-nav-sheet-header-actions">
                                                <TooltipProvider delayDuration={0}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                type="button"
                                                                onClick={handleMobileSignOut}
                                                                className="fiori-nav-sheet-signout-btn"
                                                                aria-label="Encerrar sessão"
                                                            >
                                                                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" variant="fiori">
                                                            Encerrar sessão
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <SheetClose
                                                    className="fiori-nav-sheet-close-btn"
                                                    aria-label="Fechar menu"
                                                >
                                                    <X className="h-4 w-4" aria-hidden />
                                                </SheetClose>
                                            </div>
                                        </div>
                                    </SheetHeader>
                                    <div className="flex-1 min-h-0 flex flex-col min-w-0 relative">
                                        <Suspense fallback={null}>
                                            <SidebarContent
                                                onNavItemClick={handleCloseMobileMenu}
                                                projectIdFromUrl={activeProjectId}
                                                hideSignOut
                                            />
                                        </Suspense>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </header>
                )}

                <main className={`dashboard-main-scroll flex-1 min-h-0 overflow-y-auto custom-scrollbar overflow-x-hidden relative ${isPasswordChangeRoute ? "pt-0" : "pt-16"}`}>
                    {isAuthenticating ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-SkyBlue-500/20" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">
                                    Sincronizando...
                                </span>
                            </div>
                        </div>
                    ) : !user ? (
                        null
                    ) : (
                        <div className="flex-1 flex flex-col min-h-full">
                            {!isPasswordChangeRoute && (
                                <Suspense fallback={null}>
                                    <MandatoryProjectPicker />
                                </Suspense>
                            )}
                            {children}
                        </div>
                    )}
                </main>
            </div>
        </DashboardShell>
    );
}
