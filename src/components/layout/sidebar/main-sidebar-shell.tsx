"use client";

import React, { useEffect, useState } from "react";
import { SidebarContent } from "./sidebar-content";

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
