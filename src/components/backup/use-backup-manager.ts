'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser, useDb } from '@/supabase';
import { useToast } from '@/hooks/use-toast';
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
import { collection, getDocs } from '@/supabase/compat-db-shim';
import type { CompatDb } from '@/supabase/compat-db-shim';
import { extractRoots, fmtBytes } from './backup-formatters';

interface LocalBackupRegistryContext {
  projectId: string;
  projectName: string;
  backupType: 'full' | 'mock';
  mockId?: string;
  mockName?: string;
}

interface UseBackupManagerOptions {
  projectId: string | null;
  projectName?: string;
  onLoadingListChange?: (loading: boolean) => void;
}

export function useBackupManager({
  projectId,
  projectName,
  onLoadingListChange,
}: UseBackupManagerOptions) {
  const { user } = useUser();
  const { toast } = useToast();
  const db = useDb();

  const userRef = useRef(user);
  userRef.current = user;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [backups, setBackups] = useState<BackupListItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const isLoadingListRef = useRef(false);

  const [backupType, setBackupType] = useState<'full' | 'mock'>('full');
  const [backupDestination, setBackupDestination] = useState<BackupDestination>('storage');
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [objectCountByMock, setObjectCountByMock] = useState<Record<string, number>>({});
  const [selectedMock, setSelectedMock] = useState('');
  const [isLoadingMocks, setIsLoadingMocks] = useState(false);
  const [isCreatingMock, setIsCreatingMock] = useState(false);

  const [restoreTarget, setRestoreTarget] = useState<BackupListItem | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [purgeBeforeRestore, setPurgeBeforeRestore] = useState(false);
  const [selectedRoots, setSelectedRoots] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BackupListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localRestoreMode, setLocalRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [localPurge, setLocalPurge] = useState(false);
  const [isRestoringFile, setIsRestoringFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = useCallback(async (): Promise<string> => {
    const token = await userRef.current?.getIdToken();
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    return token;
  }, []);

  const loadBackups = useCallback(async () => {
    if (isLoadingListRef.current) return;

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

  useEffect(() => {
    onLoadingListChange?.(isLoadingList);
  }, [isLoadingList, onLoadingListChange]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

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

  const loadMocksForProject = useCallback(
    async (targetProjectId: string) => {
      if (!targetProjectId) {
        setMocks([]);
        setObjectCountByMock({});
        return;
      }

      setIsLoadingMocks(true);
      try {
        const mocksColl = collection(db as CompatDb, 'projects', targetProjectId, 'mocks');
        const snapshot = await getDocs(mocksColl);
        const mocksWithCounts = await Promise.all(
          snapshot.docs.map(async (mockDoc) => {
            const mock = { id: mockDoc.id, ...mockDoc.data() } as Mock;
            const objectsSnap = await getDocs(
              collection(
                db as CompatDb,
                'projects',
                targetProjectId,
                'mocks',
                mockDoc.id,
                'migrationObjects',
              ),
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
    },
    [db],
  );

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !f.name.endsWith('.json.gz')) {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Selecione um arquivo .json.gz.',
      });
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

  const availableRoots = restoreTarget
    ? extractRoots(restoreTarget.metadata.collections)
    : [];

  const toggleRoot = (root: string) => {
    setSelectedRoots((prev) =>
      prev.includes(root) ? prev.filter((r) => r !== root) : [...prev, root],
    );
  };

  const sortedMocks = useMemo(
    () => [...mocks].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [mocks],
  );

  return {
    loadBackups,
    backupType,
    setBackupType,
    backupDestination,
    setBackupDestination,
    createBackup,
    createMockBackup,
    isCreating,
    isCreatingMock,
    projectId,
    sortedMocks,
    objectCountByMock,
    selectedMock,
    setSelectedMock,
    isLoadingMocks,
    backups,
    isLoadingList,
    downloadBackup,
    openRestoreDialog,
    setDeleteTarget,
    restoreTarget,
    setRestoreTarget,
    restoreMode,
    setRestoreMode,
    purgeBeforeRestore,
    setPurgeBeforeRestore,
    selectedRoots,
    toggleRoot,
    availableRoots,
    isRestoring,
    confirmRestore,
    deleteTarget,
    isDeleting,
    confirmDelete,
    fileInputRef,
    localFile,
    handleFileChange,
    localRestoreMode,
    setLocalRestoreMode,
    localPurge,
    setLocalPurge,
    isRestoringFile,
    restoreLocalFile,
  };
}
