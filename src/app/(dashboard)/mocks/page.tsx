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
import { useToast } from "@/hooks/use-toast";
import { useActiveProjectId } from '@/hooks/use-active-project-id';
import { getProjectCompanyName } from '@/lib/migration/project-company';
import { safeRouterReplace, useRouterReady } from '@/lib/navigation/safe-router';

function MocksContent() {
  const { projectId } = useActiveProjectId();
  const router = useRouter();
  const isRouterReady = useRouterReady();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isRouterReady || projectId) return;
    safeRouterReplace(router, '/projetos');
  }, [isRouterReady, projectId, router]);

  // Data hook
  const {
    userProfile, isAdmin, isMaster, mocks, isLoading, masterObjects, projectData, objectsByMock
  } = useMocksData(projectId);
  const isProjectLocked = !!projectData?.isLocked;

  // Actions hook
  const mocksActions = useMocksActions(projectId, isAdmin, userProfile, isMaster);

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
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

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
    return mocks.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.explanatoryText && m.explanatoryText.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [mocks, searchTerm]);

  // Handlers
  const handleOpenDialog = async (mock?: Mock, viewOnly: boolean = false) => {
    if ((!isAdmin || isProjectLocked) && !viewOnly) return;
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
        sequence: ((mocks?.length || 0) + 1).toString().padStart(2, '0'),
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

  const selectedMock = useMemo(
    () => mocks?.find((m) => m.id === selectedMockId) ?? null,
    [mocks, selectedMockId],
  );
  const selectedMockName = selectedMock?.name || "MOCK";
  const selectedMockDescription = selectedMock?.explanatoryText;

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

  const handleAiGenerate = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", description: "Digite o prefixo para gerar o texto com IA." });
      return;
    }
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "mock", keywords: formData.name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao gerar texto com IA.");
      setFormData((prev) => ({ ...prev, explanatoryText: data.description }));
      if (data?.source === "fallback") {
        toast({ description: "IA indisponível no ambiente. Texto gerado por fallback local." });
      }
    } catch {
      toast({ variant: "destructive", description: "Erro ao gerar texto explicativo com IA." });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (isLoading) return <div className="p-8 text-xs font-black animate-pulse uppercase tracking-[0.2em] text-slate-400">SINCRONIZANDO JANELAS...</div>;

  return (
    <>
      <MockHeader
        isAdmin={isAdmin && !isProjectLocked}
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
      />

      <div>
        <MockTable
          ref={mockTableRef}
          mocks={filteredMocks}
          selectedMockId={selectedMockId}
          onSelect={(id) => setSelectedMockId(id)}
          isAdmin={isAdmin && !isProjectLocked}
          isMaster={isMaster && !isProjectLocked}
          isProjectLocked={isProjectLocked}
          currentUserId={user?.uid || ''}
          projectId={projectId}
          isTogglingLoad={mocksActions.isTogglingLoad}
          isDeleting={null}
          objectsByMock={objectsByMock}
          onToggleLock={(mock) => { mocksActions.handleToggleLock(mock); returnFocusToSelected(); }}
          onToggleLoadStatus={(mock) => { mocksActions.handleToggleLoadStatus(mock, mocks || []); returnFocusToSelected(); }}
          onClone={(mock) => { mocksActions.setCloneSourceMock(mock); mocksActions.setIsCloneDialogOpen(true); }}
          onEdit={(mock) => handleOpenDialog(mock)}
          onView={(mock) => handleOpenDialog(mock, true)}
          onDelete={(mock) => { setSelectedMockId(mock.id); mocksActions.setIsBulkDeleteConfirmOpen(true); }}
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
        handleBulkDelete={() => mocksActions.handleBulkDelete(selectedMockId, mocks || [])}
        isBulkRestartConfirmOpen={mocksActions.isBulkRestartConfirmOpen}
        setIsBulkRestartConfirmOpen={mocksActions.setIsBulkRestartConfirmOpen}
        isBulkReseting={mocksActions.isBulkReseting}
        handleBulkReset={() => mocksActions.handleBulkReset(selectedMockId, mocks || [])}
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
        isAdmin={isAdmin}
        formData={formData}
        onFormChange={setFormData}
        editingMock={editingMock}
        onSave={() =>
          mocksActions.handleSaveMock(
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
        onAiGenerate={handleAiGenerate}
        isGeneratingAi={isGeneratingAi}
      />

      <CloneMockDialog
        open={mocksActions.isCloneDialogOpen}
        onOpenChange={mocksActions.setIsCloneDialogOpen}
        sourceMock={mocksActions.cloneSourceMock}
        onConfirm={(data) => mocksActions.handleConfirmClone(mocksActions.cloneSourceMock, data)}
      />

      {ctxMenu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 shadow-xl py-1 min-w-[160px]"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          <button onClick={() => handleOpenDialog(ctxMenu.mock)} className={cn("w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors", isProjectLocked ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100")}>Editar Janela</button>
          {!isProjectLocked && (
            <button onClick={() => mocksActions.handleToggleLock(ctxMenu.mock)} className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 uppercase tracking-widest">Bloquear/Desbloquear</button>
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
