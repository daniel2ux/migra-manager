'use client';

import { Suspense, useEffect, useRef } from 'react';
import {
  CheckCircle2,
    Loader2,
    Lock,
  Zap,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { PageHeader } from '@/components/layout/page-header';
import { LogImportDialog } from '@/components/logs/log-import-dialog';
import { LogViewerDialog } from '@/components/logs/log-viewer-dialog';
import { QuickEditDialog } from '@/components/migration/quick-edit-dialog';
import { CommentDialog } from '@/components/migration/comment-dialog';
import { cn } from '@/lib/utils';
import { SESSION_KEYS } from '@/lib/constants';
import { BulkSelectionBar } from './components/bulk-selection-bar';
import { ConfirmationDialogs } from './components/confirmation-dialogs';
import { CsvImportDialog } from './components/csv-import-dialog';
import { MigrationObjectFormDialog } from './components/migration-object-form-dialog';
import { MockObjectsSummary } from './components/mock-objects-summary';
import { MockObjectsToolbar } from './components/mock-objects-toolbar';
import { ObjectCard } from './components/object-card';
import { ObjectContextMenu } from './components/object-context-menu';
import { ObjectsPerformanceTable } from './components/objects-performance-table';
import { useMockObjectsPage } from './hooks/use-mock-objects-page';
import { useObjectImport } from './hooks/use-object-import';
import { useObjectsExportSync } from './hooks/use-objects-export-sync';
import { useObjectsFormActions } from './hooks/use-objects-form-actions';
import { useObjectsResetActions } from './hooks/use-objects-reset-actions';
import { useObjectsRowSelection } from './hooks/use-objects-row-selection';
import { renderMockObjectDuration } from './lib/render-duration';
import type { MigrationObject } from './types';

function ObjetosContent() {
  const page = useMockObjectsPage();

    const {
        isImporting,
    importLogOpen,
    setImportLogOpen,
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
    projectId: page.projectId ?? '',
    mockId: page.mockId ?? '',
    objects: page.objects ?? undefined,
    masterObjects: page.masterObjects ?? undefined,
    userProfile: page.userProfile ?? undefined,
  });

    const {
    selectedObjectIds,
    setSelectedObjectIds,
        handleToggleObjectSelection,
  } = useObjectsRowSelection({ sortedObjects: page.sortedObjects });

    const {
    open,
    setOpen,
        editingObject,
    formData,
    setFormData,
        prevDurationInput,
        selectedMasterIds,
    searchMasterTerm,
    setSearchMasterTerm,
        filteredMasterObjects,
        isMasterCatalogLoading,
        masterPickerEmptyHint,
    quickOpen,
    setQuickOpen,
        quickEditObject,
    quickFormData,
    commentDialogOpen,
    setCommentDialogOpen,
        commentTargetObject,
    handleOpenDialog,
    handleSave,
    handleSelectAll,
    handleToggleMasterSelection,
        handleDurationInputChange,
    handleOpenQuickDialog,
    handleSaveQuick,
    handleOpenCommentDialog,
    handleSaveQuickComment,
    handleDeleteQuickComment,
    } = useObjectsFormActions({
    db: page.db,
    user: page.user,
    projectId: page.projectId,
    mockId: page.mockId,
    isAdmin: !!page.isAdmin,
    isAdminOrMaster: !!page.isAdminOrMaster,
    isEffectiveLocked: !!page.isEffectiveLocked,
    objects: page.mergedObjects,
    masterObjects: page.masterObjects,
    isMasterObjectsLoading: page.isMasterObjectsLoading,
    userProfile: page.userProfile,
    toast: page.toast,
    refetchObjects: page.refetchObjects,
    addPendingObjects: page.addPendingObjects,
    });

    const {
    isGlobalResetOpen,
    setIsGlobalResetOpen,
        isResetProgressOpen,
    resetProgress,
    resetCount,
    objectToReset,
    setObjectToReset,
    isIndividualResetOpen,
    setIsIndividualResetOpen,
    isBulkDeleteOpen,
    setIsBulkDeleteOpen,
    isBulkResetOpen,
    setIsBulkResetOpen,
        handleToggleObjectCargaStatus,
    handleToggleObjectActive,
    handleRequestRemoveFromMock,
    handleConfirmRemoveFromMock,
    objectToRemove,
    setObjectToRemove,
    isRemoveFromMockOpen,
    setIsRemoveFromMockOpen,
    handleBulkDelete,
    handleBulkReset,
    handleGlobalReset,
    handleIndividualReset,
    } = useObjectsResetActions({
    db: page.db,
    projectId: page.projectId,
    mockId: page.mockId,
    isAdmin: !!page.isAdmin,
    isEffectiveLocked: !!page.isEffectiveLocked,
    isMockLocked: !!page.isMockLocked,
    objects: page.objects,
    selectedObjectIds,
    setSelectedObjectIds,
    toast: page.toast,
    onObjectActiveChange: page.setObjectActiveState,
    });

    const { isSyncing, handleExportJson, handleSyncPreviousReferences } = useObjectsExportSync({
    db: page.db,
    projectId: page.projectId,
    projectName: page.projectData?.name ?? page.headerEmpresa ?? 'projeto',
    mockId: page.mockId,
    isAdmin: !!page.isAdmin,
    isEffectiveLocked: !!page.isEffectiveLocked,
    objects: page.objects,
    sortedObjects: page.sortedObjects,
    mockData: page.mockData,
    toast: page.toast,
  });

  const handleOpenDialogRef = useRef(handleOpenDialog);

  useEffect(() => {
    handleOpenDialogRef.current = handleOpenDialog;
  }, [handleOpenDialog]);

  const isAddDialogReady =
    !page.isLoading &&
    !page.isMockLoading &&
    !page.isProfileLoading &&
    !page.isMasterObjectsLoading;

  useEffect(() => {
    const shouldOpenAdd =
      typeof window !== 'undefined' &&
      sessionStorage.getItem(SESSION_KEYS.MOCK_OPEN_ADD) === '1';
    if (shouldOpenAdd && isAddDialogReady) {
      sessionStorage.removeItem(SESSION_KEYS.MOCK_OPEN_ADD);
      handleOpenDialogRef.current();
    }
  }, [isAddDialogReady]);

  if (page.isMasked && !page.mockId) {
        return (
            <DashboardShell>
                <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            </DashboardShell>
        );
    }

  const statusBadge = (
    <span
      className={cn(
        'fiori-page-status fiori-page-status--icon-only',
        page.isEffectiveLocked
          ? 'fiori-page-status--warning'
          : page.mockData?.status === 'CARGA_CONCLUIDA'
            ? 'fiori-page-status--success'
            : page.mockData?.status === 'CARGA_EM_ANDAMENTO' || page.mockData?.isRunning
              ? 'fiori-page-status--active'
              : 'fiori-page-status--neutral',
      )}
      aria-label={
        page.isEffectiveLocked
          ? 'Bloqueada'
          : page.mockData?.status === 'CARGA_CONCLUIDA'
            ? 'Concluída'
            : page.mockData?.status === 'CARGA_EM_ANDAMENTO' || page.mockData?.isRunning
              ? 'Em andamento'
              : 'Ativa'
      }
      title={
        page.isEffectiveLocked
          ? 'Bloqueada'
          : page.mockData?.status === 'CARGA_CONCLUIDA'
            ? 'Concluída'
            : page.mockData?.status === 'CARGA_EM_ANDAMENTO' || page.mockData?.isRunning
              ? 'Em andamento'
              : 'Ativa'
      }
    >
      {page.isEffectiveLocked ? (
        <Lock className="w-3 h-3" aria-hidden />
      ) : page.mockData?.status === 'CARGA_CONCLUIDA' ? (
        <CheckCircle2 className="w-3 h-3" aria-hidden />
      ) : page.mockData?.status === 'CARGA_EM_ANDAMENTO' || page.mockData?.isRunning ? (
        <Zap className="w-3 h-3 fill-current animate-pulse" aria-hidden />
      ) : (
        <CheckCircle2 className="w-3 h-3" aria-hidden />
      )}
            </span>
        );

    return (
        <DashboardShell noPadding>
            <div
                className={cn(
          'relative flex w-full flex-col bg-slate-50/30',
          page.showPerformanceTable
            ? 'h-[calc(100dvh-4rem)] min-h-0 overflow-hidden'
            : 'min-h-screen',
                )}
            >
                <PageHeader
                    variant="fiori"
                    title="Objetos"
                    backHref="/mocks"
          empresa={page.headerEmpresa}
          projectName={page.headerProjectName}
          mockName={page.headerMockName}
          badge={statusBadge}
                    actions={
            <MockObjectsToolbar
              isAdmin={!!page.isAdmin}
              isAdminOrMaster={!!page.isAdminOrMaster}
              isEffectiveLocked={!!page.isEffectiveLocked}
              isMockLoading={page.isMockLoading}
              isSyncing={isSyncing}
              isImporting={isImporting}
              selectedObjectIds={selectedObjectIds}
              searchTerm={page.searchTerm}
              onSearchTermChange={page.setSearchTerm}
              performanceFilter={page.performanceFilter}
              onPerformanceFilterChange={page.setPerformanceFilter}
              showPerformanceTable={page.showPerformanceTable}
              onTogglePerformanceTable={() =>
                page.setShowPerformanceTable(!page.showPerformanceTable)
              }
              onBulkReset={() => setIsBulkResetOpen(true)}
              onBulkDelete={() => setIsBulkDeleteOpen(true)}
              onSyncPreviousReferences={handleSyncPreviousReferences}
              onOpenLogImport={() => page.setIsLogImportOpen(true)}
              navImportFileRef={navImportFileRef}
              onImportFile={handleImportFile}
              onGlobalReset={() => setIsGlobalResetOpen(true)}
              onOpenImportDialog={() => setImportLogOpen(true)}
              onExportJson={() => handleExportJson()}
              onAddObjects={() => handleOpenDialog()}
            />
          }
        />

        <div
          className={cn(
            'flex-1 flex flex-col min-h-0',
            page.showPerformanceTable && 'overflow-hidden',
          )}
        >
                    <MigrationObjectFormDialog
                        open={open}
                        onOpenChange={setOpen}
                        editingObject={editingObject}
                        formData={formData}
                        onFormChange={setFormData}
                        filteredMasterObjects={filteredMasterObjects}
                        isMasterCatalogLoading={isMasterCatalogLoading}
                        masterPickerEmptyHint={masterPickerEmptyHint}
                        selectedMasterIds={selectedMasterIds}
                        onSelectAll={handleSelectAll}
                        onToggleMaster={handleToggleMasterSelection}
                        searchMasterTerm={searchMasterTerm}
                        onSearchMasterChange={setSearchMasterTerm}
                        prevDurationInput={prevDurationInput}
                        onDurationInputChange={handleDurationInputChange}
                        onSave={handleSave}
            isAdmin={!!page.isAdmin}
            isMockLocked={!!page.isEffectiveLocked}
            empresa={page.headerEmpresa}
            projectName={page.headerProjectName}
            mockName={page.headerMockName}
                    />

                    <QuickEditDialog
                        mode="mock"
                        open={quickOpen}
                        onOpenChange={setQuickOpen}
                        quickEditObject={quickEditObject}
                        quickFormData={quickFormData}
                        onSave={handleSaveQuick}
            empresa={page.headerEmpresa}
            projectName={page.headerProjectName}
            mockName={page.headerMockName}
          />

                    <CommentDialog
                        open={commentDialogOpen}
                        onOpenChange={setCommentDialogOpen}
                        commentTargetObject={commentTargetObject}
            commentsMap={page.commentsMap}
                        onSave={handleSaveQuickComment}
                        onDeleteComment={handleDeleteQuickComment}
                        footerMode="cancel-save"
                        submitShortcut="enter"
            isAdmin={!!page.isAdmin}
            currentUserId={page.user?.uid}
          />

          {page.isLoading || page.isMockLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
                            <div
                                className={cn(
                'relative',
                page.showPerformanceTable && 'flex flex-1 flex-col min-h-0 overflow-hidden',
                                )}
                            >
              {!page.isLoading && !page.isMockLoading && page.sortedObjects.length === 0 ? (
                                    <div className="text-center py-12 text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-40">
                                        Nenhum objeto adicionado.
                                    </div>
              ) : page.showPerformanceTable ? (
                                    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                                        <ObjectsPerformanceTable
                                            className="h-full w-full min-h-0 flex-1"
                    objects={page.sortedObjects as MigrationObject[]}
                    renderDuration={renderMockObjectDuration}
                                        />
                                    </div>
                                ) : (
                                    <>
                  <MockObjectsSummary
                    objectCount={page.sortedObjects.length}
                    totals={page.totals}
                  />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 px-4 md:px-8 py-4">
                    {page.sortedObjects.map((obj, idx) => (
                                                <ObjectCard
                                                    key={obj.id}
                                                    obj={obj}
                                                    idx={idx}
                                                    isSelected={selectedObjectIds.includes(obj.id)}
                        isAdmin={!!page.isAdmin}
                        isAdminOrMaster={!!page.isAdminOrMaster}
                        isMockLocked={page.isEffectiveLocked}
                        isMockInProgress={
                          page.mockData?.status === 'CARGA_EM_ANDAMENTO' ||
                          page.mockData?.isRunning
                        }
                        isMockCompleted={page.mockData?.status === 'CARGA_CONCLUIDA'}
                        masterObjects={page.masterObjects ?? []}
                        objComments={page.commentsMap[obj.id] ?? []}
                                                    onSelect={handleToggleObjectSelection}
                        onContextMenu={(e: React.MouseEvent, o: MigrationObject) =>
                          page.setCtxMenu({ x: e.clientX, y: e.clientY, obj: o })
                        }
                                                    onOpenDialog={handleOpenDialog}
                                                    onOpenCommentDialog={handleOpenCommentDialog}
                                                    onOpenQuickDialog={handleOpenQuickDialog}
                                                    onToggleCargaStatus={handleToggleObjectCargaStatus}
                                                    onToggleActive={handleToggleObjectActive}
                                                    onRemoveFromMock={handleRequestRemoveFromMock}
                        onImportLogs={(id: string) => page.setLogImportSingleId(id)}
                        onViewLogs={page.openLogViewer}
                                                    onResetObject={(obj: MigrationObject) => {
                                                        setObjectToReset(obj);
                                                        setIsIndividualResetOpen(true);
                                                    }}
                        renderDuration={renderMockObjectDuration}
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
                        isRemoveFromMockOpen={isRemoveFromMockOpen}
                        onRemoveFromMockChange={setIsRemoveFromMockOpen}
                        objectToRemove={objectToRemove}
                        onClearObjectToRemove={() => setObjectToRemove(null)}
                        onConfirmRemoveFromMock={handleConfirmRemoveFromMock}
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
            importFileInputRef={importFileInputRef as React.RefObject<HTMLInputElement>}
            terminalEndRef={terminalEndRef as React.RefObject<HTMLDivElement>}
                        onOpenChange={setImportLogOpen}
                        onReset={resetImportState}
                        onImportFile={handleImportFile}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    />

          {page.isLogImportOpen && (
                        <LogImportDialog
              open={page.isLogImportOpen}
              onClose={() => page.setIsLogImportOpen(false)}
              mockId={page.mockId || ''}
              projectId={page.projectId ?? ''}
              allObjects={(page.objects ?? [])
                .filter((o) => o && o.name)
                .map((o) => ({ id: o.id, name: o.name }))}
                            selectedObjectIds={selectedObjectIds}
                        />
                    )}

          {page.logImportSingleId && (
                        <LogImportDialog
              open={!!page.logImportSingleId}
              onClose={() => page.setLogImportSingleId(null)}
              mockId={page.mockId || ''}
              projectId={page.projectId ?? ''}
              allObjects={(page.objects ?? [])
                .filter((o) => o && o.name)
                .map((o) => ({ id: o.id, name: o.name }))}
              selectedObjectIds={[page.logImportSingleId]}
            />
          )}

          {page.logViewerObject && (
                        <LogViewerDialog
              open={!!page.logViewerObject}
              onClose={() => page.setLogViewerObject(null)}
              mockId={page.mockId || ''}
              mockName={page.mockData?.name}
              projectId={page.projectId || ''}
              objectName={page.logViewerObject.name}
              migrador={page.logViewerObject.migrador}
              dataMigr={page.logViewerObject.dataMigr}
              hrExecMig={page.logViewerObject.hrExecMig}
              empresa={page.logViewerObject.empresa}
              projectName={page.headerProjectName ?? page.projectData?.name}
            />
          )}
        </div>
                </div>

            <ObjectContextMenu
        ctxMenu={page.ctxMenu}
        onClose={() => page.setCtxMenu(null)}
        isAdmin={!!page.isAdmin}
        isAdminOrMaster={!!page.isAdminOrMaster}
        isMockLocked={!!page.isEffectiveLocked}
        isMockInProgress={
          page.mockData?.status === 'CARGA_EM_ANDAMENTO' || page.mockData?.isRunning
        }
        isMockCompleted={page.mockData?.status === 'CARGA_CONCLUIDA'}
                onOpenDialog={handleOpenDialog}
                onOpenCommentDialog={handleOpenCommentDialog}
                onToggleCargaStatus={handleToggleObjectCargaStatus}
                onOpenQuickDialog={handleOpenQuickDialog}
        onImportLogs={(id) => page.setLogImportSingleId(id)}
        onViewLogs={page.openLogViewer}
                onResetObject={(obj) => {
                    setObjectToReset(obj);
                    setIsIndividualResetOpen(true);
                }}
                onToggleActive={handleToggleObjectActive}
                onRemoveFromMock={handleRequestRemoveFromMock}
            />
    </DashboardShell>
    );
}

export default function ObjetosPage() {
    return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <Loader2 className="w-10 h-10 animate-spin text-SkyBlue-500" />
        </div>
      }
    >
            <ObjetosContent />
        </Suspense>
    );
}
