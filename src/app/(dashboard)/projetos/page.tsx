"use client";

import { Suspense } from "react";
import ProjetosPageContent from "./projetos-page-content";
import { Loader2 } from "lucide-react";

export default function ProjetosPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-SkyBlue-500" />
            </div>
        }>
            <ProjetosPageContent />
        </Suspense>
    );
}
