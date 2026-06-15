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
    Shield,
} from "lucide-react";
import type { PermissionKey } from "@/lib/auth/permissions";
import type { SidebarMenuItem } from "./types";

export function buildMenuItems(can: (key: PermissionKey) => boolean): SidebarMenuItem[] {
    const items: SidebarMenuItem[] = [
        { id: "dashboard", href: "/", label: "Dashboard", icon: BarChart },
    ];

    if (can("projects.view")) {
        items.push({
            id: "projetos",
            href: "/projetos",
            label: "Projetos",
            icon: Layout,
            skipParams: true,
            alsoActiveOn: ["/mocks", "/objetos/"],
        });
    }

    if (can("mocks.view")) {
        items.push({ id: "mocks", href: "/mocks", label: "Mocks", icon: Package });
    }

    if (can("objects.view")) {
        items.push({ id: "objetos", href: "/objetos", label: "Objetos", icon: Table2 });
    }

    if (can("logs.view")) {
        items.push({ id: "logs", href: "/logs", label: "Logs", icon: ScrollText });
    }

    if (can("reports.view")) {
        items.push({
            id: "relatorios",
            label: "Relatórios",
            icon: FileText,
            subItems: [{ href: "/relatorios", label: "CONSOLIDADO" }],
        });
    }

    const utilityItems = [
        can("utilities.clone_project") && { href: "/utilitarios/clonar-projeto", label: "CLONAR PROJETO" },
        can("utilities.clone_mock") && { href: "/utilitarios/clonar-mock", label: "CLONAR MOCK" },
        can("backup.list") && { href: "/utilitarios/backup", label: "BACKUP" },
        can("utilities.clean_logs") && { href: "/utilitarios/limpar-logs", label: "LIMPAR LOGS" },
        can("utilities.clean_catalog") && { href: "/utilitarios/limpar-catalogo-master", label: "LIMPAR CATÁLOGO" },
    ].filter(Boolean) as NonNullable<SidebarMenuItem["subItems"]>;

    if (utilityItems.length > 0) {
        items.push({
            id: "utilitarios",
            label: "Utilitários",
            icon: Wrench,
            subItems: utilityItems,
        });
    }

    const configItems = [
        can("users.view") && { href: "/usuarios", label: "USUÁRIOS", skipParams: true },
        can("config.activity_groups") && { href: "/grupos-atividade", label: "GRUPOS DE ATIVIDADE", skipParams: true },
        can("config.charge_groups") && { href: "/grupos-objetos", label: "GRUPOS DE OBJETOS", skipParams: true },
        can("config.emails") && { href: "/configuracoes/emails", label: "E-MAILS", skipParams: true },
        can("config.system") && { href: "/configuracoes", label: "SISTEMA", skipParams: true },
        can("access_profiles.manage") && { href: "/perfis", label: "PERFIS DE ACESSO", skipParams: true },
    ].filter(Boolean) as NonNullable<SidebarMenuItem["subItems"]>;

    if (configItems.length > 0) {
        items.push({
            id: "configuracoes",
            label: "Configurações",
            icon: Settings,
            skipParams: true,
            subItems: configItems,
        });
    }

    items.push({
        id: "info",
        label: "Info",
        icon: Info,
        subItems: [
            { href: "/docs", label: "DOCS", skipParams: true },
            { href: "/sobre", label: "SOBRE", skipParams: true },
        ],
    });

    return items;
}

export function findActiveMenuItemId(
    menuItems: SidebarMenuItem[],
    pathname: string,
): string | undefined {
    let bestId: string | undefined;
    let bestScore = -1;

    const scorePrefix = (prefix: string, isPrimaryHref: boolean): number => {
        if (prefix === "/") {
            return pathname === "/" ? 1 : -1;
        }
        if (pathname === prefix) {
            return prefix.length + 10_000 + (isPrimaryHref ? 1_000 : 0);
        }
        if (pathname.startsWith(`${prefix}/`)) {
            return prefix.length + (isPrimaryHref ? 1_000 : 0);
        }
        return -1;
    };

    for (const item of menuItems) {
        const candidates: Array<{ prefix: string; isPrimaryHref: boolean }> = [];
        if (item.href) candidates.push({ prefix: item.href, isPrimaryHref: true });
        for (const prefix of item.alsoActiveOn ?? []) {
            candidates.push({ prefix, isPrimaryHref: false });
        }
        for (const sub of item.subItems ?? []) {
            candidates.push({ prefix: sub.href, isPrimaryHref: true });
        }

        for (const { prefix, isPrimaryHref } of candidates) {
            const score = scorePrefix(prefix, isPrimaryHref);
            if (score > bestScore) {
                bestScore = score;
                bestId = item.id;
            }
        }
    }

    return bestId;
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

/** Ícone auxiliar para item de perfis (usado externamente se necessário). */
export const PERFIS_MENU_ICON = Shield;
