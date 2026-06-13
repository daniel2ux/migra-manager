"use client";

import { ReportDialog } from "./report-dialog";
import { StatReportDialog } from "./stat-report-dialog";
import { ForceLockDialog } from "@/components/migration/force-lock-dialog";
import { QuickEditDialog } from "@/components/migration/quick-edit-dialog";
import { CommentDialog } from "@/components/migration/comment-dialog";
import { FinalizeCargaDialog } from "@/components/dashboard/finalize-carga-dialog";
import { RestartCargaDialog } from "@/components/dashboard/restart-carga-dialog";
import { ResetObjectDialog } from "@/components/dashboard/reset-object-dialog";
import { LogViewerDialog } from "@/components/logs/log-viewer-dialog";
import { EmailComposeDialog } from "@/components/email/email-compose-dialog";
import { PrecedenceDialog } from "@/app/(dashboard)/objetos/components/lazy-dialogs";
import type { User } from "@/supabase/auth-shim";
import type { Mock, AggregatedObject, UserProfile } from "@/types/migration";
import type { MasterObject } from "@/types/master-object";
import type { ActivityGroup } from "@/types/activity-group";
import type { StatEmailRow, ErrorEmailRow } from "@/components/email/email-compose-dialog";

// Note: This component is a pure UI wrapper for the many modals in the dashboard.
// Props are passed down from the main page/hooks.

interface DashboardModalsProps {
    // Report
    isReportOpen: boolean;
    setIsReportOpen: (v: boolean) => void;
    filteredAggregatedPerformance: AggregatedObject[];
    effectiveMockId: string | undefined;
    mocksByIdMap: Map<string, Mock>;

    // Stat Report
    isStatReportOpen: boolean;
    setIsStatReportOpen: (v: boolean) => void;
    statInitialSelection?: string[];
    statTableRef: React.RefObject<HTMLDivElement | null>;
    migradorName: string;
    projectName?: string;
    empresa?: string | null;
    excelExportProgress: { current: number; total: number } | null;
    statExcelMode: "single" | "per-object";
    setStatExcelMode: (v: "single" | "per-object") => void;
    isFetchingErrors: boolean;
    onExportExcel: (rows: AggregatedObject[]) => void;
    onEmail: (rows: AggregatedObject[]) => void;
    formatStatDate: (ts: any) => string;
    formatStatTime: (ts: any) => string;
    getStatEmpresa: (obj: AggregatedObject) => string;
    formatStatDuration: (ms: number | undefined) => string;

    // Quick Edit
    quickOpen: boolean;
    setQuickOpen: (v: boolean) => void;
    quickEditObject: AggregatedObject | null;
    handleSaveQuick?: (data: {
        targetRecordsCount: number;
        processedRecordsCount: number;
        errorRecordsCount: number;
        chargeStartTime: string;
        chargeEndTime: string;
    }) => Promise<void> | void;
    formatNumber: (val: string | number, abbreviate?: boolean) => string;
    unformatNumber: (s: string) => number;
    isQuickReadOnly: boolean;
    releaseQuickLock: (path: string) => void;

    // Comments
    commentDialogOpen: boolean;
    setCommentDialogOpen: (v: boolean) => void;
    commentTargetObject: AggregatedObject | null;
    commentsMapByObjectName: Record<string, any[]>;
    quickCommentText: string;
    setQuickCommentText: (v: string) => void;
    handleSaveQuickComment: (text?: string) => void | Promise<void>;
    handleDeleteQuickComment: (comment: { id: string; __path?: string; authorId?: string; userId?: string }) => void;
    handleUpdateQuickComment: (
        comment: { id: string; __path?: string; authorId?: string; userId?: string },
        text: string
    ) => void;
    isAdmin: boolean;
    currentUserId: string | undefined;
    formatCommentDate: (d: any) => string;

    // Mock Actions
    isCargaConfirmOpen: boolean;
    setIsCargaConfirmOpen: (v: boolean) => void;
    loadStatusToConfirm: Mock | null;
    confirmFinalizeCarga: () => void;

    isRestartConfirmOpen: boolean;
    setIsRestartConfirmOpen: (v: boolean) => void;
    mockToRestart: Mock | null;
    handleConfirmRestart: () => void;

    isIndividualResetOpen: boolean;
    setIsIndividualResetOpen: (v: boolean) => void;
    objectToReset: AggregatedObject | null;
    setObjectToReset: (v: AggregatedObject | null) => void;
    handleIndividualReset: () => void;

    // Log Viewer / Lock
    logViewerObject: {
        name: string; mockId: string; mockName: string; errorCount: number;
        migrador: string; dataMigr: string; hrExecMig: string; empresa: string;
        projectId: string; projectName?: string;
    } | null;
    setLogViewerObject: (v: any) => void;
    isForceLockOpen: boolean;
    setIsForceLockOpen: (v: boolean) => void;
    forceLockTarget: AggregatedObject | null;
    forceLockBlockerName: string | null;
    handleForceAcquireQuick: () => void;
    handleViewOnlyQuick: () => void;

    // Email
    isEmailComposeOpen: boolean;
    setIsEmailComposeOpen: (v: boolean) => void;
    statEmailRows: StatEmailRow[];
    statMockName: string;
    userProfile: UserProfile | null;
    user: User | null;
    emailSuggestions: string[];
    statErrorRows: ErrorEmailRow[];

    // Precedence
    isPrecedenceOpen: boolean;
    setIsPrecedenceOpen: (v: boolean) => void;
    precedenceObject: MasterObject | null;
    setPrecedenceObject: (v: MasterObject | null) => void;
    precedenceCatalogObjects: MasterObject[];
    activityGroups: ActivityGroup[];
    precedenceSearchTerm: string;
    setPrecedenceSearchTerm: (v: string) => void;
    precedenceSearchRef: React.RefObject<HTMLInputElement | null>;
    precedenceSearchTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export function DashboardModals(props: DashboardModalsProps) {
    return (
        <>
            <ReportDialog
                open={props.isReportOpen}
                onOpenChange={props.setIsReportOpen}
                filteredAggregatedPerformance={props.filteredAggregatedPerformance}
                effectiveMockId={props.effectiveMockId}
                mocksByIdMap={props.mocksByIdMap}
                projectName={props.projectName}
                empresa={props.empresa}
            />

            <StatReportDialog
                open={props.isStatReportOpen}
                onOpenChange={props.setIsStatReportOpen}
                initialSelection={props.statInitialSelection}
                filteredAggregatedPerformance={props.filteredAggregatedPerformance}
                statTableRef={props.statTableRef}
                migradorName={props.migradorName}
                effectiveMockId={props.effectiveMockId}
                mocksByIdMap={props.mocksByIdMap}
                projectName={props.projectName}
                empresa={props.empresa}
                excelExportProgress={props.excelExportProgress}
                statExcelMode={props.statExcelMode}
                setStatExcelMode={props.setStatExcelMode}
                isFetchingErrors={props.isFetchingErrors}
                onExportExcel={props.onExportExcel}
                onEmail={props.onEmail}
                formatStatDate={props.formatStatDate}
                formatStatTime={props.formatStatTime}
                getStatEmpresa={props.getStatEmpresa}
                formatStatDuration={props.formatStatDuration}
            />

            <QuickEditDialog
                open={props.quickOpen}
                onOpenChange={(v) => {
                    if (!v && props.quickEditObject && !props.isQuickReadOnly) {
                        props.releaseQuickLock(`projects/${props.quickEditObject.projectId}/mocks/${props.quickEditObject.mockId}/migrationObjects/${props.quickEditObject.id}`);
                    }
                    props.setQuickOpen(v);
                }}
                quickEditObject={props.quickEditObject}
                handleSaveQuick={props.handleSaveQuick}
                readOnly={props.isQuickReadOnly}
                preserveScroll
                empresa={props.empresa ?? undefined}
                projectName={props.projectName}
                mockName={
                    props.quickEditObject?.mockId
                        ? props.mocksByIdMap.get(props.quickEditObject.mockId)?.name ||
                          props.quickEditObject.mockId
                        : props.mocksByIdMap.get(props.effectiveMockId || "")?.name ||
                          props.effectiveMockId ||
                          undefined
                }
            />

            <CommentDialog
                open={props.commentDialogOpen}
                onOpenChange={props.setCommentDialogOpen}
                commentTargetObject={props.commentTargetObject}
                commentsMapByObjectName={props.commentsMapByObjectName}
                quickCommentText={props.quickCommentText}
                setQuickCommentText={props.setQuickCommentText}
                handleSaveQuickComment={props.handleSaveQuickComment}
                handleDeleteQuickComment={props.handleDeleteQuickComment}
                handleUpdateQuickComment={props.handleUpdateQuickComment}
                isAdmin={props.isAdmin}
                currentUserId={props.currentUserId}
                preserveScroll
            />

            <FinalizeCargaDialog
                open={props.isCargaConfirmOpen}
                onOpenChange={props.setIsCargaConfirmOpen}
                loadStatusToConfirm={props.loadStatusToConfirm}
                confirmFinalizeCarga={props.confirmFinalizeCarga}
            />

            <RestartCargaDialog
                open={props.isRestartConfirmOpen}
                onOpenChange={props.setIsRestartConfirmOpen}
                mockToRestart={props.mockToRestart}
                handleConfirmRestart={props.handleConfirmRestart}
            />

            <ResetObjectDialog
                open={props.isIndividualResetOpen}
                onOpenChange={props.setIsIndividualResetOpen}
                objectToReset={props.objectToReset}
                onConfirm={props.handleIndividualReset}
                onClear={() => props.setObjectToReset(null)}
            />

            <LogViewerDialog
                open={!!props.logViewerObject}
                onClose={() => props.setLogViewerObject(null)}
                projectId={props.logViewerObject?.projectId || ""}
                objectName={props.logViewerObject?.name || ""}
                mockId={props.logViewerObject?.mockId || ""}
                mockName={props.logViewerObject?.mockName || ""}
                projectName={props.logViewerObject?.projectName || props.projectName || ""}
                migrador={props.logViewerObject?.migrador || ""}
                dataMigr={props.logViewerObject?.dataMigr || ""}
                hrExecMig={props.logViewerObject?.hrExecMig || ""}
                empresa={props.logViewerObject?.empresa || ""}
            />

            <ForceLockDialog
                open={props.isForceLockOpen}
                onOpenChange={props.setIsForceLockOpen}
                target={props.forceLockTarget}
                blockerName={props.forceLockBlockerName}
                onForceAcquire={props.handleForceAcquireQuick}
                onViewOnly={props.handleViewOnlyQuick}
                preserveScroll
            />

            {props.isEmailComposeOpen && (
                <EmailComposeDialog
                    open={props.isEmailComposeOpen}
                    onClose={() => props.setIsEmailComposeOpen(false)}
                    rows={props.statEmailRows}
                    mockName={props.statMockName}
                    signatures={props.userProfile?.emailSignatures ?? []}
                    fromEmail={props.userProfile?.fromEmail ?? props.userProfile?.email ?? props.user?.email ?? undefined}
                    toSuggestions={props.emailSuggestions}
                    errorRows={props.statErrorRows}
                />
            )}

            {props.isPrecedenceOpen && (
            <PrecedenceDialog
                open={props.isPrecedenceOpen}
                onOpenChange={props.setIsPrecedenceOpen}
                precedenceObject={props.precedenceObject}
                onSetPrecedenceObject={props.setPrecedenceObject}
                precedenceMode="card"
                objects={props.precedenceCatalogObjects}
                activityGroups={props.activityGroups}
                searchTerm={props.precedenceSearchTerm}
                onSearchChange={props.setPrecedenceSearchTerm}
                searchRef={props.precedenceSearchRef}
                timerRef={props.precedenceSearchTimerRef}
            />
            )}
        </>
    );
}
