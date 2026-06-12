'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Archive,
  Download,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HardDrive,
  AlertCircle,
} from 'lucide-react';
import type { BackupDestination } from '@/lib/backup/build-backup';
import {
  parseFilenameFromContentDisposition,
  saveBackupLocally,
} from '@/lib/backup/local-download';
import {
  addLocalBackup,
  mergeBackupLists,
  removeLocalBackup,
} from '@/lib/backup/local-registry';
import type { BackupListItem, RestoreOptions } from '@/lib/backup/types';
import type { Mock } from '@/types/migration';
import { collection, getDocs } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractRoots(collections: string[]): string[] {
  return [...new Set(collections.map(p => p.split('/')[0]))].sort();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Archive className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-[11px] font-black uppercase tracking-widest">Nenhum backup encontrado</p>
      <p className="text-[11px] mt-1">Crie um backup acima ou salve localmente para registrá-lo aqui.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface BackupManagerHandle {
  refresh: () => Promise<void>;
}

interface BackupManagerProps {
  projectId: string | null;
  projectName?: string;
  onLoadingListChange?: (loading: boolean) => void;
}

interface LocalBackupRegistryContext {
  projectId: string;
  projectName: string;
  backupType: 'full' | 'mock';
  mockId?: string;
  mockName?: string;
}

export const BackupManager = forwardRef<BackupManagerHandle, BackupManagerProps>(function BackupManager(
  { projectId, projectName, onLoadingListChange },
  ref,
) {
  const auth = useAuth();
  const { toast } = useToast();

  // Refs estáveis para auth e toast — evitam que mudanças de referência (auth: null→instance,
  // toast: novo objeto a cada render) propaguem deps instáveis para useCallback/useEffect.
  const authRef = useRef(auth);
  authRef.current = auth;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [backups, setBackups] = useState<BackupListItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Ref para prevenir chamadas duplicadas do loadBackups
  const isLoadingListRef = useRef(false);

  // Backup por mock
  const [backupType, setBackupType] = useState<'full' | 'mock'>('full');
  const [backupDestination, setBackupDestination] = useState<BackupDestination>('storage');
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [objectCountByMock, setObjectCountByMock] = useState<Record<string, number>>({});
  const [selectedMock, setSelectedMock] = useState<string>('');
  const [isLoadingMocks, setIsLoadingMocks] = useState(false);
  const [isCreatingMock, setIsCreatingMock] = useState(false);
  const db = useFirestore();

  // Restore from Storage
  const [restoreTarget, setRestoreTarget] = useState<BackupListItem | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [purgeBeforeRestore, setPurgeBeforeRestore] = useState(false);
  const [selectedRoots, setSelectedRoots] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<BackupListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local file restore
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localRestoreMode, setLocalRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [localPurge, setLocalPurge] = useState(false);
  const [isRestoringFile, setIsRestoringFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // Auth token
  // -------------------------------------------------------------------------

  // getToken usa authRef → deps vazias → referência nunca muda entre renders
  const getToken = useCallback(async (): Promise<string> => {
    const token = await authRef.current?.currentUser?.getIdToken();
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    return token;
  }, []);  

  // -------------------------------------------------------------------------
  // List backups
  // -------------------------------------------------------------------------

  const loadBackups = useCallback(async () => {
    // Prevenir chamadas duplicadas
    if (isLoadingListRef.current) {
      return;
    }

    isLoadingListRef.current = true;
    setIsLoadingList(true);

    try {
      const token = await getToken();
      const res = await fetch('/api/backup/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerToken: token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBackups(mergeBackupLists(json.backups ?? [], projectId));
    } catch (err) {
      toastRef.current({
        variant: 'destructive',
        title: 'Erro ao listar backups',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsLoadingList(false);
      isLoadingListRef.current = false;
    }
  }, [getToken, projectId]);

  useImperativeHandle(ref, () => ({ refresh: loadBackups }), [loadBackups]);

  useEffect(() => {
    onLoadingListChange?.(isLoadingList);
  }, [isLoadingList, onLoadingListChange]);

  // Carregar backups ao montar
  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  // -------------------------------------------------------------------------
  // Create backup
  // -------------------------------------------------------------------------

  const handleBackupCreateResponse = async (
    res: Response,
    options: {
      successTitle: string;
      destination: BackupDestination;
      registry?: LocalBackupRegistryContext;
    },
  ) => {
    if (options.destination === 'local') {
      if (!res.ok) {
        const json = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(json.error ?? 'Falha ao gerar backup.');
      }

      const filename =
        parseFilenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
        'backup.json.gz';
      const totalDocs = Number(res.headers.get('X-Backup-Total-Docs') ?? 0);
      const sizeBytes = Number(res.headers.get('X-Backup-Size-Bytes') ?? 0);
      const blob = await res.blob();
      await saveBackupLocally(blob, filename);

      if (options.registry) {
        addLocalBackup({
          filename,
          createdAt: res.headers.get('X-Backup-Created-At') ?? new Date().toISOString(),
          projectId: options.registry.projectId,
          projectName: options.registry.projectName,
          backupType: options.registry.backupType,
          mockId: options.registry.mockId,
          mockName: options.registry.mockName,
          totalDocs,
          sizeBytes,
          checksum: res.headers.get('X-Backup-Checksum') ?? '',
        });
      }

      toast({
        title: options.successTitle,
        description: `${filename} — ${fmtBytes(sizeBytes)} — ${totalDocs.toLocaleString('pt-BR')} documentos`,
      });
      await loadBackups();
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.error);

    toast({
      title: options.successTitle,
      description: `${json.filename} — ${fmtBytes(json.metadata.sizeBytes)} — ${json.metadata.totalDocs} documentos`,
    });
    await loadBackups();
  };

  const resolvedProjectName = projectName?.trim() || projectId || 'projeto';

  const createBackup = async () => {
    setIsCreating(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerToken: token,
          destination: backupDestination,
          projectId,
          projectName: resolvedProjectName,
        }),
      });
      await handleBackupCreateResponse(res, {
        successTitle:
          backupDestination === 'local'
            ? 'Backup salvo localmente'
            : 'Backup criado com sucesso',
        destination: backupDestination,
        registry:
          backupDestination === 'local' && projectId
            ? {
                projectId,
                projectName: resolvedProjectName,
                backupType: 'full',
              }
            : undefined,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar backup',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // -------------------------------------------------------------------------
  // Backup por mock
  // -------------------------------------------------------------------------

  const loadMocksForProject = useCallback(async (projectId: string) => {
    if (!projectId) {
      setMocks([]);
      setObjectCountByMock({});
      return;
    }

    setIsLoadingMocks(true);
    try {
      const mocksColl = collection(db as Firestore, 'projects', projectId, 'mocks');
      const snapshot = await getDocs(mocksColl);
      const mocksWithCounts = await Promise.all(
        snapshot.docs.map(async (mockDoc) => {
          const mock = { id: mockDoc.id, ...mockDoc.data() } as Mock;
          const objectsSnap = await getDocs(
            collection(db as Firestore, 'projects', projectId, 'mocks', mockDoc.id, 'migrationObjects'),
          );
          return { mock, count: objectsSnap.size };
        }),
      );
      setMocks(mocksWithCounts.map(({ mock }) => mock));
      setObjectCountByMock(
        Object.fromEntries(mocksWithCounts.map(({ mock, count }) => [mock.id, count])),
      );
    } catch (err) {
      console.error('[BackupManager] Erro ao carregar mocks:', err);
      toastRef.current({
        variant: 'destructive',
        title: 'Erro ao carregar mocks',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsLoadingMocks(false);
    }
  }, [db]);

  useEffect(() => {
    setSelectedMock('');
    if (!projectId) {
      setMocks([]);
      setObjectCountByMock({});
      return;
    }
    if (backupType === 'mock') {
      void loadMocksForProject(projectId);
    }
  }, [projectId, backupType, loadMocksForProject]);

  const createMockBackup = async () => {
    if (!projectId || !selectedMock) {
      toast({ variant: 'destructive', title: 'Selecione uma mock' });
      return;
    }

    const selectedMockData = mocks.find((mock) => mock.id === selectedMock);
    const selectedMockName = selectedMockData?.name ?? selectedMock;

    setIsCreatingMock(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/backup/create-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerToken: token,
          projectId,
          mockId: selectedMock,
          projectName: resolvedProjectName,
          destination: backupDestination,
        }),
      });
      await handleBackupCreateResponse(res, {
        successTitle:
          backupDestination === 'local'
            ? 'Backup do mock salvo localmente'
            : 'Backup do mock criado com sucesso',
        destination: backupDestination,
        registry:
          backupDestination === 'local'
            ? {
                projectId,
                projectName: resolvedProjectName,
                backupType: 'mock',
                mockId: selectedMock,
                mockName: selectedMockName,
              }
            : undefined,
      });
      setSelectedMock('');
      await loadMocksForProject(projectId);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar backup do mock',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsCreatingMock(false);
    }
  };

  // -------------------------------------------------------------------------
  // Download backup
  // -------------------------------------------------------------------------

  const downloadBackup = async (filename: string) => {
    try {
      const token = await getToken();
      const res = await fetch('/api/backup/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerToken: token, filename }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar backup',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    }
  };

  // -------------------------------------------------------------------------
  // Restore from Storage
  // -------------------------------------------------------------------------

  const openRestoreDialog = (item: BackupListItem) => {
    setRestoreTarget(item);
    setRestoreMode('merge');
    setPurgeBeforeRestore(false);
    setSelectedRoots([]);
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      const token = await getToken();
      const options: RestoreOptions = {
        mode: restoreMode,
        rootCollections: selectedRoots.length ? selectedRoots : undefined,
        purgeBeforeRestore,
      };
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerToken: token, filename: restoreTarget.filename, options }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const { result } = json;
      toast({
        title: 'Restauração concluída',
        description: `${result.totalDocs} documentos restaurados em ${result.restoredCollections.length} coleções.${result.errors.length ? ` ${result.errors.length} erro(s).` : ''}`,
      });
      setRestoreTarget(null);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao restaurar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // -------------------------------------------------------------------------
  // Delete backup
  // -------------------------------------------------------------------------

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.source === 'local' && deleteTarget.localId) {
        removeLocalBackup(deleteTarget.localId);
        toast({
          title: 'Registro removido',
          description: `${deleteTarget.filename} — o arquivo permanece no seu computador.`,
        });
        setDeleteTarget(null);
        setBackups((prev) => prev.filter((item) => item.localId !== deleteTarget.localId));
        return;
      }

      const token = await getToken();
      const res = await fetch('/api/backup/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerToken: token, filename: deleteTarget.filename }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast({ title: 'Backup excluído', description: deleteTarget.filename });
      setDeleteTarget(null);
      setBackups((prev) => prev.filter((item) => item.filename !== deleteTarget.filename));
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Restore from local file
  // -------------------------------------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !f.name.endsWith('.json.gz')) {
      toast({ variant: 'destructive', title: 'Formato inválido', description: 'Selecione um arquivo .json.gz.' });
      return;
    }
    setLocalFile(f);
  };

  const restoreLocalFile = async () => {
    if (!localFile) return;
    setIsRestoringFile(true);
    try {
      const token = await getToken();
      const options: RestoreOptions = {
        mode: localRestoreMode,
        purgeBeforeRestore: localPurge,
      };
      const fd = new FormData();
      fd.append('callerToken', token);
      fd.append('file', localFile);
      fd.append('options', JSON.stringify(options));

      const res = await fetch('/api/backup/restore-file', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const { result } = json;
      toast({
        title: 'Restauração concluída',
        description: `${result.totalDocs} documentos restaurados em ${result.restoredCollections.length} coleções.`,
      });
      setLocalFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao restaurar arquivo',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsRestoringFile(false);
    }
  };

  // -------------------------------------------------------------------------
  // Restore dialog: root collection toggles
  // -------------------------------------------------------------------------

  const availableRoots = restoreTarget ? extractRoots(restoreTarget.metadata.collections) : [];

  const toggleRoot = (root: string) => {
    setSelectedRoots(prev =>
      prev.includes(root) ? prev.filter(r => r !== root) : [...prev, root]
    );
  };

  const sortedMocks = useMemo(
    () => [...mocks].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [mocks],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Criar backup                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="fiori-backup-create">
        <h3 className="fiori-wizard-panel-title">
          <HardDrive className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Criar backup
        </h3>
        <p className="fiori-wizard-panel-desc">
          Exporte todo o Firestore ou selecione uma mock do projeto atual (mock, objetos e logs).
          Escolha gravar no Firebase Storage ou salvar em uma pasta local do seu computador.
        </p>

        <div className="fiori-backup-type-row">
          <div className="fiori-on-off fiori-backup-type-toggle">
            <span className="fiori-on-off__label">Tipo</span>
            <div className="fiori-on-off__group" role="group" aria-label="Tipo de backup">
              <button
                type="button"
                className={cn(
                  'fiori-on-off__btn',
                  backupType === 'full' && 'fiori-on-off__btn--selected',
                )}
                onClick={() => setBackupType('full')}
              >
                Backup completo
              </button>
              <button
                type="button"
                className={cn(
                  'fiori-on-off__btn',
                  backupType === 'mock' && 'fiori-on-off__btn--selected',
                )}
                onClick={() => setBackupType('mock')}
              >
                Por mock
              </button>
            </div>
          </div>

          <div className="fiori-on-off fiori-backup-dest-toggle">
            <span className="fiori-on-off__label">Destino</span>
            <div className="fiori-on-off__group" role="group" aria-label="Destino do backup">
              <button
                type="button"
                className={cn(
                  'fiori-on-off__btn',
                  backupDestination === 'storage' && 'fiori-on-off__btn--selected',
                )}
                onClick={() => setBackupDestination('storage')}
              >
                Firebase Storage
              </button>
              <button
                type="button"
                className={cn(
                  'fiori-on-off__btn',
                  backupDestination === 'local' && 'fiori-on-off__btn--selected',
                )}
                onClick={() => setBackupDestination('local')}
              >
                Pasta local
              </button>
            </div>
          </div>

          <button
            type="button"
            className="fiori-wizard-btn fiori-wizard-btn--emphasized fiori-backup-execute-btn"
            onClick={backupType === 'full' ? createBackup : createMockBackup}
            disabled={
              backupType === 'full'
                ? isCreating
                : isCreatingMock || !projectId || !selectedMock
            }
            aria-label={
              backupType === 'full'
                ? 'Executar backup completo'
                : 'Executar backup do mock selecionado'
            }
          >
            {(backupType === 'full' ? isCreating : isCreatingMock) ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                Executando…
              </>
            ) : (
              'Executar'
            )}
          </button>
        </div>

        {backupType === 'mock' && (
          <div className="fiori-backup-mock-fields">
            {isLoadingMocks ? (
              <div className="fiori-wizard-empty fiori-backup-mock-list">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--fiori-brand)]" aria-hidden />
                <p>Carregando mocks…</p>
              </div>
            ) : sortedMocks.length > 0 ? (
              <div className="fiori-wizard-chip-grid fiori-backup-mock-list">
                {sortedMocks.map((mock) => {
                  const objectCount = objectCountByMock[mock.id] ?? 0;
                  const isSelected = selectedMock === mock.id;

                  return (
                    <button
                      key={mock.id}
                      type="button"
                      onClick={() => setSelectedMock(mock.id)}
                      className={cn('fiori-chip', isSelected && 'fiori-chip-selected')}
                      aria-pressed={isSelected}
                    >
                      <span className="font-semibold">{mock.name}</span>
                      <span className="text-[0.6875rem] font-normal opacity-80">
                        {objectCount} objeto{objectCount !== 1 ? 's' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="fiori-wizard-empty fiori-backup-mock-list">
                <AlertCircle className="w-6 h-6 text-[var(--fiori-label)]" aria-hidden />
                <p>Nenhuma mock encontrada neste projeto.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Backups table                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="border border-slate-200 rounded-none overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200">
          {['Arquivo', 'Data', 'Docs', 'Tamanho', 'Ações'].map(col => (
            <span key={col} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {backups.length === 0 && !isLoadingList && <EmptyState />}
        {isLoadingList && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}
        {!isLoadingList &&
          backups.map(item => (
            <div
              key={item.localId ?? item.filename}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
            >
              <span className="text-[12px] font-mono text-slate-700 truncate flex items-center gap-2 min-w-0" title={item.filename}>
                <span className="truncate">{item.filename}</span>
                {item.source === 'local' && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-sky-100 text-sky-700">
                    Local
                  </span>
                )}
              </span>
              <span className="text-[12px] text-slate-600">{fmtDate(item.metadata.createdAt)}</span>
              <span className="text-[12px] font-bold text-slate-700">
                {item.metadata.totalDocs.toLocaleString('pt-BR')}
              </span>
              <span className="text-[12px] text-slate-600">{fmtBytes(item.metadata.sizeBytes)}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 border-0 rounded-lg bg-slate-100/80 hover:bg-slate-200 text-slate-600"
                  title={item.source === 'local' ? 'Arquivo salvo no seu computador' : 'Download'}
                  disabled={item.source === 'local'}
                  onClick={() => downloadBackup(item.filename)}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 border-0 rounded-lg bg-slate-100/80 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700"
                  title={
                    item.source === 'local'
                      ? 'Use a seção Restaurar arquivo local abaixo'
                      : 'Restaurar'
                  }
                  disabled={item.source === 'local'}
                  onClick={() => openRestoreDialog(item)}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 border-0 rounded-lg bg-slate-100/80 hover:bg-red-100 text-slate-600 hover:text-red-600"
                  title="Excluir"
                  onClick={() => setDeleteTarget(item)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Local file restore                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="border border-slate-200 rounded-none p-4 space-y-3 bg-slate-50/60">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Restaurar arquivo local
        </p>
        <p className="text-[11px] text-slate-500">
          Selecione um arquivo <code className="font-mono bg-slate-200 px-1 rounded">.json.gz</code> baixado anteriormente para restaurar.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json.gz,.gz"
            onChange={handleFileChange}
            className="text-[11px] text-slate-600 file:mr-3 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:border-0 file:bg-slate-200 file:text-slate-700 file:rounded-lg file:px-3 file:py-1.5 file:cursor-pointer hover:file:bg-slate-300"
          />
          {localFile && (
            <span className="text-[11px] text-slate-500">{fmtBytes(localFile.size)}</span>
          )}
        </div>

        {localFile && (
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="local-mode"
                value="merge"
                checked={localRestoreMode === 'merge'}
                onChange={() => setLocalRestoreMode('merge')}
                className="accent-emerald-500"
              />
              <span className="text-[11px] text-slate-600">Merge (upsert)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="local-mode"
                value="overwrite"
                checked={localRestoreMode === 'overwrite'}
                onChange={() => setLocalRestoreMode('overwrite')}
                className="accent-emerald-500"
              />
              <span className="text-[11px] text-slate-600">Overwrite</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={localPurge}
                onCheckedChange={v => setLocalPurge(v === true)}
                className="rounded-full border-slate-300"
              />
              <span className="text-[11px] text-red-600 font-bold">Limpar antes de restaurar</span>
            </label>
            <Button
              size="sm"
              className="border-0 h-8 text-[11px] font-black uppercase tracking-widest rounded-xl ml-auto"
              onClick={restoreLocalFile}
              disabled={isRestoringFile}
            >
              {isRestoringFile ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3 mr-1.5" />
                  Restaurar
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Restore dialog                                                       */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!restoreTarget} onOpenChange={open => !open && setRestoreTarget(null)}>
        <DialogContent className="max-w-lg rounded-none border-slate-200 [&>button]:hidden p-0">
          <DialogTitle className="sr-only">Restaurar backup</DialogTitle>

          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              Restaurar backup
            </span>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Filename */}
            <div className="bg-slate-100 px-3 py-2 border border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Arquivo</p>
              <p className="text-[12px] font-mono text-slate-700">{restoreTarget?.filename}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {restoreTarget && fmtDate(restoreTarget.metadata.createdAt)} •{' '}
                {restoreTarget?.metadata.totalDocs.toLocaleString('pt-BR')} docs •{' '}
                {restoreTarget && fmtBytes(restoreTarget.metadata.sizeBytes)}
              </p>
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Modo</p>
              <div className="flex gap-4">
                {(['merge', 'overwrite'] as const).map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="restore-mode"
                      value={m}
                      checked={restoreMode === m}
                      onChange={() => setRestoreMode(m)}
                      className="accent-emerald-500"
                    />
                    <div>
                      <span className="text-[12px] font-bold text-slate-700 capitalize">{m}</span>
                      <p className="text-[10px] text-slate-500">
                        {m === 'merge'
                          ? 'Upsert — não apaga docs existentes'
                          : 'Substitui o conteúdo de cada doc'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Collection filter */}
            {availableRoots.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Coleções (vazio = todas)
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableRoots.map(root => (
                    <label key={root} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedRoots.includes(root)}
                        onCheckedChange={() => toggleRoot(root)}
                        className="rounded-full border-slate-300"
                      />
                      <span className="text-[11px] font-mono text-slate-700">{root}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Purge option */}
            <label className="flex items-start gap-2 cursor-pointer border border-red-200 bg-red-50 px-3 py-2">
              <Checkbox
                checked={purgeBeforeRestore}
                onCheckedChange={v => setPurgeBeforeRestore(v === true)}
                className="rounded-full border-red-300 mt-0.5"
              />
              <div>
                <p className="text-[11px] font-black text-red-700 uppercase tracking-wider">
                  Limpar coleções antes de restaurar
                </p>
                <p className="text-[10px] text-red-500 mt-0.5">
                  Apaga todos os documentos existentes nas coleções selecionadas. Irreversível.
                </p>
              </div>
            </label>

            {purgeBeforeRestore && (
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <p className="text-[11px] font-bold">
                  ATENÇÃO: Os dados atuais serão permanentemente apagados antes da restauração.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
            <Button
              variant="ghost"
              size="sm"
              className="border-0 bg-slate-200 hover:bg-slate-300 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-600 h-8"
              onClick={() => setRestoreTarget(null)}
              disabled={isRestoring}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="border-0 h-8 text-[11px] font-black uppercase tracking-widest rounded-xl"
              onClick={confirmRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1.5" />
                  Confirmar Restauração
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Delete confirm dialog                                                */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-none border-slate-200 [&>button]:hidden p-0">
          <DialogTitle className="sr-only">Excluir backup</DialogTitle>

          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
            <Trash2 className="w-4 h-4 text-red-500" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              Excluir backup
            </span>
          </div>

          <div className="px-5 py-4 space-y-3">
            <p className="text-[12px] text-slate-700">
              {deleteTarget?.source === 'local'
                ? 'Remove o registro deste backup da lista. O arquivo .json.gz permanece na pasta local do seu computador.'
                : 'O arquivo será permanentemente removido do Storage. Esta ação não pode ser desfeita.'}
            </p>
            <div className="bg-slate-100 px-3 py-2 border border-slate-200">
              <p className="text-[12px] font-mono text-slate-700">{deleteTarget?.filename}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
            <Button
              variant="ghost"
              size="sm"
              className="border-0 bg-slate-200 hover:bg-slate-300 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-600 h-8"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="border-0 h-8 text-[11px] font-black uppercase tracking-widest rounded-xl"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1.5" />
                  Excluir
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
