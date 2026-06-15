"use client";

import { useState, useMemo, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Search, Plus, FolderSearch, X, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    useDb, useUser, useCollection, useMemoDb,
} from "@/supabase";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
    restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import {
    collection, doc, serverTimestamp, query, where, limit,
    collectionGroup, arrayRemove, getDocs, getDoc, writeBatch,
    setDoc, updateDoc,
    CompatDb
} from "@/supabase/compat-db-shim";
import { idsForDbIn } from "@/lib/constants";
import { filterActiveMocks } from "@/lib/mock-utils";
import { filterActiveProjects, isProjectInactive, projectCreatedAtSeconds } from "@/lib/project-utils";
import { STORAGE_KEYS } from "@/lib/constants";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import {
    setDocumentNonBlocking,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking,
} from "@/supabase/mutations";
import { useProjectsData } from "@/hooks/use-projects-data";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { getProjectCompanyName } from "@/lib/migration/project-company";
import { useProjectStatusActions } from "@/app/(dashboard)/projetos/hooks/use-project-status-actions";
import type { Project } from "@/types/migration";
import {
    ProjectFormDialog,
    ProjectCard,
    ProjectDeleteDialog,
    ProjectResetDialog,
    ProjectLockDialog,
} from "@/components/projetos";

const PAGE_TOOLBAR_BTN =
    "fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0";

export default function ProjetosPageContent() {
    const { toast } = useToast();
    const db = useDb();
    const { user } = useUser();
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState({
        name: "", company: "", description: "", isLocked: false, memberUids: [] as string[],
    });
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [projectToReset, setProjectToReset] = useState<Project | null>(null);
    const [projectToLock, setProjectToLock] = useState<Project | null>(null);
    const [isResetting, setIsResetting] = useState(false);
    const [showInactive, setShowInactive] = useLocalStorageState<boolean>(
        STORAGE_KEYS.PROJECTS_SHOW_INACTIVE,
        false,
    );
    const [mockDataByProject, setMockDataByProject] = useState<Record<string, any[]>>({});
    const [memberDataByProject, setMemberDataByProject] = useState<Record<string, any[]>>({});

    const {
        userProfile, isProfileLoading, isMaster, isAdmin, can, userProjectIds,
        projects, isProjectsLoading, allUsers, projectMembers,
    } = useProjectsData();

    const canCreate = can("projects.create");
    const canEdit = can("projects.edit");
    const canDelete = can("projects.delete");
    const canLock = can("projects.lock");
    const canView = can("projects.view");
    const usePrivilegedMockQuery = isAdmin || canEdit;

    const { projectId: activeProjectId, updateActiveProject } = useActiveProjectId();

    const {
        statusTogglingId,
        changeProjectStatus,
        toggleStatus,
        handleToggleActive,
    } = useProjectStatusActions({
        db: db as CompatDb | null,
        canEdit,
        activeProjectId,
        updateActiveProject,
        toast,
    });

    // Fetch mocks and members for non-admin users
    useEffect(() => {
        if (!db || usePrivilegedMockQuery || !projects || !userProjectIds.length) return;
        const fetchData = async () => {
            const mocksByProj: Record<string, any[]> = {};
            const membersByProj: Record<string, any[]> = {};
            for (const projectId of userProjectIds.slice(0, 30)) {
                try {
                    const mocksSnap = await getDocs(collection(db as CompatDb, "projects", projectId, "mocks"));
                    mocksByProj[projectId] = mocksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    const projectSnap = await getDoc(doc(db as CompatDb, "projects", projectId));
                    if (projectSnap.exists()) {
                        const pData = projectSnap.data() as { memberUids?: string[] } | undefined;
                        if (pData?.memberUids && pData.memberUids.length > 0) {
                            const memberSnaps = await Promise.all(
                                pData.memberUids.map((uid: string) => getDoc(doc(db as CompatDb, "users", uid)))
                            );
                            membersByProj[projectId] = memberSnaps
                                .filter((s) => s.exists())
                                .map((s) => ({ uid: s.id, ...s.data() }));
                        }
                    }
                } catch { /* ignore */ }
            }
            setMockDataByProject(mocksByProj);
            setMemberDataByProject(membersByProj);
        };
        fetchData();
    }, [db, usePrivilegedMockQuery, projects, userProjectIds]);

    // Admin mocks query — nunca usar `in` com array vazio (masters costumam ter projectIds: [])
    const mocksQuery = useMemoDb(() => {
        if (!db || !user || isProfileLoading || !userProfile || !usePrivilegedMockQuery) return null;
        const mocksRef = collectionGroup(db as CompatDb, "mocks");
        const membershipIds = idsForDbIn(projects?.map((p) => p.id));
        const profileIds = idsForDbIn(userProjectIds);
        const projectIds = membershipIds ?? profileIds;
        if (!projectIds) {
            return query(mocksRef, limit(500));
        }
        return query(mocksRef, where("projectId", "in", projectIds), limit(500));
    }, [db, user, isProfileLoading, userProfile, usePrivilegedMockQuery, userProjectIds, projects]);
    const { data: allMocks } = useCollection<any>(mocksQuery);

    const mocksByProject = useMemo(() => {
        if (!allMocks) return {};
        const map: Record<string, any[]> = {};
        for (const mock of filterActiveMocks(allMocks)) {
            const pid = mock.projectId || mock.__path?.split("/")[1];
            if (pid) { if (!map[pid]) map[pid] = []; map[pid].push(mock); }
        }
        return map;
    }, [allMocks]);

    // Obter mock selecionada do localStorage para exibição no badge
    const [selectedMockName, setSelectedMockName] = useState<string | null>(null);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mockId = localStorage.getItem("dashboard_last_mock_id") || "all";
        if (mockId && mockId !== "all" && mocksByProject[activeProjectId || ""]) {
            const mock = mocksByProject[activeProjectId!].find((m: any) => m.id === mockId);
            setSelectedMockName(mock?.name || null);
        } else {
            setSelectedMockName(null);
        }
    }, [activeProjectId, mocksByProject]);



    const [orderedProjectIds, setOrderedProjectIds] = useState<string[]>([]);

    useEffect(() => {
        if (projects && orderedProjectIds.length === 0) {
            const savedOrder = userProfile?.projectOrder as string[];
            if (savedOrder && savedOrder.length > 0) {
                const projectIds = projects.map(p => p.id);
                const validatedOrder = savedOrder.filter(id => projectIds.includes(id));
                const missingIds = projectIds.filter(id => !validatedOrder.includes(id));
                setOrderedProjectIds([...validatedOrder, ...missingIds]);
            } else {
                setOrderedProjectIds(projects.map(p => p.id));
            }
        }
    }, [projects, userProfile, orderedProjectIds.length]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = orderedProjectIds.indexOf(active.id);
            const newIndex = orderedProjectIds.indexOf(over.id);
            const newOrder = arrayMove(orderedProjectIds, oldIndex, newIndex);
            setOrderedProjectIds(newOrder);

            if (userProfile && db) {
                const userRef = doc(db as CompatDb, "users", user!.uid);
                updateDocumentNonBlocking(userRef, { projectOrder: newOrder });
            }
        }
    };

    const filteredProjects = useMemo(() => {
        if (!projects) return [];
        let scope = showInactive ? projects : filterActiveProjects(projects);
        if (activeProjectId && activeProjectId !== "all") {
            const selected = projects.find((p) => p.id === activeProjectId);
            if (
                selected &&
                isProjectInactive(selected) &&
                !scope.some((p) => p.id === activeProjectId)
            ) {
                scope = [...scope, selected];
            }
        }
        const filtered = scope
            .filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.company && p.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
            );

        if (orderedProjectIds.length > 0) {
            return [...filtered].sort((a, b) => {
                const idxA = orderedProjectIds.indexOf(a.id);
                const idxB = orderedProjectIds.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return projectCreatedAtSeconds(b.createdAt) - projectCreatedAtSeconds(a.createdAt);
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
        }

        return filtered.sort((a, b) => projectCreatedAtSeconds(b.createdAt) - projectCreatedAtSeconds(a.createdAt));
    }, [projects, searchTerm, orderedProjectIds, showInactive, activeProjectId]);

    const inactiveCount = useMemo(
        () => (projects ?? []).filter((p) => isProjectInactive(p)).length,
        [projects],
    );

    /** Escopo global: apenas o projeto ativo escolhido após login (URL/sessão). */
    const displayedProjects = useMemo(() => {
        if (!activeProjectId || activeProjectId === 'all') return filteredProjects;
        return filteredProjects.filter((p) => p.id === activeProjectId);
    }, [filteredProjects, activeProjectId]);

    const activeProject = useMemo(() => {
        if (!activeProjectId || activeProjectId === "all" || !projects) return null;
        return projects.find((p) => p.id === activeProjectId) ?? null;
    }, [activeProjectId, projects]);

    const handleOpenDialog = (project?: Project) => {
        if (!project && !canCreate) return;
        if (project && !canView) return;
        if (project && !canEdit) { setEditingProject(project); setOpen(true); return; }
        setEditingProject(project || null);
        setFormData({
            name: project?.name || "",
            company: project?.company || "",
            description: project?.description || "",
            isLocked: project?.isLocked || false,
            memberUids: project?.memberUids || [],
        });
        setOpen(true);
    };

    const handleSave = async () => {
        const trimmedName = formData.name.trim();
        const isEditing = !!editingProject;
        if (!trimmedName || !user || !db) {
            toast({ variant: "destructive", description: "Ação não permitida ou dados incompletos." });
            return;
        }
        if (isEditing && !canEdit) {
            toast({ variant: "destructive", description: "Sem permissão para editar projetos." });
            return;
        }
        if (!isEditing && !canCreate) {
            toast({ variant: "destructive", description: "Sem permissão para criar projetos." });
            return;
        }
        const projectId = editingProject?.id ?? doc(collection(db as CompatDb, "projects")).id;
        const projectRef = doc(db as CompatDb, "projects", projectId);
        const memberProfiles = allUsers
            ? formData.memberUids.map(uid => {
                const u = allUsers.find((u: any) => u.uid === uid);
                return u ? { uid, name: u.name, role: u.role ?? '', position: (u as any).position ?? '' } : null;
            }).filter((p): p is NonNullable<typeof p> => p !== null)
            : undefined;
        const projectData = {
            id: projectId,
            name: trimmedName.toUpperCase(),
            company: formData.company.trim().toUpperCase(),
            description: formData.description.trim(),
            isLocked: formData.isLocked,
            memberUids: formData.memberUids,
            ...(memberProfiles !== undefined ? { memberProfiles } : {}),
            ownerId: user.uid,
            updatedAt: serverTimestamp(),
            ...(!isEditing ? { createdAt: serverTimestamp() } : {}),
        };

        try {
            await setDoc(projectRef, projectData, { merge: true });

            if (allUsers) {
                const memberOps: Promise<void>[] = [];
                for (const uid of formData.memberUids) {
                    const u = allUsers.find((userObj: any) => userObj.uid === uid);
                    if (!u) continue;
                    const currentProjectIds = u.projectIds || [];
                    if (!currentProjectIds.includes(projectId)) {
                        let newProjectIds: string[];
                        if (u.role === "user") {
                            currentProjectIds.forEach(oldPid => {
                                if (oldPid !== projectId) {
                                    memberOps.push(
                                        updateDoc(doc(db as CompatDb, "projects", oldPid), { memberUids: arrayRemove(uid) }),
                                    );
                                }
                            });
                            newProjectIds = [projectId];
                        } else {
                            newProjectIds = [...currentProjectIds, projectId];
                        }
                        memberOps.push(
                            updateDoc(doc(db as CompatDb, "users", uid), { projectIds: newProjectIds }),
                        );
                    }
                }
                if (isEditing) {
                    for (const uid of (editingProject.memberUids || []).filter(uid => !formData.memberUids.includes(uid))) {
                        memberOps.push(
                            updateDoc(doc(db as CompatDb, "users", uid), { projectIds: arrayRemove(projectId) }),
                        );
                    }
                }
                await Promise.all(memberOps);
            }

            if (!isEditing) {
                updateActiveProject(projectId);
                setOrderedProjectIds((prev) => (prev.includes(projectId) ? prev : [...prev, projectId]));
            }

            toast({ description: isEditing ? "Projeto atualizado com sucesso." : "Projeto cadastrado com sucesso." });
            setOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao salvar projeto.";
            toast({ variant: "destructive", description: message });
        }
    };

    const handleDeleteProject = (project: Project) => {
        if (!canDelete) return;
        if (project.memberUids && project.memberUids.length > 0) {
            project.memberUids.forEach(uid => {
                updateDocumentNonBlocking(doc(db as CompatDb, "users", uid), { projectIds: arrayRemove(project.id) });
            });
        }
        deleteDocumentNonBlocking(doc(db as CompatDb, "projects", project.id));
        toast({ description: "Projeto excluído permanentemente." });
        setProjectToDelete(null);
    };

    const handleResetProject = async (project: Project) => {
        if (!canEdit) return;
        setIsResetting(true);
        try {
            const mocksRef = collection(db as CompatDb, "projects", project.id, "mocks");
            const mocksSnap = await getDocs(mocksRef);
            let batch = writeBatch(db as CompatDb); let opCount = 0;
            const commitBatch = async () => {
                if (opCount >= 450) { await batch.commit(); batch = writeBatch(db as CompatDb); opCount = 0; }
            };
            for (const mockDoc of mocksSnap.docs) {
                const objectsRef = collection(db as CompatDb, "projects", project.id, "mocks", mockDoc.id, "migrationObjects");
                const objectsSnap = await getDocs(objectsRef);
                for (const objectDoc of objectsSnap.docs) {
                    const commentsRef = collection(db as CompatDb, "projects", project.id, "mocks", mockDoc.id, "migrationObjects", objectDoc.id, "comments");
                    const commentsSnap = await getDocs(commentsRef);
                    for (const commentDoc of commentsSnap.docs) { batch.delete(commentDoc.ref); opCount++; await commitBatch(); }
                    batch.delete(objectDoc.ref); opCount++; await commitBatch();
                }
                batch.delete(mockDoc.ref); opCount++; await commitBatch();
            }
            if (opCount > 0) await batch.commit();
            toast({ description: "Projeto reinicializado com sucesso." });
        } catch { toast({ variant: "destructive", description: "Erro ao inicializar projeto." }); }
        finally { setIsResetting(false); setProjectToReset(null); }
    };

    const executeToggleLock = (project: Project) => {
        if (project.isLocked && project.lockedByMaster && project.lockedByUid !== user?.uid) {
            toast({ variant: "destructive", description: `Projeto bloqueado por ${project.lockedByName}. Contate-o para liberação.` });
            return;
        }
        const projectRef = doc(db as CompatDb, "projects", project.id);
        const unlocking = project.isLocked;
        setDocumentNonBlocking(projectRef, unlocking
            ? { isLocked: false, lockedByMaster: false, lockedByUid: "", lockedByName: "" }
            : { isLocked: true, lockedByMaster: isMaster, lockedByUid: user?.uid ?? "", lockedByName: userProfile?.name ?? "" },
            { merge: true });
    };

    const toggleLock = (project: Project) => {
        if (!canLock) return;
        if (project.isLocked) {
            executeToggleLock(project);
        } else {
            setProjectToLock(project);
        }
    };

    const handleAiGenerate = async () => {
        if (!formData.name) { toast({ variant: "destructive", description: "Digite um nome para gerar a descrição." }); return; }
        setIsGenerating(true);
        try {
            const callerToken = await user?.getIdToken();
            if (!callerToken) {
                toast({ variant: "destructive", description: "Sessão expirada. Faça login novamente." });
                return;
            }
            const res = await fetch("/api/ai/description", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "project", keywords: formData.name.trim(), callerToken }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Falha ao gerar descrição com IA.");
            setFormData({ ...formData, description: data.description });
            if (data?.source === "fallback") {
                toast({ description: "IA indisponível no ambiente. Texto gerado por fallback local." });
            }
        } catch { toast({ variant: "destructive", description: "Erro ao gerar descrição com IA." }); }
        finally { setIsGenerating(false); }
    };

    if (isProjectsLoading || isProfileLoading) {
        return <DashboardShell noPadding><div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-SkyBlue-500" /></div></DashboardShell>;
    }

    return (
        <DashboardShell noPadding>
            <div className="flex flex-col relative w-full h-full min-h-full">
                <PageHeader
                    variant="fiori"
                    title="Projetos"
                    subtitle={
                        activeProjectId && activeProjectId !== "all"
                            ? "Projeto em contexto (escopo atual)"
                            : "Sistema de migração"
                    }
                    empresa={getProjectCompanyName(activeProject) ?? undefined}
                    projectName={activeProject?.name}
                    badge={
                        <>
                            <span className="fiori-page-badge">{displayedProjects.length}</span>
                            {selectedMockName && (
                                <span className="fiori-page-mock-tag">{selectedMockName}</span>
                            )}
                        </>
                    }
                    backHref="/"
                    actions={
                        <TooltipProvider delayDuration={0}>
                            <div className="fiori-toolbar">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                                            className={cn(
                                                PAGE_TOOLBAR_BTN,
                                                (isSearchOpen || searchTerm) && "fiori-toolbar-btn-active"
                                            )}
                                        >
                                            <Search className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" variant="fiori">
                                        {isSearchOpen ? "Fechar busca" : "Buscar projetos"}
                                    </TooltipContent>
                                </Tooltip>
                                {inactiveCount > 0 && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    PAGE_TOOLBAR_BTN,
                                                    showInactive && "fiori-toolbar-btn-active",
                                                )}
                                                onClick={() => setShowInactive(!showInactive)}
                                                aria-label={
                                                    showInactive
                                                        ? "Ocultar projetos inativos"
                                                        : "Exibir projetos inativos"
                                                }
                                            >
                                                {showInactive ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" variant="fiori">
                                            {showInactive
                                                ? "Ocultar projetos inativos"
                                                : `Exibir projetos inativos (${inactiveCount})`}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                {canCreate && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenDialog()}
                                                className={PAGE_TOOLBAR_BTN}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" variant="fiori">
                                            Novo projeto
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        </TooltipProvider>
                    }
                />

                {isSearchOpen && (
                    <div className="px-4 md:px-8 pb-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="relative group max-w-2xl mx-auto lg:mx-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-500 transition-colors" />
                            <input placeholder="BUSCAR PELO NOME, EMPRESA OU DESCRIÇÃO..." className="w-full h-11 pl-10 pr-12 text-[11px] uppercase font-bold tracking-widest bg-slate-200/60 border-none transition-all rounded-none focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-SkyBlue-500/40 shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                                autoFocus
                            />
                            {searchTerm && <Button variant="ghost" size="icon" onClick={() => setSearchTerm("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 hover:bg-slate-200 text-slate-400 hover:text-slate-900"><X className="w-3.5 h-3.5" /></Button>}
                        </div>
                    </div>
                )}

                <ProjectFormDialog
                    open={open} onOpenChange={setOpen}
                    editingProject={editingProject}
                    formData={formData}
                    onFormChange={setFormData}
                    onSave={handleSave}
                    users={projectMembers}
                    onAiGenerate={handleAiGenerate}
                    isGenerating={isGenerating}
                    canEdit={canEdit}
                    canCreate={canCreate}
                />

                {isProjectsLoading || isProfileLoading ? (
                    <div className="flex flex-1 justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-slate-400" /></div>
                ) : displayedProjects.length > 0 ? (
                    <TooltipProvider>
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-4">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                modifiers={[restrictToWindowEdges]}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={displayedProjects.map(p => p.id)}
                                    strategy={rectSortingStrategy}
                                >
                                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 280px))" }}>
                                        {displayedProjects.map((project) => {
                                            const projectMocks = usePrivilegedMockQuery ? (mocksByProject?.[project.id] || []) : (mockDataByProject?.[project.id] || []);
                                            const hasMocksInProgress = projectMocks.some((m: any) => m.status === 'CARGA_EM_ANDAMENTO' || m.isRunning);
                                            const locked = project.isLocked;
                                            return (
                                                <ProjectCard
                                                    key={project.id}
                                                    project={project}
                                                    canEdit={canEdit && !locked}
                                                    canLock={canLock}
                                                    canDelete={canDelete}
                                                    canReset={canEdit}
                                                    membersCount={(project.memberProfiles || memberDataByProject?.[project.id] || []).length}
                                                    mocksCount={projectMocks.length}
                                                    onEdit={() => handleOpenDialog(project)}
                                                    onDelete={() => setProjectToDelete(project)}
                                                    onReset={() => setProjectToReset(project)}
                                                    onToggleLock={() => toggleLock(project)}
                                                    onToggleStatus={() => toggleStatus(project, hasMocksInProgress)}
                                                    onStatusChange={(status) => changeProjectStatus(project, status)}
                                                    onToggleActive={(activate) =>
                                                        handleToggleActive(project, activate, hasMocksInProgress)
                                                    }
                                                    isToggling={statusTogglingId === project.id}
                                                    hasMocksInProgress={hasMocksInProgress}
                                                    isActive={
                                                        project.id === activeProjectId &&
                                                        !isProjectInactive(project)
                                                    }
                                                    onSelect={() => updateActiveProject(project.id)}
                                                />
                                            );
                                        })}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </TooltipProvider>
                ) : filteredProjects.length > 0 &&
                  activeProjectId &&
                  activeProjectId !== 'all' &&
                  displayedProjects.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center p-12 text-center space-y-4">
                        <FolderSearch className="w-12 h-12 text-slate-100" />
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest max-w-sm">
                            O projeto selecionado no contexto não está entre os projetos aos quais você tem acesso, ou não corresponde à busca.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center p-20 text-center space-y-4">
                        <FolderSearch className="w-12 h-12 text-slate-100" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum projeto encontrado.</p>
                        {canCreate && <Button onClick={() => handleOpenDialog()} className="rounded-none text-[10px] font-black uppercase tracking-widest"><Plus className="w-3.5 h-3.5 mr-2" />Novo Projeto</Button>}
                    </div>
                )}

                <ProjectDeleteDialog
                    project={projectToDelete}
                    open={!!projectToDelete}
                    onOpenChange={(open) => { if (!open) setProjectToDelete(null); }}
                    onConfirm={() => projectToDelete && handleDeleteProject(projectToDelete)}
                />
                <ProjectResetDialog
                    project={projectToReset}
                    open={!!projectToReset}
                    onOpenChange={(open) => { if (!open && !isResetting) setProjectToReset(null); }}
                    onConfirm={async () => { if (projectToReset) await handleResetProject(projectToReset); }}
                    isResetting={isResetting}
                />
                <ProjectLockDialog
                    project={projectToLock}
                    open={!!projectToLock}
                    onOpenChange={(open) => !open && setProjectToLock(null)}
                    onConfirm={() => {
                        if (projectToLock) {
                            executeToggleLock(projectToLock);
                            setProjectToLock(null);
                        }
                    }}
                />
            </div>
        </DashboardShell>
    );
}
