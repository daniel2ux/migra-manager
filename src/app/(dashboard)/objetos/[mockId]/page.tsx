
"use client";

import { useState, useEffect, useMemo, Suspense, useRef, useDeferredValue } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSelection } from "@/context/selection-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Plus,
    Trash2,
    Loader2,
    Lock,
    Search,
    CheckCircle2,
    Zap,
    Terminal,
    Upload,
    RotateCcw,
    RefreshCcw,
    Download,
    GitCompare,
    BarChart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PAGE_TOOLBAR_BTN =
    "fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0";
import {
    useFirestore,
    useUser,
    useCollection,
    useMemoFirebase,
    useDoc,
} from "@/firebase";
import {
    collection,
    doc,
    query,
    collectionGroup,
    where,
} from "firebase/firestore";
import { LogImportDialog } from "@/components/logs/log-import-dialog";
import { LogViewerDialog } from "@/components/logs/log-viewer-dialog";
import { MigrationObjectFormDialog } from "./components/migration-object-form-dialog";
import { QuickEditDialog } from "@/components/migration/quick-edit-dialog";
import { CommentDialog } from "@/components/migration/comment-dialog";
import { ConfirmationDialogs } from "./components/confirmation-dialogs";
import { ObjectContextMenu } from "./components/object-context-menu";
import { ObjectCard } from "./components/object-card";
import { BulkSelectionBar } from "./components/bulk-selection-bar";
import { useObjectImport } from "./hooks/use-object-import";
import { CsvImportDialog } from "./components/csv-import-dialog";
import { ObjectsPerformanceTable } from "./components/objects-performance-table";
import { UserProfile, Mock } from "@/types/migration";
import { MasterObject, MigrationObject, MigrationComment } from "./types";
import { formatNumber } from "@/lib/migration/format-utils";
import { BarChart3 } from "lucide-react";

import { useObjectsFormActions } from "./hooks/use-objects-form-actions";
import { useObjectsResetActions } from "./hooks/use-objects-reset-actions";
import { useObjectsExportSync } from "./hooks/use-objects-export-sync";
import { useObjectsRowSelection } from "./hooks/use-objects-row-selection";
import { resolveMasterObject, isActiveCatalogMaster } from "@/lib/dashboard/object-filters";
import { buildLogExportMeta } from "@/lib/export/log-export-meta";
import { getProjectCompanyName } from "@/lib/migration/project-company";


function ObjetosContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { selectedMockId, selectedProjectId } = useSelection();

    const isMasked = params.mockId === "gestao";
    const projectId = isMasked ? selectedProjectId : searchParams.get("projectId");
    const routeMockId = isMasked ? selectedMockId : params.mockId as string;

    const _fileInputRef = useRef<HTMLInputElement>(null!);
    const _scrollContainerRef = useRef<HTMLDivElement>(null!);
    const router = useRouter();
    const { toast } = useToast();
    const db = useFirestore();
    const { user } = useUser();

    // ── Project lookup ─────────────────────────────────────────────────────────
    const projectDocRef = useMemoFirebase(
        () => (projectId && db ? doc(db, "projects", projectId) : null),
        [db, projectId]
    );
    const { data: projectData } = useDoc<any>(projectDocRef);
    const _projectName = projectData?.name || projectId || "—";

    // ── User profile ───────────────────────────────────────────────────────────
    const userDocRef = useMemoFirebase(() => (user && db ? doc(db, "users", user.uid) : null), [db, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
    const isAdmin = userProfile?.role === "admin" || userProfile?.role === "master";
    const isAdminOrMaster = isAdmin;

    // ── Master objects ─────────────────────────────────────────────────────────
    const masterObjectsQuery = useMemoFirebase(() => (db ? collection(db, "masterObjects") : null), [db]);
    const { data: masterObjects } = useCollection<MasterObject>(masterObjectsQuery);

    // ── Mock resolution (by ID or slug) ───────────────────────────────────────
    const directMockRef = useMemoFirebase(() => {
        if (!db || !projectId || !routeMockId) return null;
        return doc(db, "projects", projectId, "mocks", routeMockId);
    }, [db, projectId, routeMockId]);
    const { data: mockFromId, isLoading: isIdLoading } = useDoc<Mock>(directMockRef);

    const slugQuery = useMemoFirebase(() => {
        if (!db || !projectId || !routeMockId || isMasked || mockFromId) return null;
        return query(collection(db, "projects", projectId, "mocks"), where("slug", "==", routeMockId));
    }, [db, projectId, routeMockId, isMasked, mockFromId]);
    const { data: mocksFromSlug, isLoading: isSlugLoading } = useCollection<Mock>(slugQuery);

    const mockData = mockFromId || (mocksFromSlug && mocksFromSlug.length > 0 ? mocksFromSlug[0] : null);
    const mockId = mockData?.id || (isIdLoading || isSlugLoading ? null : routeMockId);
    const isMockLoading = isIdLoading || isSlugLoading;
    const isMockLocked = !!mockData?.isLocked || mockData?.status === 'BLOQUEADO';
    const isProjectLocked = !!projectData?.isLocked;
    const isEffectiveLocked = isMockLocked || isProjectLocked;

    const companyName = getProjectCompanyName(projectData);
    const headerEmpresa = companyName ?? projectData?.name;
    const headerProjectName = companyName ? projectData?.name : undefined;
    const headerMockName = mockData?.name;

    // ── Migration objects ──────────────────────────────────────────────────────
    const objectsQuery = useMemoFirebase(() => {
        if (!db || !projectId || !mockId || !userProfile) return null;
        return collection(db, "projects", projectId, "mocks", mockId, "migrationObjects");
    }, [db, projectId, mockId, userProfile]);
    const { data: objects, isLoading } = useCollection<MigrationObject>(objectsQuery);

    // ── Redirect if masked route has no mock ──────────────────────────────────
    useEffect(() => {
        if (isMasked && !mockId && !isMockLoading && !isLoading) {
            router.push('/mocks');
        }
    }, [isMasked, mockId, isMockLoading, isLoading, router]);

    // ── UI state (deve ficar antes de qualquer return: regras dos hooks) ────────
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; obj: MigrationObject } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [pendingSearchTerm, setPendingSearchTerm] = useState("");
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [performanceFilter, setPerformanceFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
    const [showPerformanceTable, setShowPerformanceTable] = useState(false);
    const [logImportSingleId, setLogImportSingleId] = useState<string | null>(null);
    const [logViewerObject, setLogViewerObject] = useState<{
        name: string;
        errorCount: number;
        migrador: string;
        dataMigr: string;
        hrExecMig: string;
        empresa: string;
    } | null>(null);

    const openLogViewer = (obj: MigrationObject) => {
        const meta = buildLogExportMeta({
            migradorName: userProfile?.migradorName ?? userProfile?.name,
            chargeStartTime: obj.chargeStartTime ?? null,
            empresa: projectData?.empresa || projectData?.name,
        });
        setLogViewerObject({
            name: obj.name,
            errorCount: Number(obj.errorRecordsCount) || 0,
            ...meta,
        });
    };
    const [isLogImportOpen, setIsLogImportOpen] = useState(false);

    // Close context menu on outside click/scroll
    useEffect(() => {
        if (!ctxMenu) return;
        const close = () => setCtxMenu(null);
        window.addEventListener("click", close);
        window.addEventListener("scroll", close, true);
        return () => {
            window.removeEventListener("click", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [ctxMenu]);

    // ── Comments ───────────────────────────────────────────────────────────────
    const allCommentsQuery = useMemoFirebase(() => {
        if (!db || !projectId || !mockId) return null;
        return query(collectionGroup(db, "comments"), where("projectId", "==", projectId), where("mockId", "==", mockId));
    }, [db, projectId, mockId]);
    const { data: allCommentsInMock } = useCollection<MigrationComment>(allCommentsQuery);

    const commentsMap = useMemo(() => {
        const map: Record<string, MigrationComment[]> = {};
        if (!allCommentsInMock) return map;
        allCommentsInMock.forEach(c => {
            const oid = c.objectId || c.__path?.split("/")[5];
            if (oid) {
                if (!map[oid]) map[oid] = [];
                map[oid].push(c);
            }
        });
        return map;
    }, [allCommentsInMock]);

    const masterObjectsById = useMemo(
        () => new Map(masterObjects?.map((m) => [m.id, m]) ?? []),
        [masterObjects],
    );
    const masterObjectsByName = useMemo(
        () => new Map(masterObjects?.map((m) => [m.name, m]) ?? []),
        [masterObjects],
    );
    const scopedMasterByName = useMemo(() => {
        const map = new Map<string, MasterObject>();
        (objects || []).forEach((o) => {
            const masterId = String(o.masterObjectId || "");
            if (!masterId) return;
            const master = masterObjectsById.get(masterId);
            if (!master) return;
            if (!map.has(o.name)) map.set(o.name, master);
        });
        return map;
    }, [objects, masterObjectsById]);
    const masterLookupMaps = useMemo(
        () => ({
            byId: masterObjectsById,
            byName: masterObjectsByName,
            scopedByName: scopedMasterByName,
        }),
        [masterObjectsById, masterObjectsByName, scopedMasterByName],
    );

    // ── Sorted + filtered objects ──────────────────────────────────────────────
    const sortedObjects = useMemo(() => {
        if (!objects || !masterObjects) return [];

        const enriched = objects
            .filter((obj) => isActiveCatalogMaster(resolveMasterObject(obj, masterLookupMaps)))
            .map((obj) => {
            const master = resolveMasterObject(obj, masterLookupMaps);
            return {
                ...obj,
                displayGroup: master?.chargeGroup || obj.chargeGroup || "G",
                // A sequência exibida/ordenada deve refletir a sequência da mock (objeto),
                // usando master apenas como fallback quando a mock não tiver valor.
                displayOrder: obj.chargeOrder ?? master?.chargeOrder ?? '',
                displayIsParallel: master?.isParallel ?? obj.isParallel ?? false,
                displayDependencies: master?.dependencyIds || obj.dependencyIds || [],
                displayMasterStatus: (master?.status || "ATIVO").toString().trim().toUpperCase(),
            };
        });

        return enriched
            .filter(o => {
                const matchesSearch =
                    (o.name || "").toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
                    (o.displayGroup && o.displayGroup.toLowerCase().includes(deferredSearchTerm.toLowerCase())) ||
                    (o.description || "").toLowerCase().includes(deferredSearchTerm.toLowerCase());
                if (!matchesSearch) return false;
                if (performanceFilter === 'all') return true;
                const processed = Number(o.processedRecordsCount) || 0;
                const error = Number(o.errorRecordsCount) || 0;
                const success = Math.max(0, processed - error);
                const pct = processed > 0 ? (success / processed) * 100 : 0;
                if (performanceFilter === 'green') return pct === 100;
                if (performanceFilter === 'yellow') return pct >= 50 && pct < 100;
                if (performanceFilter === 'red') return pct < 50;
                return true;
            })
            .sort((a, b) => {
                const aInProgress = a.status === 'CARGA_EM_ANDAMENTO' || !!(a.chargeStartTime && !a.chargeEndTime);
                const bInProgress = b.status === 'CARGA_EM_ANDAMENTO' || !!(b.chargeStartTime && !b.chargeEndTime);
                if (aInProgress && !bInProgress) return -1;
                if (!aInProgress && bInProgress) return 1;
                if (aInProgress && bInProgress) {
                    const aUpdate = a.updatedAt?.seconds || 0;
                    const bUpdate = b.updatedAt?.seconds || 0;
                    if (aUpdate !== bUpdate) return bUpdate - aUpdate;
                    return (a.name || "").localeCompare(b.name || "");
                }
                const parseSeqLocal = (v: string | number | null | undefined) => {
                    const s = String(v ?? '').trim();
                    if (s.includes('.')) { const [maj, min] = s.split('.'); return { major: parseInt(maj) || 0, minor: parseInt(min) || 0 }; }
                    return { major: parseInt(s) || 0, minor: 0 };
                };
                const aSeq = parseSeqLocal(a.displayOrder);
                const bSeq = parseSeqLocal(b.displayOrder);
                const aHasSeq = aSeq.major > 0;
                const bHasSeq = bSeq.major > 0;
                if (aHasSeq && !bHasSeq) return -1;
                if (!aHasSeq && bHasSeq) return 1;
                if (aHasSeq && bHasSeq) {
                    if (aSeq.major !== bSeq.major) return aSeq.major - bSeq.major;
                    if (aSeq.minor !== bSeq.minor) return aSeq.minor - bSeq.minor;
                    return (a.name || "").localeCompare(b.name || "");
                }
                return (a.name || "").localeCompare(b.name || "");
            });
    }, [objects, masterObjects, masterLookupMaps, deferredSearchTerm, performanceFilter]);

    // ── Import hook ────────────────────────────────────────────────────────────
    const {
        isImporting,
        importLogOpen, setImportLogOpen,
        importProgress,
        importFinished,
        importCounts,
        importLogs,
        isDragging,
        importFileInputRef,
        navImportFileRef,
        terminalEndRef,
        handleImportFile,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        resetImportState,
    } = useObjectImport({
        projectId: projectId ?? "",
        mockId: mockId ?? "",
        objects: objects ?? undefined,
        masterObjects: masterObjects ?? undefined,
        userProfile: userProfile ?? undefined
    });

    // ── Sub-hooks ──────────────────────────────────────────────────────────────

    const {
        selectedObjectIds, setSelectedObjectIds,
        handleToggleObjectSelection,
        _handleToggleSelectRow,
        _handleToggleSelectAllRows,
    } = useObjectsRowSelection({ sortedObjects });

    const {
        open, setOpen,
        editingObject,
        formData, setFormData,
        prevDurationInput,
        selectedMasterIds,
        searchMasterTerm, setSearchMasterTerm,
        filteredMasterObjects,
        quickOpen, setQuickOpen,
        quickEditObject,
        quickFormData, setQuickFormData,
        commentDialogOpen, setCommentDialogOpen,
        commentTargetObject,
        handleOpenDialog, handleSave,
        handleSelectAll, handleToggleMasterSelection,
        handleDurationInputChange,
        handleOpenQuickDialog, handleSaveQuick,
        handleOpenCommentDialog, handleSaveQuickComment, handleDeleteQuickComment,
    } = useObjectsFormActions({
        db, user, projectId, mockId,
        isAdmin: !!isAdmin, isEffectiveLocked: !!isEffectiveLocked,
        objects, masterObjects, userProfile, toast,
    });

    const {
        isGlobalResetOpen, setIsGlobalResetOpen,
        isResetProgressOpen,
        resetProgress, resetCount,
        objectToReset, setObjectToReset,
        isIndividualResetOpen, setIsIndividualResetOpen,
        isBulkDeleteOpen, setIsBulkDeleteOpen,
        isBulkResetOpen, setIsBulkResetOpen,
        handleToggleObjectCargaStatus,
        handleBulkDelete, handleBulkReset,
        handleGlobalReset, handleIndividualReset,
    } = useObjectsResetActions({
        db, projectId, mockId,
        isAdmin: !!isAdmin, isEffectiveLocked: !!isEffectiveLocked, isMockLocked: !!isMockLocked,
        objects, selectedObjectIds, setSelectedObjectIds, toast,
    });

    const { isSyncing, handleExportCSV, handleSyncPreviousReferences } = useObjectsExportSync({
        db, projectId, mockId,
        isAdmin: !!isAdmin, isEffectiveLocked: !!isEffectiveLocked,
        objects, sortedObjects, mockData, toast,
    });

    // ── URL ?add=true → open dialog ────────────────────────────────────────────
    useEffect(() => {
        if (searchParams.get('add') === 'true' && !isLoading && !isMockLoading && !isProfileLoading) {
            handleOpenDialog();
            const url = new URL(window.location.href);
            url.searchParams.delete('add');
            router.replace(url.pathname + url.search);
        }
    }, [searchParams, isLoading, isMockLoading, isProfileLoading, router, handleOpenDialog]);
    
    const totals = useMemo(() => {
        if (!sortedObjects) return { target: 0, processed: 0, success: 0, error: 0 };
        return sortedObjects.reduce((acc, obj) => {
            const t = Number(obj.targetRecordsCount) || 0;
            const p = Number(obj.processedRecordsCount) || 0;
            const e = Number(obj.errorRecordsCount) || 0;
            const s = Math.max(0, p - e);
            return {
                target: acc.target + t,
                processed: acc.processed + p,
                success: acc.success + s,
                error: acc.error + e,
            };
        }, { target: 0, processed: 0, success: 0, error: 0 });
    }, [sortedObjects]);

    if (isMasked && !mockId) {
        return (
            <DashboardShell>
                <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            </DashboardShell>
        );
    }

    // ── Render helper ──────────────────────────────────────────────────────────
    const renderDuration = (ms: number, allowZero: boolean = false, hasDates: boolean = true) => {
        const sanitizedMs = (ms <= 0 && (allowZero || !hasDates)) ? 0 : Math.max(60000, ms);
        const totalMinutes = Math.floor(sanitizedMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return (
            <span className="inline-flex items-center justify-center gap-0.5 font-mono font-bold">
                <span>{hours.toString().padStart(2, "0")}</span>
                <span className="text-[0.6em] opacity-60 uppercase">H</span>
                <span className="mx-0.5"></span>
                <span>{minutes.toString().padStart(2, "0")}</span>
                <span className="text-[0.6em] opacity-60 uppercase">M</span>
            </span>
        );
    };

    const _calculatePerformanceChange = (current: number, previous: number) => {
        if (!current || !previous) return null;
        const diff = previous - current;
        const percentage = (diff / previous) * 100;
        return { isBetter: diff > 0, percentage: Math.abs(percentage).toFixed(1).replace(".", ",") };
    };

    return (
        <DashboardShell noPadding>
            <div
                className={cn(
                    "relative flex w-full flex-col bg-slate-50/30",
                    showPerformanceTable
                        ? "h-[calc(100dvh-4rem)] min-h-0 overflow-hidden"
                        : "min-h-screen",
                )}
            >
                <PageHeader
                    variant="fiori"
                    title="Objetos"
                    backHref="/mocks"
                    empresa={headerEmpresa}
                    projectName={headerProjectName}
                    mockName={headerMockName}
                    badge={
                        <span
                            className={cn(
                                "fiori-page-status fiori-page-status--icon-only",
                                isEffectiveLocked
                                    ? "fiori-page-status--warning"
                                    : mockData?.status === "CARGA_CONCLUIDA"
                                        ? "fiori-page-status--success"
                                        : mockData?.status === "CARGA_EM_ANDAMENTO" || mockData?.isRunning
                                            ? "fiori-page-status--active"
                                            : "fiori-page-status--neutral"
                            )}
                            aria-label={
                                isEffectiveLocked
                                    ? "Bloqueada"
                                    : mockData?.status === "CARGA_CONCLUIDA"
                                        ? "Concluída"
                                        : mockData?.status === "CARGA_EM_ANDAMENTO" || mockData?.isRunning
                                            ? "Em andamento"
                                            : "Ativa"
                            }
                            title={
                                isEffectiveLocked
                                    ? "Bloqueada"
                                    : mockData?.status === "CARGA_CONCLUIDA"
                                        ? "Concluída"
                                        : mockData?.status === "CARGA_EM_ANDAMENTO" || mockData?.isRunning
                                            ? "Em andamento"
                                            : "Ativa"
                            }
                        >
                            {isEffectiveLocked ? (
                                <Lock className="w-3 h-3" aria-hidden />
                            ) : mockData?.status === "CARGA_CONCLUIDA" ? (
                                <CheckCircle2 className="w-3 h-3" aria-hidden />
                            ) : mockData?.status === "CARGA_EM_ANDAMENTO" || mockData?.isRunning ? (
                                <Zap className="w-3 h-3 fill-current animate-pulse" aria-hidden />
                            ) : (
                                <CheckCircle2 className="w-3 h-3" aria-hidden />
                            )}
                        </span>
                    }
                    actions={
                        <TooltipProvider delayDuration={0}>
                            <div className="fiori-toolbar">
                                {isAdmin && !isEffectiveLocked && selectedObjectIds.length > 0 && (
                                    <>
                                        <div className="fiori-toolbar-selection">
                                            <span className="fiori-toolbar-selection-count">
                                                {selectedObjectIds.length} selecionado{selectedObjectIds.length !== 1 ? "s" : ""}
                                            </span>
                                            <div className="fiori-toolbar-divider" />
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setIsBulkResetOpen(true)}
                                                        className={PAGE_TOOLBAR_BTN}
                                                    >
                                                        <RefreshCcw className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" variant="fiori">
                                                    Inicializar seleção
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setIsBulkDeleteOpen(true)}
                                                        className={cn(PAGE_TOOLBAR_BTN, "fiori-toolbar-btn-danger")}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" variant="fiori">
                                                    Excluir seleção
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div className="fiori-toolbar-divider" />
                                    </>
                                )}

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                PAGE_TOOLBAR_BTN,
                                                (pendingSearchTerm || performanceFilter !== "all") && "fiori-toolbar-btn-active"
                                            )}
                                        >
                                            <Search className="w-4 h-4" />
                                            {(pendingSearchTerm || performanceFilter !== "all") && (
                                                <span className="fiori-toolbar-dot" />
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="fiori-filter-popover z-[100]" align="end">
                                        <div className="fiori-filter-popover-title">
                                            <Search className="w-3.5 h-3.5" />
                                            Buscar objetos
                                        </div>
                                        <Input
                                            placeholder="Nome, grupo ou descrição..."
                                            className="fiori-input shadow-none"
                                            value={pendingSearchTerm}
                                            onChange={(e) => setPendingSearchTerm(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    setSearchTerm(pendingSearchTerm);
                                                }
                                            }}
                                        />
                                        {pendingSearchTerm && (
                                            <button
                                                type="button"
                                                className="fiori-filter-popover-clear mt-2"
                                                onClick={() => {
                                                    setPendingSearchTerm("");
                                                    setSearchTerm("");
                                                }}
                                            >
                                                Limpar busca
                                            </button>
                                        )}
                                        <div className="fiori-filter-popover-section">
                                            <div className="fiori-filter-popover-section-title">
                                                <BarChart className="w-3.5 h-3.5" />
                                                Qualidade da carga
                                            </div>
                                            <div className="fiori-filter-chip-grid">
                                                {([
                                                    ["all", "Todos", ""],
                                                    ["green", "Sucesso", "fiori-chip--success"],
                                                    ["yellow", "Atenção", "fiori-chip--warning"],
                                                    ["red", "Crítico", "fiori-chip--critical"],
                                                ] as const).map(([value, label, chipClass]) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        className={cn(
                                                            "fiori-chip",
                                                            chipClass,
                                                            performanceFilter === value && "fiori-chip-selected"
                                                        )}
                                                        onClick={() => setPerformanceFilter(value)}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            {performanceFilter !== "all" && (
                                                <button
                                                    type="button"
                                                    className="fiori-filter-popover-clear mt-2"
                                                    onClick={() => setPerformanceFilter("all")}
                                                >
                                                    Limpar filtro
                                                </button>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {isAdmin && !isEffectiveLocked && !isMockLoading && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleSyncPreviousReferences}
                                                disabled={isSyncing}
                                                className={cn(
                                                    PAGE_TOOLBAR_BTN,
                                                    isSyncing && "fiori-toolbar-btn-active"
                                                )}
                                            >
                                                {isSyncing ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <GitCompare className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" variant="fiori">
                                            Sincronizar referências (mock anterior)
                                        </TooltipContent>
                                    </Tooltip>
                                )}

                                <div className="fiori-toolbar-divider" />

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowPerformanceTable(!showPerformanceTable)}
                                            className={cn(
                                                PAGE_TOOLBAR_BTN,
                                                showPerformanceTable && "fiori-toolbar-btn-active"
                                            )}
                                        >
                                            {showPerformanceTable ? (
                                                <BarChart className="w-4 h-4" />
                                            ) : (
                                                <Zap className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" variant="fiori">
                                        {showPerformanceTable ? "Ver em grid" : "Visão de performance"}
                                    </TooltipContent>
                                </Tooltip>

                                {isAdminOrMaster && !isEffectiveLocked && !isMockLoading && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setIsLogImportOpen(true)}
                                                className={PAGE_TOOLBAR_BTN}
                                            >
                                                <Terminal className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" variant="fiori">
                                            Importar logs
                                            {selectedObjectIds.length > 0
                                                ? ` (${selectedObjectIds.length} sel.)`
                                                : " (todos)"}
                                        </TooltipContent>
                                    </Tooltip>
                                )}

                                {isAdmin && !isEffectiveLocked && !isMockLoading && (
                                    <>
                                        <input
                                            type="file"
                                            ref={navImportFileRef}
                                            className="hidden"
                                            accept=".csv,.txt"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    handleImportFile(file);
                                                }
                                                if (navImportFileRef.current) {
                                                    navImportFileRef.current.value = "";
                                                }
                                            }}
                                        />
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setIsGlobalResetOpen(true)}
                                                    className={cn(PAGE_TOOLBAR_BTN, "fiori-toolbar-btn-danger")}
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" variant="fiori">
                                                Reset total do mock
                                            </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setImportLogOpen(true)}
                                                    disabled={isImporting}
                                                    className={PAGE_TOOLBAR_BTN}
                                                >
                                                    {isImporting ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Upload className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" variant="fiori">
                                                Importar CSV (ver layout)
                                            </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleExportCSV()}
                                                    className={PAGE_TOOLBAR_BTN}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" variant="fiori">
                                                Exportar CSV
                                            </TooltipContent>
                                        </Tooltip>
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
                                                Adicionar objetos
                                            </TooltipContent>
                                        </Tooltip>
                                    </>
                                )}
                            </div>
                        </TooltipProvider>
                    }
                />

                <div className={cn("flex-1 flex flex-col min-h-0", showPerformanceTable && "overflow-hidden")}>
                    <MigrationObjectFormDialog
                        open={open}
                        onOpenChange={setOpen}
                        editingObject={editingObject}
                        formData={formData}
                        onFormChange={setFormData}
                        filteredMasterObjects={filteredMasterObjects}
                        selectedMasterIds={selectedMasterIds}
                        onSelectAll={handleSelectAll}
                        onToggleMaster={handleToggleMasterSelection}
                        searchMasterTerm={searchMasterTerm}
                        onSearchMasterChange={setSearchMasterTerm}
                        prevDurationInput={prevDurationInput}
                        onDurationInputChange={handleDurationInputChange}
                        onSave={handleSave}
                        isAdmin={!!isAdmin}
                        isMockLocked={!!isEffectiveLocked}
                        empresa={headerEmpresa}
                        projectName={headerProjectName}
                        mockName={headerMockName}
                    />

                    <QuickEditDialog
                        mode="mock"
                        open={quickOpen}
                        onOpenChange={setQuickOpen}
                        quickEditObject={quickEditObject}
                        quickFormData={quickFormData}
                        onFormChange={setQuickFormData}
                        onSave={handleSaveQuick}
                        empresa={headerEmpresa}
                        projectName={headerProjectName}
                        mockName={headerMockName}
                    />
                    <CommentDialog
                        open={commentDialogOpen}
                        onOpenChange={setCommentDialogOpen}
                        commentTargetObject={commentTargetObject}
                        commentsMap={commentsMap}
                        onSave={handleSaveQuickComment}
                        onDeleteComment={handleDeleteQuickComment}
                        footerMode="cancel-save"
                        submitShortcut="enter"
                        isAdmin={!!isAdmin}
                        currentUserId={user?.uid}
                    />

                    {isLoading || isMockLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
                    ) : (
                        <TooltipProvider>
                            <div
                                className={cn(
                                    "relative",
                                    showPerformanceTable && "flex flex-1 flex-col min-h-0 overflow-hidden"
                                )}
                            >
                                {(!sortedObjects || sortedObjects.length === 0) ? (
                                    <div className="text-center py-12 text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-40">
                                        Nenhum objeto adicionado.
                                    </div>
                                ) : showPerformanceTable ? (
                                    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                                        <ObjectsPerformanceTable
                                            className="h-full w-full min-h-0 flex-1"
                                            objects={sortedObjects as any}
                                            renderDuration={renderDuration}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="fiori-mock-summary-sticky-slot" aria-hidden="true" />
                                        <div className="fiori-mock-summary fiori-mock-summary--sticky">
                                            <div className="fiori-mock-summary-head">
                                                <div className="fiori-mock-summary-icon">
                                                    <BarChart3 className="w-4 h-4" />
                                                </div>
                                                <div className="fiori-mock-summary-titles">
                                                    <span className="fiori-mock-summary-title">Resumo do mock</span>
                                                    <span className="fiori-mock-summary-subtitle">Visão consolidada</span>
                                                </div>
                                            </div>

                                            <div className="fiori-mock-summary-metrics">
                                                <div className="fiori-mock-summary-metric">
                                                    <span className="fiori-mock-summary-metric-label">Amostragem</span>
                                                    <span className="fiori-mock-summary-metric-value">
                                                        {sortedObjects.length} objeto{sortedObjects.length !== 1 ? "s" : ""}
                                                    </span>
                                                </div>

                                                <div className="fiori-mock-summary-divider" />

                                                <div className="fiori-mock-summary-metric">
                                                    <span className="fiori-mock-summary-metric-label">Carga total</span>
                                                    <span className="fiori-mock-summary-metric-value">{formatNumber(totals.target)}</span>
                                                </div>

                                                <div className="fiori-mock-summary-divider" />

                                                <div className="fiori-mock-summary-metric">
                                                    <span className="fiori-mock-summary-metric-label fiori-mock-summary-metric-label--success">Sucesso</span>
                                                    <span className="fiori-mock-summary-metric-value fiori-mock-summary-metric-value--success">{formatNumber(totals.success)}</span>
                                                </div>

                                                <div className="fiori-mock-summary-divider" />

                                                <div className="fiori-mock-summary-metric">
                                                    <span className="fiori-mock-summary-metric-label fiori-mock-summary-metric-label--error">Erros</span>
                                                    <span className="fiori-mock-summary-metric-value fiori-mock-summary-metric-value--error">{formatNumber(totals.error)}</span>
                                                </div>

                                                <div className="fiori-mock-summary-divider" />

                                                <span className="fiori-mock-summary-sync">Sincronizado</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 px-4 md:px-8 py-4">
                                            {(sortedObjects || []).map((obj, idx) => (
                                                <ObjectCard
                                                    key={obj.id}
                                                    obj={obj}
                                                    idx={idx}
                                                    isSelected={selectedObjectIds.includes(obj.id)}
                                                    isAdmin={isAdmin}
                                                    isAdminOrMaster={isAdminOrMaster}
                                                    isMockLocked={isEffectiveLocked}
                                                    isMockInProgress={mockData?.status === 'CARGA_EM_ANDAMENTO' || mockData?.isRunning}
                                                    isMockCompleted={mockData?.status === 'CARGA_CONCLUIDA'}
                                                    masterObjects={masterObjects ?? []}
                                                    objComments={commentsMap[obj.id] ?? []}
                                                    onSelect={handleToggleObjectSelection}
                                                    onContextMenu={(e: React.MouseEvent, o: MigrationObject) => setCtxMenu({ x: e.clientX, y: e.clientY, obj: o })}
                                                    onOpenDialog={handleOpenDialog}
                                                    onOpenCommentDialog={handleOpenCommentDialog}
                                                    onOpenQuickDialog={handleOpenQuickDialog}
                                                    onToggleCargaStatus={handleToggleObjectCargaStatus}
                                                    onImportLogs={(id: string) => setLogImportSingleId(id)}
                                                    onViewLogs={openLogViewer}
                                                    onResetObject={(obj: MigrationObject) => {
                                                        setObjectToReset(obj);
                                                        setIsIndividualResetOpen(true);
                                                    }}
                                                    renderDuration={renderDuration}
                                                />
                                            ))}
                                        </div>

                                    </>
                                )}
                                {selectedObjectIds.length > 0 && (
                                    <BulkSelectionBar
                                        count={selectedObjectIds.length}
                                        onReset={() => setIsBulkResetOpen(true)}
                                        onDelete={() => setIsBulkDeleteOpen(true)}
                                        onCancel={() => setSelectedObjectIds([])}
                                    />
                                )}
                            </div>
                        </TooltipProvider>
                    )}

                    <ConfirmationDialogs
                        isGlobalResetOpen={isGlobalResetOpen}
                        onGlobalResetChange={setIsGlobalResetOpen}
                        onGlobalReset={handleGlobalReset}
                        isResetProgressOpen={isResetProgressOpen}
                        resetProgress={resetProgress}
                        resetCount={resetCount}
                        isIndividualResetOpen={isIndividualResetOpen}
                        onIndividualResetChange={setIsIndividualResetOpen}
                        objectToReset={objectToReset}
                        onClearObjectToReset={() => setObjectToReset(null)}
                        onIndividualReset={handleIndividualReset}
                        isBulkDeleteOpen={isBulkDeleteOpen}
                        onBulkDeleteChange={setIsBulkDeleteOpen}
                        selectedCount={selectedObjectIds.length}
                        onBulkDelete={handleBulkDelete}
                        isBulkResetOpen={isBulkResetOpen}
                        onBulkResetChange={setIsBulkResetOpen}
                        onBulkReset={handleBulkReset}
                    />
                    <CsvImportDialog
                        open={importLogOpen}
                        isImporting={isImporting}
                        importFinished={importFinished}
                        importProgress={importProgress}
                        importCounts={importCounts}
                        importLogs={importLogs}
                        isDragging={isDragging}
                        importFileInputRef={importFileInputRef as any}
                        terminalEndRef={terminalEndRef as any}
                        onOpenChange={setImportLogOpen}
                        onReset={resetImportState}
                        onImportFile={handleImportFile}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    />

                    {/* Log Import Dialog - global (header) */}
                    {isLogImportOpen && (
                        <LogImportDialog
                            open={isLogImportOpen}
                            onClose={() => setIsLogImportOpen(false)}
                            mockId={mockId || ""}
                            projectId={projectId ?? ""}
                            allObjects={(objects ?? []).filter(o => o && o.name).map(o => ({ id: o.id, name: o.name }))}
                            selectedObjectIds={selectedObjectIds}
                        />
                    )}

                    {/* Log Import Dialog - por objeto */}
                    {logImportSingleId && (
                        <LogImportDialog
                            open={!!logImportSingleId}
                            onClose={() => setLogImportSingleId(null)}
                            mockId={mockId || ""}
                            projectId={projectId ?? ""}
                            allObjects={(objects ?? []).filter(o => o && o.name).map(o => ({ id: o.id, name: o.name }))}
                            selectedObjectIds={[logImportSingleId]}
                        />
                    )}

                    {/* Log Viewer Dialog */}
                    {logViewerObject && (
                        <LogViewerDialog
                            open={!!logViewerObject}
                            onClose={() => setLogViewerObject(null)}
                            mockId={mockId || ""}
                            mockName={mockData?.name}
                            projectId={projectId || ""}
                            objectName={logViewerObject.name}
                            migrador={logViewerObject.migrador}
                            dataMigr={logViewerObject.dataMigr}
                            hrExecMig={logViewerObject.hrExecMig}
                            empresa={logViewerObject.empresa}
                            projectName={headerProjectName ?? projectData?.name}
                        />
                    )}

                </div>
            </div >

            <ObjectContextMenu
                ctxMenu={ctxMenu}
                onClose={() => setCtxMenu(null)}
                isAdmin={isAdmin}
                isAdminOrMaster={isAdminOrMaster}
                isMockLocked={!!isEffectiveLocked}
                isMockInProgress={mockData?.status === 'CARGA_EM_ANDAMENTO' || mockData?.isRunning}
                isMockCompleted={mockData?.status === 'CARGA_CONCLUIDA'}
                onOpenDialog={handleOpenDialog}
                onOpenCommentDialog={handleOpenCommentDialog}
                onToggleCargaStatus={handleToggleObjectCargaStatus}
                onOpenQuickDialog={handleOpenQuickDialog}
                onImportLogs={(id) => setLogImportSingleId(id)}
                onViewLogs={openLogViewer}
                onResetObject={(obj) => {
                    setObjectToReset(obj);
                    setIsIndividualResetOpen(true);
                }}
            />
        </DashboardShell >
    );
}

export default function ObjetosPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-SkyBlue-500" /></div>}>
            <ObjetosContent />
        </Suspense>
    );
}
