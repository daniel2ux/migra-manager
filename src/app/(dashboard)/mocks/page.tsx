"use client";

import { useState, useMemo, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useEditLock } from '@/hooks/use-edit-lock';
import { useMocksData } from '@/hooks/use-mocks-data';
import { useMocksActions } from '@/hooks/use-mocks-actions';
import { MockFormDialog } from '@/components/mocks/mock-form-dialog';
import { CloneMockDialog } from '@/components/mocks/clone-mock-dialog';
import { MockHeader } from '@/components/mocks/mock-header';
import { MockTable, MockTableHandle } from '@/components/mocks/mock-table';
import { MockAlerts } from '@/components/mocks/mock-alerts';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import { useUser } from '@/supabase';
import { cn } from '@/lib/utils';
import { FOCUS_RETURN_DELAY, STORAGE_KEYS } from '@/lib/constants';
import type { Mock } from '@/types/migration';
import { useActiveProjectId } from '@/hooks/use-active-project-id';
import { isActiveCatalogMaster } from '@/lib/dashboard/object-filters';
import { getProjectCompanyName } from '@/lib/migration/project-company';
import { suggestNextMockSequence, suggestNextMockSequenceFromSource, filterActiveMocks, isMockInactive } from '@/lib/mock-utils';
import { safeRouterReplace, useRouterReady } from '@/lib/navigation/safe-router';

function MocksContent() {
  const { projectId } = useActiveProjectId();
  const router = useRouter();
  const isRouterReady = useRouterReady();
  const { user } = useUser();

  useEffect(() => {
    if (!isRouterReady || projectId) return;
    safeRouterReplace(router, '/projetos');
  }, [isRouterReady, projectId, router]);

  // Data hook
  const {
    userProfile, isAdmin, isMaster, can, mocks, isLoading, masterObjects, projectData, objectsByMock
  } = useMocksData(projectId);
  const isProjectLocked = !!projectData?.isLocked;
  const locked = isProjectLocked;

  const mocksActions = useMocksActions(projectId, userProfile, { can, isMaster });

  const canEdit = can("mocks.edit") && !locked;
  const canCreate = can("mocks.create") && !locked;
  const canDelete = can("mocks.delete") && !locked;
  const canRestart = can("mocks.restart") && !locked;
  const canLock = can("mocks.lock") && !locked;
  const canClone = can("mocks.clone") && !locked;

  // Edit lock for individual mock editing
  const [editingMock, setEditingMock] = useState<Mock | null>(null);
  const { acquireLock } = useEditLock(
    editingMock && projectId ? `projects/${projectId}/mocks/${editingMock.id}` : null,
    user?.uid ?? null, userProfile?.name ?? user?.email ?? null, user?.email ?? null
  );

  // Local UI State
  const [open, setOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [formData, setFormData] = useState({
    name: '', sequence: '', explanatoryText: '', startDate: '', endDate: '', isLocked: false, status: 'PENDENTE'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedMockId, setSelectedMockId] = useLocalStorageState<string>(STORAGE_KEYS.DASHBOARD_MOCK, 'all');
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; mock: Mock } | null>(null);
  const [selectedMasters, setSelectedMasters] = useState<Record<string, string[]>>({});
  const [showInactive, setShowInactive] = useLocalStorageState<boolean>(STORAGE_KEYS.MOCKS_SHOW_INACTIVE, false);

  const inactiveCount = useMemo(
    () => (mocks ?? []).filter((m) => isMockInactive(m)).length,
    [mocks],
  );

  const activeMocks = useMemo(() => filterActiveMocks(mocks), [mocks]);

  // Ref para gerenciar foco nos cards
  const mockTableRef = useRef<MockTableHandle>(null);

  // Retornar foco ao card selecionado após ações
  const returnFocusToSelected = () => {
    setTimeout(() => {
      mockTableRef.current?.scrollToSelected();
      mockTableRef.current?.focusSelected();
    }, FOCUS_RETURN_DELAY);
  };

  // Handle outside clicks for context menu
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, [ctxMenu]);

  // Derived data
  const filteredMocks = useMemo(() => {
    if (!mocks) return [];
    const scope = showInactive ? mocks : activeMocks;
    return scope.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.explanatoryText && m.explanatoryText.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [mocks, activeMocks, showInactive, searchTerm]);

  useEffect(() => {
    if (selectedMockId === 'all') return;
    const selected = mocks?.find((m) => m.id === selectedMockId);
    if (!selected || (!showInactive && isMockInactive(selected))) {
      setSelectedMockId('all');
    }
  }, [mocks, selectedMockId, showInactive, setSelectedMockId]);

  // Handlers
  const handleOpenDialog = async (mock?: Mock, viewOnly: boolean = false) => {
    if (mock && isMockInactive(mock) && !viewOnly) {
      handleOpenDialog(mock, true);
      return;
    }
    if ((!canEdit || isProjectLocked) && !viewOnly) return;
    if (mock && !viewOnly) {
      const { acquired, lockedByName: blocker } = await acquireLock(`projects/${projectId}/mocks/${mock.id}`);
      if (!acquired) {
        mocksActions.setForceLockTarget(mock);
        mocksActions.setForceLockBlockerName(blocker || 'Outro usuário');
        mocksActions.setIsForceLockOpen(true);
        return;
      }
    }
    setIsViewOnly(viewOnly);
    if (mock) {
      setEditingMock(mock);
      const parts = mock.name.split('-');
      setFormData({
        name: parts.length > 1 ? parts.slice(0, -1).join('-') : mock.name,
        sequence: parts.length > 1 ? parts[parts.length - 1] : '',
        explanatoryText: mock.explanatoryText || '',
        startDate: mock.startDate || '',
        endDate: mock.endDate || '',
        isLocked: !!mock.isLocked,
        status: mock.status || 'PENDENTE'
      });
      setSelectedMasters((prev) => ({ ...prev, [mock.id]: prev[mock.id] || [] }));
    } else {
      setEditingMock(null);
      setFormData({
        name: 'MOCK',
        sequence: suggestNextMockSequence('MOCK', activeMocks),
        explanatoryText: '',
        startDate: '',
        endDate: '',
        isLocked: false,
        status: 'PENDENTE'
      });
      setSelectedMasters((prev) => ({ ...prev, new: prev.new || [] }));
    }
    setOpen(true);
  };

  const cloneNextSequence = useMemo(
    () => suggestNextMockSequenceFromSource(mocksActions.cloneSourceMock ?? { name: '' }, activeMocks),
    [mocksActions.cloneSourceMock, activeMocks],
  );

  const handleFormChange = (data: typeof formData) => {
    setFormData(data);
  };

  const selectedMock = useMemo(
    () => mocks?.find((m) => m.id === selectedMockId) ?? null,
    [mocks, selectedMockId],
  );
  const selectedMockName = selectedMock?.name || "MOCK";
  const selectedMockDescription = selectedMock?.explanatoryText;

  const catalogObjectCount = useMemo(
    () => masterObjects?.filter(isActiveCatalogMaster).length ?? 0,
    [masterObjects],
  );

  const companyName = getProjectCompanyName(projectData);
  const headerEmpresa = companyName ?? projectData?.name;
  const headerProjectName = companyName ? projectData?.name : undefined;
  const headerMockName = useMemo(() => {
    if (selectedMockId === 'all') return 'Visão geral';
    return mocks?.find((m) => m.id === selectedMockId)?.name ?? selectedMockId;
  }, [selectedMockId, mocks]);

  const selectedMasterIdsForDialog = useMemo(() => {
    const key = editingMock?.id || "new";
    return selectedMasters[key] || [];
  }, [editingMock?.id, selectedMasters]);

  if (isLoading) return <div className="p-8 text-xs font-black animate-pulse uppercase tracking-[0.2em] text-slate-400">SINCRONIZANDO JANELAS...</div>;

  return (
    <>
      <MockHeader
        canCreate={canCreate}
        canDelete={canDelete}
        canRestart={canRestart}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        onAddMock={() => handleOpenDialog()}
        onBulkDelete={() => mocksActions.setIsBulkDeleteConfirmOpen(true)}
        onBulkRestart={() => mocksActions.setIsBulkRestartConfirmOpen(true)}
        selectedMockId={selectedMockId}
        _filteredCount={filteredMocks.length}
        empresa={headerEmpresa}
        projectName={headerProjectName}
        mockName={headerMockName}
        showInactive={showInactive}
        onToggleShowInactive={() => setShowInactive(!showInactive)}
        inactiveCount={inactiveCount}
      />

      <div>
        <MockTable
          ref={mockTableRef}
          mocks={filteredMocks}
          selectedMockId={selectedMockId}
          onSelect={(id) => setSelectedMockId(id)}
          canEdit={canEdit}
          canLock={canLock}
          canClone={canClone}
          canRestart={canRestart}
          isMaster={isMaster && !locked}
          isProjectLocked={isProjectLocked}
          currentUserId={user?.uid || ''}
          projectId={projectId}
          isTogglingLoad={mocksActions.isTogglingLoad}
          isDeleting={null}
          objectsByMock={objectsByMock}
          catalogObjectCount={catalogObjectCount}
          onToggleLock={(mock) => { mocksActions.handleToggleLock(mock); returnFocusToSelected(); }}
          onToggleLoadStatus={(mock) => { mocksActions.handleToggleLoadStatus(mock, activeMocks); returnFocusToSelected(); }}
          onClone={(mock) => { mocksActions.setCloneSourceMock(mock); mocksActions.setIsCloneDialogOpen(true); }}
          onEdit={(mock) => handleOpenDialog(mock)}
          onView={(mock) => handleOpenDialog(mock, true)}
          onToggleActive={(mock, activate) => { void mocksActions.handleToggleActive(mock, activate); returnFocusToSelected(); }}
          onStatusChange={(mock, status) => { void mocksActions.handleStatusChange(mock, status, activeMocks); returnFocusToSelected(); }}
          onContextMenu={(e, mock) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, mock }); }}
        />
      </div>

      <MockAlerts
        isCargaConfirmOpen={mocksActions.isCargaConfirmOpen}
        setIsCargaConfirmOpen={mocksActions.setIsCargaConfirmOpen}
        loadStatusToConfirm={mocksActions.loadStatusToConfirm}
        confirmFinalizeCarga={() => { mocksActions.confirmFinalizeCarga(); returnFocusToSelected(); }}
        isRestartConfirmOpen={mocksActions.isRestartConfirmOpen}
        setIsRestartConfirmOpen={mocksActions.setIsRestartConfirmOpen}
        mockToRestart={mocksActions.mockToRestart}
        handleConfirmRestart={() => { mocksActions.handleConfirmRestart(); returnFocusToSelected(); }}
        isBulkDeleteConfirmOpen={mocksActions.isBulkDeleteConfirmOpen}
        setIsBulkDeleteConfirmOpen={mocksActions.setIsBulkDeleteConfirmOpen}
        selectedMockName={selectedMockName}
        selectedMockDescription={selectedMockDescription}
        handleBulkDelete={() => mocksActions.handleBulkDelete(selectedMockId, activeMocks)}
        isBulkRestartConfirmOpen={mocksActions.isBulkRestartConfirmOpen}
        setIsBulkRestartConfirmOpen={mocksActions.setIsBulkRestartConfirmOpen}
        isBulkReseting={mocksActions.isBulkReseting}
        handleBulkReset={() => mocksActions.handleBulkReset(selectedMockId, activeMocks)}
        isForceLockOpen={mocksActions.isForceLockOpen}
        setIsForceLockOpen={mocksActions.setIsForceLockOpen}
        forceLockBlockerName={mocksActions.forceLockBlockerName}
        handleForceAcquire={() => {
          void mocksActions.handleForceAcquire(mocksActions.forceLockTarget);
        }}
      />

      <MockFormDialog
        open={open}
        onOpenChange={setOpen}
        isViewOnly={isViewOnly}
        isAdmin={can("mocks.edit")}
        formData={formData}
        onFormChange={handleFormChange}
        editingMock={editingMock}
        onSave={() =>
          void mocksActions.handleSaveMock(
            editingMock,
            formData,
            selectedMasterIdsForDialog,
            masterObjects || [],
            () => setOpen(false)
          )
        }
        masterObjects={masterObjects}
        selectedMasters={selectedMasters}
        onMasterSelect={(mockId, masterIds) =>
          setSelectedMasters((prev) => ({ ...prev, [mockId]: masterIds }))
        }
      />

      <CloneMockDialog
        open={mocksActions.isCloneDialogOpen}
        onOpenChange={mocksActions.setIsCloneDialogOpen}
        sourceMock={mocksActions.cloneSourceMock}
        nextSequence={cloneNextSequence}
        onConfirm={(data) => mocksActions.handleConfirmClone(mocksActions.cloneSourceMock, data)}
      />

      {ctxMenu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 shadow-xl py-1 min-w-[160px]"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          <button onClick={() => handleOpenDialog(ctxMenu.mock, isMockInactive(ctxMenu.mock))} className={cn("w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors", (isProjectLocked || isMockInactive(ctxMenu.mock)) ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100")}>Editar Janela</button>
          {!isProjectLocked && !isMockInactive(ctxMenu.mock) && (
            <button onClick={() => mocksActions.handleToggleLock(ctxMenu.mock)} className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 uppercase tracking-widest">Bloquear/Desbloquear</button>
          )}
          {canEdit && !isProjectLocked && (
            <button
              onClick={() => {
                void mocksActions.handleToggleActive(ctxMenu.mock, isMockInactive(ctxMenu.mock));
                setCtxMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 uppercase tracking-widest"
            >
              {isMockInactive(ctxMenu.mock) ? "Reativar janela" : "Inativar janela"}
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default function MocksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs font-black animate-pulse uppercase tracking-[0.2em] text-slate-400">INICIALIZANDO PLATAFORMA...</div>}>
      <MocksContent />
    </Suspense>
  );
}
