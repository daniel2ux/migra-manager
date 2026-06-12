import type React from "react";

export type SidebarMenuItem = {
    id: string;
    href?: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    skipParams?: boolean;
    alsoActiveOn?: string[];
    subItems?: { href: string; label: string; skipParams?: boolean }[];
};

/** Estilos da navegação vertical (Fiori). */
export const NAV_STYLES = {
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

export const HORIZONTAL_NAV_ITEM =
    "fiori-horizontal-nav-item flex items-center gap-2 px-4 py-2 text-[0.875rem] font-semibold";
export const HORIZONTAL_NAV_ACTIVE = "fiori-horizontal-nav-item--active";
export const HORIZONTAL_NAV_INACTIVE = "";
export const HORIZONTAL_NAV_HOVER_CLOSE_MS = 180;
