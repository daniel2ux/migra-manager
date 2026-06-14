'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useUser, useDb } from '@/supabase';
import { AccessDeniedScreen } from '@/components/usuarios';
import { useToast } from '@/hooks/use-toast';
import { useUsersData } from '@/hooks/use-users-data';
import { useActiveProjectId } from '@/hooks/use-active-project-id';
import { useDoc, useMemoDb } from '@/supabase';
import { doc, collection, getDocs } from '@/supabase/compat-db-shim';
import type { CompatDb } from '@/supabase/compat-db-shim';
import { getProjectCompanyName } from '@/lib/migration/project-company';
import { safeRouterReplace, useRouterReady } from '@/lib/navigation/safe-router';
import { Loader2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mock, Project } from '@/types/migration';
import { filterActiveMocks } from '@/lib/mock-utils';

export default function LimparLogsPage() {
  const { user } = useUser();
  const db = useDb();
  const router = useRouter();
  const isRouterReady = useRouterReady();
  const { projectId } = useActiveProjectId();
  const { isMaster, isProfileLoading } = useUsersData('');
  const { toast } = useToast();

  const projectRef = useMemoDb(
    () => (db && projectId ? doc(db, 'projects', projectId) : null),
    [db, projectId],
  );
  const { data: projectData } = useDoc<Project>(projectRef);

  const userRef = useRef(user);
  userRef.current = user;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [mocks, setMocks] = useState<Mock[]>([]);
  const [selectedMock, setSelectedMock] = useState('');
  const [isLoadingMocks, setIsLoadingMocks] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [lastResult, setLastResult] = useState<{ deleted: number; message: string } | null>(null);

  const getToken = useCallback(async (): Promise<string> => {
    const token = await userRef.current?.getIdToken(true);
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    return token;
  }, []);

  useEffect(() => {
    if (!isRouterReady || projectId) return;
    safeRouterReplace(router, '/projetos');
  }, [isRouterReady, projectId, router]);

  const loadMocksForProject = useCallback(async (activeProjectId: string) => {
    if (!activeProjectId) {
      setMocks([]);
      return;
    }

    setIsLoadingMocks(true);
    try {
      const mocksColl = collection(db as CompatDb, 'projects', activeProjectId, 'mocks');
      const snapshot = await getDocs(mocksColl);
      const mocksData = filterActiveMocks(snapshot.docs.map((mockDoc) => ({ id: mockDoc.id, ...mockDoc.data() } as Mock)));
      setMocks(mocksData);
    } catch (err) {
      console.error('[LimparLogs] Erro ao carregar mocks:', err);
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
    setConfirmText('');
    setLastResult(null);
    if (!projectId) {
      setMocks([]);
      return;
    }
    void loadMocksForProject(projectId);
  }, [projectId, loadMocksForProject]);

  const sortedMocks = useMemo(
    () => [...mocks].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [mocks],
  );

  const selectedMockData = mocks.find((mock) => mock.id === selectedMock);

  const handleClearLogs = async () => {
    if (!projectId || !selectedMock) {
      toast({ variant: 'destructive', title: 'Selecione uma mock' });
      return;
    }

    if (confirmText !== selectedMock) {
      toast({
        variant: 'destructive',
        title: 'Confirmação incorreta',
        description: 'Digite o ID do mock para confirmar.',
      });
      return;
    }

    setIsClearing(true);
    setLastResult(null);

    try {
      const token = await getToken();
      const res = await fetch('/api/log-service/clear-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerToken: token,
          projectId,
          mockId: selectedMock,
          confirm: true,
        }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      setLastResult({ deleted: json.deletedCount, message: json.message });
      setConfirmText('');
      toast({
        title: 'Logs limpos com sucesso',
        description: `${json.deletedCount} logs deletados.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao limpar logs',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (isProfileLoading) {
    return (
      <DashboardShell noPadding>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-SkyBlue-500" />
        </div>
      </DashboardShell>
    );
  }

  if (!isMaster) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full">
          <PageHeader variant="fiori" title="Limpar logs" subtitle="Utilitários" backHref="/" />
          <AccessDeniedScreen />
        </div>
      </DashboardShell>
    );
  }

  if (!projectId) {
    return null;
  }

  return (
    <DashboardShell noPadding>
      <div className="flex flex-col flex-1 min-h-[calc(100dvh-4rem)]">
        <PageHeader
          variant="fiori"
          title="Limpar logs"
          subtitle="Remoção irreversível dos logs de migração de uma mock"
          icon={<Trash2 className="w-5 h-5" aria-hidden />}
          empresa={getProjectCompanyName(projectData) ?? undefined}
          projectName={projectData?.name}
          backHref="/"
        />

        <div className="fiori-wizard-body custom-scrollbar">
          <div className="fiori-wizard-inner">
            <section className="fiori-wizard-panel">
              <h2 className="fiori-wizard-panel-title">
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Limpar logs de um mock
              </h2>
              <p className="fiori-wizard-panel-desc">
                Selecione a mock do projeto atual. Todos os registros em{' '}
                <span className="font-mono text-[0.6875rem]">migrationLogs</span> vinculados a ela
                serão excluídos permanentemente.
              </p>

              {isLoadingMocks ? (
                <div className="fiori-wizard-empty">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--fiori-brand)]" aria-hidden />
                  <p>Carregando mocks…</p>
                </div>
              ) : sortedMocks.length > 0 ? (
                <div className="fiori-wizard-chip-grid">
                  {sortedMocks.map((mock) => {
                    const isSelected = selectedMock === mock.id;
                    return (
                      <button
                        key={mock.id}
                        type="button"
                        onClick={() => {
                          setSelectedMock(mock.id);
                          setConfirmText('');
                          setLastResult(null);
                        }}
                        className={cn('fiori-chip', isSelected && 'fiori-chip-selected')}
                        aria-pressed={isSelected}
                      >
                        <span className="font-semibold">{mock.name}</span>
                        <span className="text-[0.6875rem] font-normal opacity-80 font-mono">{mock.id}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="fiori-wizard-empty">
                  <AlertTriangle className="w-6 h-6 text-[var(--fiori-label)]" aria-hidden />
                  <p>Nenhuma mock encontrada neste projeto.</p>
                </div>
              )}

              {selectedMock && (
                <div className="mt-4 space-y-4">
                  <div className="fiori-wizard-warning">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    <div>
                      <p className="fiori-wizard-warning-title">Ação irreversível</p>
                      <p className="fiori-wizard-warning-text">
                        Os logs de{' '}
                        <strong>{selectedMockData?.name ?? selectedMock}</strong> serão apagados e não
                        poderão ser recuperados.
                      </p>
                    </div>
                  </div>

                  <div className="fiori-form-field max-w-md">
                    <label className="fiori-field-label" htmlFor="limpar-logs-confirm">
                      Digite o ID do mock para confirmar
                    </label>
                    <input
                      id="limpar-logs-confirm"
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={selectedMock}
                      className={cn(
                        'fiori-input font-mono shadow-none',
                        confirmText && confirmText !== selectedMock && 'fiori-invalid',
                      )}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <p className="fiori-field-hint">
                      Informe exatamente o ID exibido no chip da mock selecionada.
                    </p>
                  </div>
                </div>
              )}

              {lastResult && (
                <div className="mt-4 flex items-start gap-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <p className="text-[0.75rem] font-semibold text-emerald-800">Concluído</p>
                    <p className="text-[0.6875rem] text-emerald-700 mt-0.5">{lastResult.message}</p>
                  </div>
                </div>
              )}

              <div className="fiori-wizard-footer">
                <Link href="/" className="fiori-wizard-btn fiori-wizard-btn--ghost">
                  Fechar
                </Link>
                <button
                  type="button"
                  className="fiori-wizard-btn fiori-wizard-btn--emphasized !bg-[var(--fiori-negative,#bb0000)] hover:!bg-[#a30000]"
                  onClick={handleClearLogs}
                  disabled={!selectedMock || isClearing || confirmText !== selectedMock}
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                      Limpando logs…
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" aria-hidden />
                      Limpar logs
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
