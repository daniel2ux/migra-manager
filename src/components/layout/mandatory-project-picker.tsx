"use client";

import { useEffect, useMemo } from "react";
import { collection, doc, query, where } from "@/supabase/compat-db-shim";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDb, useUser, useCollection, useMemoDb, useDoc } from "@/supabase";
import type { UserProfile } from "@/types/migration";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { AlertCircle, Loader2, FolderKanban, LogOut } from "lucide-react";
import { useAuth } from "@/supabase/provider";
import { signOutAndRedirect } from "@/lib/auth/sign-out";
import { useRouter, usePathname } from "next/navigation";

type ProjectBrief = {
  id: string;
  name?: string;
  company?: string;
};

/**
 * Após login, se o usuário participar de mais de um projeto, exige a escolha
 * explícita do projeto em que trabalhará. O estado ativo usa `useActiveProjectId`
 * (sessão + URL + eventos), alinhado ao restante do dashboard.
 */
export function MandatoryProjectPicker() {
  const db = useDb();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { projectId: activeProjectId, updateActiveProject } = useActiveProjectId();

  const userDocRef = useMemoDb(
    () => (user && db && !isUserLoading ? doc(db, "users", user.uid) : null),
    [db, user, isUserLoading],
  );
  const {
    data: userProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useDoc<UserProfile>(userDocRef);

  const isAdmin = useMemo(() => {
    if (!userProfile) return false;
    return !!(
      userProfile.isMaster ||
      userProfile.role?.toLowerCase() === "admin" ||
      userProfile.role?.toLowerCase() === "master"
    );
  }, [userProfile]);

  /** Mesmo critério de `use-dashboard-queries`: admin vê coleção inteira; demais apenas membros */
  const projectsQuery = useMemoDb(() => {
    if (!db || !user || isUserLoading || profileLoading) return null;
    const projectsRef = collection(db, "projects");
    if (isAdmin) return projectsRef;
    return query(
      projectsRef,
      where("memberUids", "array-contains", user.uid),
    );
  }, [db, user, isUserLoading, profileLoading, isAdmin]);

  const {
    data: rawProjects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useCollection<ProjectBrief>(projectsQuery);

  const sortedProjects = useMemo(() => {
    const list = rawProjects ?? [];
    if (!list.length) return [];
    return [...list].sort((a, b) =>
      (a.name ?? a.id).localeCompare(b.name ?? b.id, "pt-BR"),
    );
  }, [rawProjects]);

  const allowedIds = useMemo(
    () => new Set(sortedProjects.map((p) => p.id)),
    [sortedProjects],
  );

  const profileSettled = !!user && !!db && !isUserLoading && !profileLoading;
  const projectsFetchStarted = projectsQuery !== null;
  const projectsSettled = profileSettled && projectsFetchStarted && !projectsLoading;

  const membershipsReady = profileSettled && projectsSettled;

  const loadError = profileError ?? projectsError;

  /** ID ativo permitido nos projetos onde o usuário é membro */
  const validActiveId =
    activeProjectId &&
    activeProjectId !== "all" &&
    allowedIds.has(activeProjectId)
      ? activeProjectId
      : null;

  /** Seleção salva/anterior não é mais válida entre os projetos do usuário */
  useEffect(() => {
    if (!membershipsReady || loadError) return;
    if (sortedProjects.length === 0) return;
    if (
      activeProjectId &&
      activeProjectId !== "all" &&
      !allowedIds.has(activeProjectId)
    ) {
      updateActiveProject(null);
    }
  }, [
    membershipsReady,
    loadError,
    sortedProjects.length,
    activeProjectId,
    allowedIds,
    updateActiveProject,
  ]);

  /** Sem projetos como membro: limpa sessão para não manter projeto de outra conta/contexto */
  useEffect(() => {
    if (!membershipsReady || loadError) return;
    if (sortedProjects.length > 0) return;
    if (activeProjectId && activeProjectId !== "all") {
      updateActiveProject(null);
    }
  }, [
    membershipsReady,
    loadError,
    sortedProjects.length,
    activeProjectId,
    updateActiveProject,
  ]);

  /** Um único projeto disponível — escolhe automaticamente */
  useEffect(() => {
    if (!membershipsReady || loadError) return;
    if (sortedProjects.length !== 1) return;
    const only = sortedProjects[0].id;
    if (activeProjectId === only) return;
    updateActiveProject(only);
  }, [
    membershipsReady,
    loadError,
    sortedProjects,
    activeProjectId,
    updateActiveProject,
  ]);

  const mustPick =
    membershipsReady &&
    !loadError &&
    sortedProjects.length > 1 &&
    !validActiveId;

  const showLoadingBackdrop = !!user && !!db && !membershipsReady;

  const handleSignOut = async () => {
    if (!auth) return;
    await signOutAndRedirect(auth, router);
  };

  const handlePick = (id: string) => {
    if (!allowedIds.has(id)) return;
    updateActiveProject(id);
  };

  const shouldSkip =
    pathname === "/alterar-senha" || userProfile?.mustChangePassword === true;

  if (shouldSkip) {
    return null;
  }

  return (
    <>
      {showLoadingBackdrop && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-white/85 backdrop-blur-xs"
          aria-busy="true"
          aria-label="Carregando projetos"
        >
          <Loader2 className="h-9 w-9 animate-spin text-SkyBlue-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Preparando ambiente...
          </span>
        </div>
      )}

      {membershipsReady && loadError && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-white/90 px-6 backdrop-blur-xs"
          role="alert"
        >
          <AlertCircle className="h-10 w-10 text-red-500" />
          <div className="max-w-md text-center space-y-2">
            <p className="text-sm font-bold text-slate-900">
              Não foi possível carregar seus projetos
            </p>
            <p className="text-xs text-slate-600">
              A conexão com o banco de dados foi recusada. Tente sair e entrar novamente.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="dashboard-no-rounded gap-2"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="h-4 w-4" />
            Sair e tentar novamente
          </Button>
        </div>
      )}

      <Dialog open={mustPick}>
        <DialogContent
          overlayClassName="fiori-dialog-overlay"
          className="fiori-dialog fiori-project-picker-dialog !flex p-0 flex-col gap-0 overflow-hidden shadow-lg [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="fiori-dialog-header-row">
              <div className="fiori-dialog-header-main">
                <div className="fiori-dialog-icon shrink-0">
                  <FolderKanban className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="fiori-dialog-title">
                    Escolha o projeto
                  </DialogTitle>
                  <DialogDescription className="fiori-dialog-subtitle">
                    Você está vinculado a mais de um projeto. Selecione em qual contexto deseja
                    trabalhar.
                  </DialogDescription>
                </div>
              </div>
              <div className="fiori-dialog-header-actions">
                <Button
                  type="button"
                  variant="ghost"
                  className="fiori-btn-transparent fiori-stat-action-btn shadow-none gap-1.5"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden />
                  Sair
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="fiori-project-picker-body">
            <p className="fiori-dialog-info fiori-project-picker-info">
              Dashboard, mocks, objetos e demais telas usarão apenas este projeto até você alterar
              na página{" "}
              <span className="font-semibold text-[var(--fiori-text)]">Projetos</span>.
            </p>

            <div className="fiori-project-picker-list custom-scrollbar">
              <ul className="fiori-project-picker-items">
                {sortedProjects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="fiori-project-picker-row"
                      onClick={() => handlePick(p.id)}
                    >
                      <FolderKanban className="fiori-project-picker-row-icon" aria-hidden />
                      <span className="fiori-project-picker-row-text">
                        <span className="fiori-project-picker-row-name">{p.name || p.id}</span>
                        {p.company?.trim() ? (
                          <span className="fiori-project-picker-row-meta">{p.company}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
