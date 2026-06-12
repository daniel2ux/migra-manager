"use client";

import { useMemo } from "react";
import type { User as FirebaseAuthUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { collection, query, where } from "firebase/firestore";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { useAuth, useFirestore, useMemoFirebase, useCollection } from "@/supabase";
import { useToast } from "@/hooks/use-toast";

/** Mesmos critérios do seletor pós-login: admin vê todos; demais apenas `memberUids`. */
export function useSwitchableProjects(
    user: FirebaseAuthUser | null,
    profileLoading: boolean,
    isAdmin: boolean,
    isUserLoading: boolean,
) {
    const db = useFirestore();
    const { projectId: currentPid, updateActiveProject } = useActiveProjectId();

    const projectsQuery = useMemoFirebase(() => {
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
            sessionStorage.removeItem("migra_last_selected_project");
            if (auth) await signOut(auth);
            router.push("/login?reason=session_ended");
        } catch {
            toast({ variant: "destructive", description: "Erro ao sair." });
        }
    };
}
