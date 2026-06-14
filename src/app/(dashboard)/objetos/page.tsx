"use client";

import React, { Suspense } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import {
  Loader2, Plus, Search, Network, Database,
  FileUp, Download,
  Table as TableIcon, Grid3X3, X,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { normalizeMasterCatalogName } from '@/lib/migration/master-catalog';
import { getProjectCompanyName } from '@/lib/migration/project-company';
import { PageHeader } from '@/components/layout/page-header';
import {
  parseSequence,
  resolveDisplayChargeOrder,
} from '@/lib/migration/sequence-utils';
import { getConfiguredChargeGroupForObject, findChargeGroupIdForObject } from '@/lib/migration/charge-group-sync';
import {
  QuickCreateObjectDialog,
  EditObjectDialog,
  ImportDialog,
  DependencyMapperDialog,
  ParallelSelectDialog,
  SelectNextDialog,
  PrecedenceDialog,
  ForceLockDialog,
} from './components/lazy-dialogs';
import { MigrationObjectCard } from './components/object-card';
import type { MasterObject } from '@/types/master-object';
import { ObjectsTable } from './components/objects-table';
import { useObjectsPage } from './hooks/use-objects-page';
import { ObjetosFilters } from './components/objetos-filters';

const PAGE_TOOLBAR_BTN =
  "fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0";

function ObjetosMasterPageContent() {
  const {
    // Refs
    nameInputRef, fileInputRef, depSearch1Ref, depSearch2Ref, depSearchTimerRef, depTriggerRef,
    selectNextSearchRef, selectNextTimerRef, selectNextTriggerRef,
    parallelSearchRef, parallelSearchTimerRef, parallelTriggerRef,
    terminalEndRef,
    // State
    open, setOpen, isQuickCreateOpen, setIsQuickCreateOpen,
    isImportOpen, setIsImportOpen, searchTerm, setSearchTerm,
    isImporting, importProgress, setImportProgress,
    importFinished, setImportFinished, importCounts, importLogs, setImportLogs,
    isDragging, selectedCardId, setSelectedCardId,
    draggedObjectId, setDraggedObjectId, dragOverObjectId, setDragOverObjectId,
    editingObject, quickFormData, setQuickFormData, editFormData,
    isDependenciesOpen, setIsDependenciesOpen, dependencySearchTerm, setDependencySearchTerm,
    dependencySelectedIds, setDependencySelectedIds, dependencyTargetObject,
    isSelectNextOpen, setIsSelectNextOpen, selectNextTargetObject, selectNextSearchTerm, setSelectNextSearchTerm,
    isParallelSelectOpen, setIsParallelSelectOpen, parallelSelectTarget, parallelSelectSearch, setParallelSelectSearch,
    parallelSelectedIds, setParallelSelectedIds,
    sortMode, statusFilter, setStatusFilter,
    isSearchOpen, setIsSearchOpen, viewMode, setViewMode,
    isForceLockOpen, setIsForceLockOpen, forceLockTarget, forceLockBlockerName,
    activityGroups, activityGroupFilter, setActivityGroupFilter,
    chargeGroups, configuredChargeGroupById,
    isPrecedenceOpen, setIsPrecedenceOpen, precedenceObject, setPrecedenceObject, precedenceMode,
    // Derived
    objects, isLoading, isAdmin, isAdminOrMaster, isLockedByOther, lockedByName,
    usageMap, precedenceMap, sequenceContextRows, sortedFilteredObjects, duplicateMasterNameKeys, activeProject, hasActiveFilters, selectedMockName, isMockLocked,
    canRegisterObjects, objectCatalogBlockedReason,
    displayChargeOrderById,
    // Handlers
    handleClearFilters, handleOpenDependencies, handleSaveDependencySelect, handleOpenParallelSelect, handleSaveParallelSelect,
    handleOpenSelectNext, handleSelectNextConfirm, handleOpenPrecedence,
    handleDragOver, handleDragLeave, handleDrop,
    suggestNextParallelOrder,
    handleFileImport, handleExportJson, handleDelete,
    handleOpenEditDialog, handleForceAcquire,
    handleSaveQuick, performReorder, handleSaveEdit, handlePatchMaster,
    releaseLock, editSaveError, clearEditSaveError,
  } = useObjectsPage();

  // Wrapper para visualização (mock bloqueado)
  const handleOpenViewDialog = (obj: MasterObject) => {
    handleOpenEditDialog(obj, true);
  };

  return (
    <DashboardShell noPadding>
      <div className="flex flex-col relative w-full min-h-screen bg-slate-50/30">
        <PageHeader
          variant="fiori"
          title="Gestão de objetos"
          subtitle="Catálogo mestre de objetos"
          empresa={getProjectCompanyName(activeProject) ?? undefined}
          projectName={activeProject?.name}
          mockName={selectedMockName ?? undefined}
          badge={
            <span className="fiori-page-badge">
              {objects && objects.length > 0 ? sortedFilteredObjects?.length || 0 : 0}
            </span>
          }
          backHref="/"
          context={hasActiveFilters ? (
            <>
              <span className="fiori-page-context-dot animate-pulse" />
              <span>Filtros ativos</span>
            </>
          ) : null}
          actions={
            <TooltipProvider delayDuration={0}>
              <div className="fiori-toolbar">
                <div className={cn("fiori-toolbar-search", isSearchOpen && "fiori-toolbar-search--open")}>
                  <div className="fiori-search-shell">
                    <Search className="fiori-search-icon" aria-hidden />
                    <input
                      type="search"
                      autoFocus={isSearchOpen}
                      placeholder="Pesquisar objetos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setIsSearchOpen(false);
                      }}
                      className="fiori-search-input"
                      aria-label="Pesquisar objetos"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="fiori-search-clear"
                        onClick={() => setSearchTerm("")}
                        aria-label="Limpar busca"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

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
                      aria-label={isSearchOpen ? "Fechar busca" : "Pesquisar objetos"}
                    >
                      <Search className="w-4 h-4" />
                      {hasActiveFilters && !isSearchOpen && (
                        <span className="fiori-toolbar-dot" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" variant="fiori">
                    {isSearchOpen ? "Fechar busca" : "Pesquisar objetos"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenPrecedence(null, 'global')}
                      className={PAGE_TOOLBAR_BTN}
                    >
                      <Network className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" variant="fiori">
                    Diagrama de precedências
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExportJson()}
                      disabled={isLoading || !(objects?.length)}
                      className={PAGE_TOOLBAR_BTN}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" variant="fiori">
                    Exportar catálogo (.json)
                  </TooltipContent>
                </Tooltip>

                {isAdmin && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsImportOpen(true)}
                          disabled={!canRegisterObjects}
                          className={PAGE_TOOLBAR_BTN}
                        >
                          <FileUp className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" variant="fiori">
                        Importar objetos
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsQuickCreateOpen(true)}
                          className={PAGE_TOOLBAR_BTN}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" variant="fiori">
                        Novo objeto
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewMode(prev => prev === 'CARDS' ? 'TABLE' : 'CARDS')}
                          className={cn(
                            PAGE_TOOLBAR_BTN,
                            viewMode === 'TABLE' && "fiori-toolbar-btn-active"
                          )}
                        >
                          {viewMode === 'TABLE' ? <Grid3X3 className="w-4 h-4" /> : <TableIcon className="w-4 h-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" variant="fiori">
                        {viewMode === 'TABLE' ? "Visualizar como cards" : "Visualizar como tabela"}
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </TooltipProvider>
          }
        />

        {objectCatalogBlockedReason && (
          <div className="mx-4 md:mx-8 mt-3 px-4 py-3 bg-amber-50 border border-amber-200/80 text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
            {objectCatalogBlockedReason}
          </div>
        )}

        {/* TIER 2: SEARCH/FILTERS */}
        <ObjetosFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          activityGroups={activityGroups}
          activityGroupFilter={activityGroupFilter}
          setActivityGroupFilter={setActivityGroupFilter}
          filteredCount={sortedFilteredObjects.length}
          totalCount={objects?.length || 0}
          handleClearFilters={handleClearFilters}
        />

        <div className={cn("space-y-4 flex-1", viewMode === 'CARDS' && "px-4 md:px-8 py-4")}>
          <div className="bg-transparent">
            {isLoading ? (
              <div className="flex items-center justify-center p-20 bg-white border border-slate-100 rounded-none w-full"><Loader2 className="w-8 h-8 animate-spin text-SkyBlue-500" /></div>
            ) : sortedFilteredObjects.length > 0 ? (
              <TooltipProvider>
                {viewMode === 'TABLE' ? (
                  <ObjectsTable
                    objects={sortedFilteredObjects}
                    displayChargeOrderById={displayChargeOrderById}
                    configuredChargeGroupById={configuredChargeGroupById}
                    duplicateMasterNameKeys={duplicateMasterNameKeys}
                    allObjects={objects}
                    isAdmin={isAdmin}
                    usageMap={usageMap}
                    isMockLocked={isMockLocked}
                    selectedCardId={selectedCardId}
                    onSelectCard={(id) => setSelectedCardId(prev => prev === id ? null : id)}
                    onEdit={handleOpenEditDialog}
                    onView={handleOpenViewDialog}
                    onDelete={handleDelete}
                    onOpenPrecedence={(o) => handleOpenPrecedence(o as any, 'card')}
                    onDependencies={handleOpenDependencies}
                    onSelectNext={handleOpenSelectNext}
                    onSelectParallel={handleOpenParallelSelect}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {sortedFilteredObjects.map((obj) => {
                      const myParallelMajor = obj.parallelOrder ? parseSequence(obj.parallelOrder).major : 0;
                      const otherParallel = (myParallelMajor > 0 ? objects?.filter(o =>
                        o.id !== obj.id &&
                        o.parallelOrder &&
                        parseSequence(o.parallelOrder).major === myParallelMajor
                      ) : []) || [];

                      return (
                        <MigrationObjectCard
                          key={obj.id}
                          obj={obj as any}
                          displayChargeOrder={
                            displayChargeOrderById
                              ? (resolveDisplayChargeOrder(
                                  obj.id,
                                  obj.chargeOrder,
                                  displayChargeOrderById,
                                ) ?? undefined)
                              : undefined
                          }
                          displayChargeGroup={getConfiguredChargeGroupForObject(
                            obj.id,
                            configuredChargeGroupById,
                          )}
                          allChargeGroups={chargeGroups}
                          selectedChargeGroupId={findChargeGroupIdForObject(obj.id, chargeGroups)}
                          catalogDuplicateName={duplicateMasterNameKeys.has(normalizeMasterCatalogName(obj.name))}
                          allGroups={activityGroups}
                          isAdmin={isAdmin}
                          isAdminOrMaster={isAdminOrMaster}
                          isExecutionSort={sortMode === 'EXECUTION'}
                          isNormalDragging={draggedObjectId === obj.id}
                          isNormalDragTarget={dragOverObjectId === obj.id}
                          usageCount={usageMap[obj.id]?.size || 0}
                          precedenceChain={precedenceMap.get(obj.id) ?? { chain: [], isCircular: false }}
                          otherParallelObjects={otherParallel as any[]}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", obj.id);
                            setDraggedObjectId(obj.id);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverObjectId(obj.id);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverObjectId(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedObjectId && sequenceContextRows.length > 0) {
                              const moving = sequenceContextRows.find(o => o.id === draggedObjectId);
                              if (moving) performReorder(moving, String(obj.chargeOrder || ''), obj.id);
                              setDraggedObjectId(null);
                              setDragOverObjectId(null);
                            }
                          }}
                          isSelected={selectedCardId === obj.id}
                          onSelect={(id) => setSelectedCardId(prev => prev === id ? null : id)}
                          onEdit={handleOpenEditDialog}
                          onView={handleOpenViewDialog}
                          onDelete={handleDelete}
                          onOpenPrecedence={(o) => handleOpenPrecedence(o as any, 'card')}
                          onDependencies={handleOpenDependencies}
                          onSelectNext={handleOpenSelectNext}
                          onSelectParallel={handleOpenParallelSelect}
                          isMockLocked={isMockLocked}
                          onChargeOrderChange={(target, newOrder) => {
                            if (!isAdmin || isMockLocked) return;
                            const displayed = displayChargeOrderById
                              ? resolveDisplayChargeOrder(target.id, target.chargeOrder, displayChargeOrderById)
                              : target.chargeOrder;
                            void performReorder(
                              { ...target, chargeOrder: displayed ?? target.chargeOrder ?? "" },
                              newOrder,
                              undefined,
                              {
                                orderedList: displayChargeOrderById ? sortedFilteredObjects : undefined,
                                onMoved: (id) => {
                                  setSelectedCardId(id);
                                  requestAnimationFrame(() => {
                                    document
                                      .getElementById(`obj-card-${id}`)
                                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  });
                                },
                              },
                            );
                          }}
                          onStatusChange={
                            isAdminOrMaster
                              ? (target, status) => {
                                  void handlePatchMaster(target, { status });
                                }
                              : undefined
                          }
                          onActivityGroupsChange={
                            isAdminOrMaster
                              ? (target, activityGroupIds) => {
                                  void handlePatchMaster(target, { activityGroupIds });
                                }
                              : undefined
                          }
                          onChargeGroupChange={
                            isAdminOrMaster
                              ? (target, chargeGroupId) => {
                                  void handlePatchMaster(target, { chargeGroupId });
                                }
                              : undefined
                          }
                          onTypeChange={
                            isAdminOrMaster
                              ? (target, type) => {
                                  void handlePatchMaster(target, { type });
                                }
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </TooltipProvider>
            ) : (
              <div className="fiori-page-empty">
                <div className="fiori-page-empty__icon">
                  <Database className="h-5 w-5" aria-hidden />
                </div>
                <div className="fiori-page-empty__body">
                  <h3 className="fiori-page-empty__title">Nenhum objeto encontrado</h3>
                  <p className="fiori-page-empty__desc">
                    Tente ajustar os filtros de busca ou crie um novo objeto de migração no catálogo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="fiori-page-empty__btn"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {/* ── Dialogs (cadastro/edição sempre montados; demais lazy) ─────── */}
          <QuickCreateObjectDialog
            open={isQuickCreateOpen}
            onOpenChange={setIsQuickCreateOpen}
            quickFormData={quickFormData}
            activityGroups={activityGroups}
            catalogObjects={sequenceContextRows}
            onFormChange={(patch) =>
              setQuickFormData((prev) => ({ ...prev, ...patch }))}
            onSave={handleSaveQuick}
            nameInputRef={nameInputRef}
          />

          <EditObjectDialog
            open={open}
            onOpenChange={setOpen}
            editingObject={editingObject}
            editFormData={editFormData}
            isAdmin={isAdmin}
            isLockedByOther={isLockedByOther}
            lockedByName={lockedByName}
            activityGroups={activityGroups}
            onSave={handleSaveEdit}
            isMockLocked={isMockLocked}
            displayChargeGroup={
              editingObject
                ? getConfiguredChargeGroupForObject(editingObject.id, configuredChargeGroupById)
                : ""
            }
            onSuggestParallelOrder={(group) => suggestNextParallelOrder(group)}
            onReleaseLock={releaseLock}
            saveError={editSaveError}
            onClearSaveError={clearEditSaveError}
          />

          {isImportOpen && (
          <ImportDialog
            open={isImportOpen}
            onOpenChange={(o) => {
              if (!isImporting) {
                setIsImportOpen(o);
                if (!o) { setImportFinished(false); setImportLogs([]); }
              }
            }}
            isUploading={isImporting}
            progress={importProgress}
            finished={importFinished}
            counts={importCounts}
            logs={importLogs}
            onFileSelect={handleFileImport}
            fileInputRef={fileInputRef}
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            terminalEndRef={terminalEndRef}
            onFinishClose={() => {
              setIsImportOpen(false);
              setImportFinished(false);
              setImportProgress(0);
              setImportLogs([]);
            }}
          />
          )}

          {isDependenciesOpen && (
          <DependencyMapperDialog
            open={isDependenciesOpen}
            onOpenChange={(open) => { setIsDependenciesOpen(open); if (!open) setTimeout(() => depTriggerRef.current?.focus(), 0); }}
            targetObject={dependencyTargetObject}
            objects={sequenceContextRows}
            displayChargeOrderById={displayChargeOrderById}
            selectedIds={dependencySelectedIds}
            searchTerm={dependencySearchTerm}
            onSearchChange={setDependencySearchTerm}
            onToggleId={(id) => setDependencySelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
            onSave={handleSaveDependencySelect}
            triggerRef={depTriggerRef as React.RefObject<HTMLElement>}
            searchRef={depSearch1Ref as React.RefObject<HTMLInputElement>}
            timerRef={depSearchTimerRef as React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>}
          />
          )}

          {isParallelSelectOpen && (
          <ParallelSelectDialog
            open={isParallelSelectOpen}
            onOpenChange={(open) => {
              setIsParallelSelectOpen(open);
              if (!open) {
                if (parallelSearchRef.current) parallelSearchRef.current.value = '';
                if (parallelSearchTimerRef.current) clearTimeout(parallelSearchTimerRef.current);
                setParallelSelectSearch('');
                setTimeout(() => parallelTriggerRef.current?.focus(), 0);
              }
            }}
            targetObject={parallelSelectTarget}
            objects={sequenceContextRows}
            displayChargeOrderById={displayChargeOrderById}
            selectedIds={parallelSelectedIds}
            searchTerm={parallelSelectSearch}
            onSearchChange={setParallelSelectSearch}
            onToggleId={(id) => setParallelSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            onSave={handleSaveParallelSelect}
            triggerRef={parallelTriggerRef as React.RefObject<HTMLElement>}
            searchRef={parallelSearchRef as React.RefObject<HTMLInputElement>}
            timerRef={parallelSearchTimerRef as React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>}
          />
          )}

          {isSelectNextOpen && (
          <SelectNextDialog
            open={isSelectNextOpen}
            onOpenChange={(open) => {
              setIsSelectNextOpen(open);
              if (!open) {
                if (selectNextSearchRef.current) selectNextSearchRef.current.value = '';
                if (selectNextTimerRef.current) clearTimeout(selectNextTimerRef.current);
                setSelectNextSearchTerm('');
                setTimeout(() => selectNextTriggerRef.current?.focus(), 0);
              }
            }}
            targetObject={selectNextTargetObject}
            objects={sequenceContextRows}
            displayChargeOrderById={displayChargeOrderById}
            searchTerm={selectNextSearchTerm}
            onSearchChange={setSelectNextSearchTerm}
            onConfirm={(o) => handleSelectNextConfirm(o as any)}
            triggerRef={selectNextTriggerRef as React.RefObject<HTMLElement>}
            searchRef={selectNextSearchRef as React.RefObject<HTMLInputElement>}
            timerRef={selectNextTimerRef as React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>}
          />
          )}

          {isPrecedenceOpen && (
          <PrecedenceDialog
            open={isPrecedenceOpen}
            onOpenChange={setIsPrecedenceOpen}
            precedenceObject={precedenceObject}
            onSetPrecedenceObject={(o) => {
              setPrecedenceObject(o);
              if (depSearch1Ref.current) depSearch1Ref.current.value = '';
              if (depSearch2Ref.current) depSearch2Ref.current.value = '';
              if (depSearchTimerRef.current) clearTimeout(depSearchTimerRef.current);
              setDependencySearchTerm('');
            }}
            precedenceMode={precedenceMode}
            objects={sequenceContextRows}
            activityGroups={activityGroups}
            searchTerm={dependencySearchTerm}
            onSearchChange={setDependencySearchTerm}
            searchRef={depSearch2Ref as React.RefObject<HTMLInputElement | null>}
            timerRef={depSearchTimerRef as React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>}
          />
          )}

          {isForceLockOpen && (
          <ForceLockDialog
            open={isForceLockOpen}
            onOpenChange={setIsForceLockOpen}
            target={forceLockTarget}
            blockerName={forceLockBlockerName}
            onForceAcquire={handleForceAcquire}
            contextLabel="no catálogo"
          />
          )}

        </div>
      </div>
    </DashboardShell>
  );
}

export default function ObjetosMasterPage() {
  return (
    <Suspense fallback={
      <DashboardShell noPadding>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-SkyBlue-500" />
        </div>
      </DashboardShell>
    }>
      <ObjetosMasterPageContent />
    </Suspense>
  );
}
