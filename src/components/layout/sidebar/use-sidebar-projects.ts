"use client";

import { useMemo } from "react";
import type { User as CompatAuthUser } from "@/supabase/auth-shim";
import { useRouter } from "next/navigation";
import { signOutAndRedirect } from "@/lib/auth/sign-out";
import { collection, query, where } from "@/supabase/compat-db-shim";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { useAuth, useDb, useMemoDb, useCollection } from "@/supabase";
import { useToast } from "@/hooks/use-toast";

/** Mesmos critérios do seletor pós-login: admin vê todos; demais apenas `memberUids`. */
export function useSwitchableProjects(
    user: CompatAuthUser | null,
    profileLoading: boolean,
    isAdmin: boolean,
    isUserLoading: boolean,
) {
    const db = useDb();
    const { projectId: currentPid, updateActiveProject } = useActiveProjectId();

    const projectsQuery = useMemoDb(() => {
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

export function useSignOut() {
    const auth = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    return async () => {
        try {
            if (auth) await signOutAndRedirect(auth, router);
        } catch {
            toast({ variant: "destructive", description: "Erro ao sair." });
        }
    };
}
