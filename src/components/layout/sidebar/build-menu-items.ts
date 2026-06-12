import {
    BarChart,
    Info,
    FileText,
    Settings,
    ScrollText,
    Wrench,
    Layout,
    Package,
    Table2,
} from "lucide-react";
import type { SidebarMenuItem } from "./types";

export function buildMenuItems(isAdmin: boolean, isMaster: boolean): SidebarMenuItem[] {
    return [
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
    ];
}

export function findActiveMenuItemId(
    menuItems: SidebarMenuItem[],
    pathname: string,
): string | undefined {
    return menuItems.find(i => {
        if (i.href === "/") return pathname === "/";
        if (i.href && pathname.startsWith(i.href)) return true;
        if (i.alsoActiveOn?.some(p => pathname.startsWith(p))) return true;
        if (i.subItems?.some(s => pathname.startsWith(s.href))) return true;
        return false;
    })?.id;
}

export function isMenuItemDisabled(
    item: SidebarMenuItem,
    effectiveProjectId: string | null,
): boolean {
    return (
        !item.skipParams &&
        item.id !== "projetos" &&
        item.id !== "dashboard" &&
        !effectiveProjectId
    );
}
