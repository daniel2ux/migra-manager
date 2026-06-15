"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, serverTimestamp } from "@/supabase/compat-db-shim";
import {
    addDocumentNonBlocking,
    deleteDocumentNonBlocking,
    updateDocumentNonBlocking,
} from "@/supabase/mutations";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Loader2, Layout, Target } from "lucide-react";
import { formatNumber, unformatNumber, formatCommentDate } from "@/lib/formatters";
import { formatStatDate, formatStatTime, formatStatDuration } from "./hooks/use-dashboard-export";
import { buildLogExportMeta } from "@/lib/export/log-export-meta";
import { mergeMigrationSequencesOntoMasters } from "@/lib/migration/merge-master-sequences";
import { getDashboardScrollContainer } from "@/lib/dashboard/scroll-preservation";

// Hooks Customizados
import { useDashboardQueries } from "./hooks/use-dashboard-queries";
import { useDashboardFiltersState } from "./hooks/use-dashboard-filters-state";
import { useDashboardNavigation } from "./hooks/use-dashboard-navigation";
import { useDashboardFiltering } from "./hooks/use-dashboard-filtering";
import { useDashboardMockActions } from "./hooks/use-dashboard-mock-actions";
import { useDashboardQuickEdit } from "./hooks/use-dashboard-quick-edit";
import { useDashboardExport } from "./hooks/use-dashboard-export";
import { useToast } from "@/hooks/use-toast";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { getProjectCompanyName, getProjectNameForContext } from "@/lib/migration/project-company";
import type { AggregatedObject } from "@/types/migration";
import type { MasterObject } from "@/types/master-object";
import { getDashboardCardKey } from "@/lib/dashboard/card-key";
import { formatSequence } from "@/lib/migration/sequence-utils";
import { useDashboardCardSelection } from "./hooks/use-dashboard-card-selection";

// Subcomponentes de UI
import { DashboardSelectors } from "./components/dashboard-selectors";
import { DashboardFilters } from "./components/dashboard-filters";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardModals } from "./components/dashboard-modals";

/**
 * DASHBOARD PAGE REFACTORED
 * Mantendo 100% da lógica original, mas modularizada com hooks customizados.
 */
function DashboardContent() {
    const router = useRouter();
    // 1. Estado de Filtros UI
    const filtersState = useDashboardFiltersState();
    const { toast } = useToast();
    const { projectId: activeProjectId } = useActiveProjectId();
    const bootstrapProjectId = activeProjectId ?? "all";

    // 2. Queries Supabase — escopo do projeto ativo quando já definido
    const queries = useDashboardQueries(bootstrapProjectId, "all");

    // 3. Navegação e Seleção (Refinado)
    const nav = useDashboardNavigation(queries.allMocks || undefined, queries.projects || undefined, queries.isAdmin);

    // Re-bind queries with actual selections to get specific data
    const activeQueries = useDashboardQueries(nav.selectedProjectId, nav.selectedMockId);

    // 4. Local UI states for Modals & Selection
    const [commentDialogOpen, setCommentDialogOpen] = useState(false);
    const [commentTargetObject, setCommentTargetObject] = useState<AggregatedObject | null>(null);
    const [quickCommentText, setQuickCommentText] = useState("");
    const [logViewerObject, setLogViewerObject] = useState<{
        name: string; mockId: string; mockName: string; errorCount: number;
        migrador: string; dataMigr: string; hrExecMig: string; empresa: string;
        projectId: string; projectName?: string;
    } | null>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isStatReportOpen, setIsStatReportOpen] = useState(false);
    const [statInitialSelection, setStatInitialSelection] = useState<string[] | undefined>(undefined);
    const [isPrecedenceOpen, setIsPrecedenceOpen] = useState(false);
    const [precedenceObject, setPrecedenceObject] = useState<MasterObject | null>(null);
    const [precedenceMockId, setPrecedenceMockId] = useState<string | null>(null);
    const [precedenceSearchTerm, setPrecedenceSearchTerm] = useState("");

    const statTableRef = useRef<HTMLDivElement>(null);

    // 5. Filtragem e Performance
    const filtering = useDashboardFiltering({
        objects: activeQueries.objects ?? undefined,
        allMocks: activeQueries.allMocks ?? undefined,
        projects: activeQueries.projects ?? undefined,
        masterObjects: activeQueries.masterObjects ?? undefined,
        isAdmin: activeQueries.isAdmin,
        selectedProjectId: nav.selectedProjectId,
        selectedMockId: nav.selectedMockId,
        objectSearchTerm: filtersState.objectSearchTerm,
        performanceStatusFilter: filtersState.performanceStatusFilter,
        inProgressOnly: filtersState.inProgressOnly,
        chargePercentOp: filtersState.chargePercentOp,
        chargePercentValue: filtersState.chargePercentValue,
        dashboardGroupFilter: filtersState.dashboardGroupFilter
    });

    // 6. Mocks & Objects Actions
    const actions = useDashboardMockActions({
        db: activeQueries.db,
        isAdmin: activeQueries.isAdmin,
        user: activeQueries.user,
        userProfile: activeQueries.userProfile,
        allMocks: activeQueries.allMocks,
        effectiveMockId: filtering.effectiveMockId,
        selectedProjectId: nav.selectedProjectId,
        mocksByIdMap: filtering.mocksByIdMap
    });

    const edit = useDashboardQuickEdit({
        db: activeQueries.db,
        user: activeQueries.user,
        isAdmin: activeQueries.isAdmin,
        userProfile: activeQueries.userProfile,
        effectiveMockId: filtering.effectiveMockId,
        selectedProjectId: nav.selectedProjectId,
        mocksByIdMap: filtering.mocksByIdMap,
        migradorName: activeQueries.userProfile?.name ?? '',
        projects: activeQueries.projects,
        masterObjects: activeQueries.masterObjects,
        toast
    });

    const exportData = useDashboardExport({
        db: activeQueries.db,
        effectiveMockId: filtering.effectiveMockId,
        migradorName: activeQueries.userProfile?.name ?? '',
        projects: activeQueries.projects,
        mocksByIdMap: filtering.mocksByIdMap,
    });

    const dashboardScrollResetKey = `${nav.selectedProjectId}:${filtering.effectiveMockId ?? nav.selectedMockId}`;

    useEffect(() => {
        getDashboardScrollContainer()?.scrollTo({ top: 0, behavior: "auto" });
    }, [dashboardScrollResetKey]);

    const { selectCard, openCardDialog, isCardSelected } = useDashboardCardSelection({
        visibleObjects: filtering.filteredAggregatedPerformance,
        resetKey: dashboardScrollResetKey,
        anyDialogOpen:
            isReportOpen ||
            isStatReportOpen ||
            commentDialogOpen ||
            !!logViewerObject ||
            isPrecedenceOpen ||
            actions.isIndividualResetOpen ||
            actions.isCargaConfirmOpen ||
            actions.isRestartConfirmOpen ||
            edit.quickOpen ||
            edit.isForceLockOpen ||
            exportData.isEmailComposeOpen,
    });

    const statDialogContext = useMemo(() => {
        const mock = filtering.mocksByIdMap.get(filtering.effectiveMockId || "");
        const projectId =
            nav.selectedProjectId !== "all"
                ? nav.selectedProjectId
                : mock?.projectId ?? filtering.filteredAggregatedPerformance[0]?.projectId;
        const proj = activeQueries.projects?.find((p) => p.id === projectId);
        return {
            projectName: getProjectNameForContext(proj),
            empresa: getProjectCompanyName(proj),
        };
    }, [
        nav.selectedProjectId,
        filtering.effectiveMockId,
        filtering.mocksByIdMap,
        filtering.filteredAggregatedPerformance,
        activeQueries.projects,
    ]);

    // Mapeamento de comentários
    const commentsMapByObjectName = useMemo(() => {
        const map: Record<string, any[]> = {};
        activeQueries.allComments?.forEach((c) => {
            const keys = new Set<string>();
            if (c.objectName) keys.add(String(c.objectName).trim());
            if (c.objectId) keys.add(String(c.objectId).trim());
            keys.forEach((key) => {
                if (!key) return;
                if (!map[key]) map[key] = [];
                map[key].push(c);
            });
        });
        return map;
    }, [activeQueries.allComments]);

    const masterObjectsByName = useMemo(
        () => new Map((activeQueries.masterObjects || []).map((m) => [m.name, m])),
        [activeQueries.masterObjects]
    );

    const parallelByGroup = useMemo(() => {
        const map = new Map<number, any[]>();
        (activeQueries.masterObjects || []).forEach((o) => {
            const major = o?.parallelOrder ? parseInt(String(o.parallelOrder).split(".")[0], 10) : 0;
            if (!major) return;
            if (!map.has(major)) map.set(major, []);
            map.get(major)!.push(o);
        });
        return map;
    }, [activeQueries.masterObjects]);

    const precedenceCatalogObjects = useMemo(() => {
        const mockId =
            precedenceMockId ??
            (nav.selectedMockId !== "all" ? nav.selectedMockId : filtering.effectiveMockId);
        return mergeMigrationSequencesOntoMasters(
            activeQueries.masterObjects || [],
            activeQueries.objects ?? undefined,
            mockId,
        );
    }, [
        activeQueries.masterObjects,
        activeQueries.objects,
        precedenceMockId,
        nav.selectedMockId,
        filtering.effectiveMockId,
    ]);

    // Handlers Locais
    const handleSaveQuickComment = (textArg?: string) => {
        const text = (textArg ?? quickCommentText).trim();
        if (!text || !commentTargetObject || !activeQueries.db || !activeQueries.user) return;
        addDocumentNonBlocking(
            collection(
                activeQueries.db,
                "projects",
                commentTargetObject.projectId || "",
                "mocks",
                commentTargetObject.mockId || "",
                "migrationObjects",
                commentTargetObject.id,
                "comments"
            ),
            {
                text,
                authorId: activeQueries.user.uid,
                authorName: activeQueries.userProfile?.name || "Especialista",
                authorRole: activeQueries.userProfile?.role || "user",
                projectId: commentTargetObject.projectId,
                mockId: commentTargetObject.mockId,
                objectId: commentTargetObject.id,
                objectName: commentTargetObject.name,
                createdAt: serverTimestamp(),
            }
        );
        setQuickCommentText("");
    };

    const handleDeleteQuickComment = (comment: { id: string; __path?: string; authorId?: string; userId?: string }) => {
        const uid = activeQueries.user?.uid;
        if (!uid || !activeQueries.db || !commentTargetObject) return;
        const authorId = comment.authorId ?? comment.userId;
        if (!activeQueries.isAdmin && authorId !== uid) {
            toast({
                variant: "destructive",
                title: "Sem permissão",
                description: "Só é possível remover comentários próprios.",
            });
            return;
        }
        const path = comment.__path?.trim();
        if (path) {
            const segments = path.split("/").filter(Boolean);
            if (segments.length >= 2) {
                void deleteDocumentNonBlocking(doc(activeQueries.db, ...(segments as [string, ...string[]])));
                return;
            }
        }
        void deleteDocumentNonBlocking(
            doc(
                activeQueries.db,
                "projects",
                commentTargetObject.projectId || "",
                "mocks",
                commentTargetObject.mockId || "",
                "migrationObjects",
                commentTargetObject.id,
                "comments",
                comment.id
            )
        );
    };

    const handleUpdateQuickComment = (
        comment: { id: string; __path?: string; authorId?: string; userId?: string },
        textArg: string
    ) => {
        const text = textArg.trim();
        if (!text || !commentTargetObject || !activeQueries.db || !activeQueries.user) return;
        const uid = activeQueries.user.uid;
        const authorId = comment.authorId ?? comment.userId;
        if (!activeQueries.isAdmin && authorId !== uid) {
            toast({
                variant: "destructive",
                title: "Sem permissão",
                description: "Só é possível editar comentários próprios.",
            });
            return;
        }
        const path = comment.__path?.trim();
        if (path) {
            const segments = path.split("/").filter(Boolean);
            if (segments.length >= 2) {
                void updateDocumentNonBlocking(doc(activeQueries.db, ...(segments as [string, ...string[]])), {
                    text,
                    updatedAt: serverTimestamp(),
                });
                return;
            }
        }
        void updateDocumentNonBlocking(
            doc(
                activeQueries.db,
                "projects",
                commentTargetObject.projectId || "",
                "mocks",
                commentTargetObject.mockId || "",
                "migrationObjects",
                commentTargetObject.id,
                "comments",
                comment.id
            ),
            { text, updatedAt: serverTimestamp() }
        );
    };

    const isProjectLocked = useMemo(() => {
        if (nav.selectedProjectId === "all") return false;
        return activeQueries.projects?.find(p => p.id === nav.selectedProjectId)?.isLocked ?? false;
    }, [activeQueries.projects, nav.selectedProjectId]);

    const selectedProject = useMemo(
        () => activeQueries.projects?.find((p) => p.id === nav.selectedProjectId),
        [activeQueries.projects, nav.selectedProjectId]
    );
    const companyName = getProjectCompanyName(selectedProject);
    const headerEmpresa = companyName ?? selectedProject?.name;
    const headerProjectName = companyName ? selectedProject?.name : undefined;
    const headerMockName = useMemo(() => {
        const mockId =
            nav.selectedMockId !== "all" ? nav.selectedMockId : filtering.effectiveMockId;
        if (!mockId) return undefined;
        return (
            activeQueries.allMocks?.find((m) => m.id === mockId)?.name ??
            mockId
        );
    }, [nav.selectedMockId, filtering.effectiveMockId, activeQueries.allMocks]);

    // GATE: Seleção de Projeto
    if (nav.selectedProjectId === "all" || !nav.selectedProjectId) {
        return (
            <DashboardShell noPadding>
                <PageHeader title="DASHBOARD" subtitle="GERAL" />
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 space-y-6 text-center animate-in fade-in duration-500">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Layout className="w-10 h-10 text-slate-400" />
                    </div>
                    <div className="max-w-md space-y-2">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Seleção de Projeto Obrigatória</h2>
                        <p className="text-slate-500 text-sm">A visualização consolidada de todos os projetos está desabilitada para otimizar a performance. Por favor, selecione um projeto específico no menu superior.</p>
                    </div>
                    <button onClick={() => router.push('/projetos')} className="bg-SkyBlue-500 hover:bg-SkyBlue-600 text-white font-black uppercase tracking-widest px-8 h-10 shadow-lg shadow-SkyBlue-500/20 active:scale-95 transition-all">
                        Ver Projetos
                    </button>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell noPadding>
            <div className="flex flex-col relative w-full min-h-full">
                {/* 1. HEADER */}
                <PageHeader
                    variant="fiori"
                    title="Dashboard"
                    icon={<Layout className="w-5 h-5" />}
                    empresa={headerEmpresa}
                    projectName={headerProjectName}
                    mockName={headerMockName}
                    actions={
                        <DashboardSelectors
                            projects={activeQueries.projects || undefined}
                            allMocks={activeQueries.allMocks || undefined}
                            selectedProjectId={nav.selectedProjectId}
                            selectedMockId={nav.selectedMockId}
                            projectSelectorReadOnly
                            onProjectChange={nav.handleProjectChange}
                            onMockChange={nav.handleMockChange}
                            showIndicators={filtersState.showIndicators}
                            setShowIndicators={filtersState.setShowIndicators}
                            isComparisonVisible={filtersState.isComparisonVisible}
                            setIsComparisonVisible={filtersState.setIsComparisonVisible}
                        />
                    }
                />

                {/* 2. FILTROS & CONTROLE */}
                <DashboardFilters
                    {...filtersState}
                    activityGroups={activeQueries.activityGroups}
                    onOpenReport={() => setIsReportOpen(true)}
                    onOpenStatReport={() => {
                        setStatInitialSelection(undefined);
                        setIsStatReportOpen(true);
                    }}
                />

                {/* 3. CONTEÚDO */}
                <div className="space-y-6 py-4 px-4 md:px-8 pb-16 pt-2">
                    {activeQueries.isLoading && activeQueries.objects === null ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-10 h-10 animate-spin text-SkyBlue-500" />
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <DashboardCharts
                                aggregatedPerformance={filtering.filteredAggregatedPerformance}
                                allMocks={activeQueries.allMocks}
                                isResultsVisible={filtersState.showIndicators}
                                isComparisonVisible={filtersState.isComparisonVisible}
                                previousMockId={filtering.previousMockId}
                                effectiveMockId={filtering.effectiveMockId}
                                totals={filtering.totals}
                                objectStats={filtering.filteredObjectStats}
                            />

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                                {filtering.filteredAggregatedPerformance.length > 0 ? (
                                    filtering.filteredAggregatedPerformance.map((obj, index) => (
                                        (() => {
                                            const objectIsRunning =
                                                obj.status === "CARGA_EM_ANDAMENTO" ||
                                                !!obj.isInProgress ||
                                                !!(obj.chargeStartTime && !obj.chargeEndTime);
                                            const cardIsLocked = (obj.mockIsLocked || isProjectLocked) && !objectIsRunning;
                                            return (
                                        <DashboardCard
                                            key={getDashboardCardKey(obj)}
                                            cardKey={getDashboardCardKey(obj)}
                                            obj={obj}
                                            displayChargeOrder={formatSequence(index + 1, 0)}
                                            selectedMockId={filtering.effectiveMockId || nav.selectedMockId}
                                            isSelected={isCardSelected(obj)}
                                            onSelect={selectCard}
                                            isAdmin={activeQueries.isAdmin || false}
                                            isTogglingLoad={actions.isTogglingLoad}
                                            isMockLocked={cardIsLocked}
                                            handleToggleObjectLoad={(target) => {
                                                openCardDialog(target, () => actions.handleToggleObjectLoad(target));
                                            }}
                                            handleOpenQuickDialog={(target) => {
                                                openCardDialog(target, () => edit.handleOpenQuickDialog(target));
                                            }}
                                            handleOpenCommentDialog={() => {
                                                openCardDialog(obj, () => {
                                                    setCommentTargetObject(obj);
                                                    setQuickCommentText("");
                                                    setCommentDialogOpen(true);
                                                });
                                            }}
                                            handleOpenStatReport={(target) => {
                                                openCardDialog(target, () => {
                                                    setStatInitialSelection([target.name]);
                                                    setIsStatReportOpen(true);
                                                });
                                            }}
                                            handleFilterByObject={(target) => {
                                                selectCard(target);
                                                filtersState.setObjectSearchTerm(target.name);
                                            }}
                                            handleOpenReport={() => {
                                                openCardDialog(obj, () => setIsReportOpen(true));
                                            }}
                                            handleOpenPrecedence={() => {
                                                openCardDialog(obj, () => {
                                                    const master = activeQueries.masterObjects?.find(m => m.name === obj.name) ?? null;
                                                    setPrecedenceObject(master as any);
                                                    setPrecedenceMockId(obj.mockId ?? filtering.effectiveMockId ?? null);
                                                    setIsPrecedenceOpen(true);
                                                });
                                            }}
                                            handleOpenLogViewer={() => {
                                                openCardDialog(obj, () => {
                                                    const mockId = obj.mockId ?? filtering.effectiveMockId ?? "";
                                                    const mockName = filtering.mocksByIdMap.get(mockId)?.name ?? mockId;
                                                    const projectId =
                                                        obj.projectId ??
                                                        (nav.selectedProjectId !== "all" ? nav.selectedProjectId : "");
                                                    const project =
                                                        activeQueries.projects?.find(
                                                            (p) => p.id === projectId,
                                                        ) ?? selectedProject;
                                                    setLogViewerObject({
                                                        name: obj.name,
                                                        mockId,
                                                        mockName,
                                                        errorCount: Number(obj.errorRecordsCount) || 0,
                                                        ...buildLogExportMeta({
                                                            migradorName: activeQueries.userProfile?.migradorName ?? activeQueries.userProfile?.name,
                                                            chargeStartTime: obj.chargeStartTime,
                                                            empresa: exportData.getStatEmpresa(obj),
                                                        }),
                                                        projectId,
                                                        projectName:
                                                            getProjectNameForContext(project) ??
                                                            headerProjectName ??
                                                            undefined,
                                                    });
                                                });
                                            }}
                                            commentsMapByObjectName={commentsMapByObjectName}
                                            allObjects={activeQueries.masterObjects || []}
                                            objectsByName={masterObjectsByName}
                                            parallelByGroup={parallelByGroup}
                                        />
                                            );
                                        })()
                                    ))
                                ) : (
                                    <div className="col-span-full fiori-page-empty">
                                        <div className="fiori-page-empty__icon">
                                            <Target className="h-5 w-5" aria-hidden />
                                        </div>
                                        <div className="fiori-page-empty__body">
                                            <h3 className="fiori-page-empty__title">Sem objetos encontrados</h3>
                                            <p className="fiori-page-empty__desc">
                                                Nenhum registro corresponde aos filtros aplicados.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. MODAIS */}
                <DashboardModals
                    {...actions}
                    {...edit}
                    {...exportData}
                    migradorName={activeQueries.userProfile?.name ?? ''}
                    projectName={headerProjectName ?? statDialogContext.projectName}
                    empresa={statDialogContext.empresa}
                    filteredAggregatedPerformance={filtering.filteredAggregatedPerformance}
                    effectiveMockId={filtering.effectiveMockId || ""}
                    mocksByIdMap={filtering.mocksByIdMap}
                    isReportOpen={isReportOpen}
                    setIsReportOpen={setIsReportOpen}
                    isStatReportOpen={isStatReportOpen}
                    setIsStatReportOpen={setIsStatReportOpen}
                    statInitialSelection={statInitialSelection}
                    statExcelMode={exportData.statExcelMode}
                    setStatExcelMode={exportData.setStatExcelMode}
                    isFetchingErrors={exportData.isFetchingErrors}
                    onExportExcel={exportData.handleExportStatExcel}
                    onEmail={exportData.handleEmailStat}
                    commentDialogOpen={commentDialogOpen}
                    setCommentDialogOpen={setCommentDialogOpen}
                    commentTargetObject={commentTargetObject}
                    commentsMapByObjectName={commentsMapByObjectName}
                    quickCommentText={quickCommentText}
                    setQuickCommentText={setQuickCommentText}
                    handleSaveQuickComment={handleSaveQuickComment}
                    handleDeleteQuickComment={handleDeleteQuickComment}
                    handleUpdateQuickComment={handleUpdateQuickComment}
                    isAdmin={activeQueries.isAdmin}
                    currentUserId={activeQueries.user?.uid}
                    formatCommentDate={formatCommentDate}
                    logViewerObject={logViewerObject}
                    setLogViewerObject={setLogViewerObject}
                    isPrecedenceOpen={isPrecedenceOpen}
                    setIsPrecedenceOpen={setIsPrecedenceOpen}
                    precedenceObject={precedenceObject}
                    setPrecedenceObject={setPrecedenceObject}
                    precedenceCatalogObjects={precedenceCatalogObjects}
                    activityGroups={activeQueries.activityGroups}
                    precedenceSearchTerm={precedenceSearchTerm}
                    setPrecedenceSearchTerm={setPrecedenceSearchTerm}
                    statTableRef={statTableRef}
                    userProfile={activeQueries.userProfile}
                    user={activeQueries.user}
                    emailSuggestions={activeQueries.allUsers?.map(u => u.email).filter(Boolean) as string[] || []}
                    formatStatDate={formatStatDate}
                    formatStatTime={formatStatTime}
                    getStatEmpresa={exportData.getStatEmpresa}
                    formatStatDuration={formatStatDuration}
                    formatNumber={formatNumber}
                    unformatNumber={unformatNumber}
                />
            </div>
        </DashboardShell>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-SkyBlue-500" /></div>}>
            <DashboardContent />
        </Suspense>
    );
}
