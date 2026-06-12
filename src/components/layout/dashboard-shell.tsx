"use client";

import { cn } from "@/lib/utils";

export function DashboardShell({
    children,
    noPadding = false,
}: {
    children: React.ReactNode;
    noPadding?: boolean;
}) {
    return (
        <div
            className={cn(
                "w-full h-full dashboard-no-rounded",
                noPadding && "flex flex-col flex-1 min-h-0",
                !noPadding && "p-4 md:p-8",
            )}
        >
            {children}
        </div>
    );
}
