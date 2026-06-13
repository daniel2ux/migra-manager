"use client";

import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Loader2 } from "lucide-react";
import {
    useReportFilters,
    useUserProfile,
    useProjects,
    useRunningMock,
    useMockData,
    useMasterCatalog,
    useMigrationObjects,
} from "@/hooks/use-report-data";
import { useReportAggregation } from "@/hooks/use-report-aggregation";
import {
    ReportContent,
    ReportFilters,
} from "@/components/reports";
import { ReportLoading, ReportEmptyState } from "@/components/reports/report-states";
import { printStyles } from "@/lib/print-styles";

function RelatoriosContent() {
    const {
        selectedProjectId,
        selectedMockId,
        setSelectedProjectId,
        setSelectedMockId,
    } = useReportFilters();
    const { isLoading: isProfileLoading, isAdmin } = useUserProfile();
    const { projects, isLoading: isProjectsLoading, accessibleProjectIds } = useProjects(isAdmin, isProfileLoading);
    const { projectMocks } = useRunningMock(selectedProjectId, selectedMockId);
    const { mockData } = useMockData(selectedProjectId, selectedMockId);
    const { masterCatalog } = useMasterCatalog();
    const { objects, isLoading: isObjectsLoading } = useMigrationObjects(
        selectedProjectId,
        selectedMockId,
        isAdmin,
        accessibleProjectIds,
        isProfileLoading,
        isProjectsLoading,
    );

    const reportData = useReportAggregation({
        objects,
        masterCatalog,
        projects,
        mockData,
        selectedProjectId,
    });

    const isLoading = isObjectsLoading || isProjectsLoading || isProfileLoading;
    const subtitle = selectedMockId !== "all"
        ? `${reportData?.mockName} — ${reportData?.projectName}`
        : `Visão Consolidada — ${reportData?.projectName}`;

    if (isLoading) {
        return <ReportLoading />;
    }

    if (!reportData || reportData.objects.length === 0) {
        return <ReportEmptyState />;
    }

    return (
        <DashboardShell noPadding>
            <div className="flex flex-col relative w-full min-h-screen bg-slate-50/30 print:min-h-0 print:bg-white">
                <PageHeader
                    title="Relatório de Auditoria"
                    subtitle={subtitle}
                    badge={selectedMockId && selectedMockId !== "all" ? (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                            {mockData?.name || selectedMockId}
                        </span>
                    ) : undefined}
                    backHref="/"
                    actions={
                        <ReportFilters
                            selectedProjectId={selectedProjectId}
                            selectedMockId={selectedMockId}
                            projects={projects}
                            projectMocks={projectMocks}
                            onProjectChange={setSelectedProjectId}
                            onMockChange={setSelectedMockId}
                        />
                    }
                />

                <div className="px-4 md:px-8 py-8 flex-1 print:p-0 print:flex-none">
                    <ReportContent reportData={reportData} />
                </div>
            </div>

            <style jsx global>{printStyles}</style>
        </DashboardShell>
    );
}

export default function RelatoriosPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen bg-white">
                    <Loader2 className="w-10 h-10 animate-spin text-SkyBlue-500" />
                </div>
            }
        >
            <RelatoriosContent />
        </Suspense>
    );
}
