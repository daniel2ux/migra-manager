'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useUser, useDb, useDoc, useMemoDb } from '@/supabase';
import { doc } from '@/supabase/compat-db-shim';
import { AccessDeniedScreen } from '@/components/usuarios';
import { useToast } from '@/hooks/use-toast';
import { useUsersData } from '@/hooks/use-users-data';
import { useActiveProjectId } from '@/hooks/use-active-project-id';
import { getProjectCompanyName } from '@/lib/migration/project-company';
import { safeRouterReplace, useRouterReady } from '@/lib/navigation/safe-router';
import { Loader2, Trash2, AlertTriangle, CheckCircle2, Search, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/migration';

type PreviewRow = {
  id: string;
  name: string;
  objectCount: number;
  logCount: number;
};

type PreviewResult = {
  scanned: number;
  wouldDelete: number;
  totalObjects: number;
  totalLogs: number;
  sample: PreviewRow[];
  serverDurationMs?: number;
};

type ExecuteResult = {
  scanned: number;
  deletedCount: number;
  deletedLogs: number;
  deletedLocks: number;
  totalObjects: number;
  totalLogs: number;
};

export default function LimparCatalogoMasterPage() {
  const { user } = useUser();
  const db = useDb();
  const router = useRouter();
  const isRouterReady = useRouterReady();
  const { projectId } = useActiveProjectId();
  const { can, isProfileLoading } = useUsersData('');
  const canCleanCatalog = can('utilities.clean_catalog');
  const { toast } = useToast();

  const projectRef = useMemoDb(
    () => (db && projectId ? doc(db, 'projects', projectId) : null),
    [db, projectId],
  );
  const { data: projectData } = useDoc<Project>(projectRef);

  useEffect(() => {
    if (!isRouterReady || projectId) return;
    safeRouterReplace(router, '/projetos');
  }, [isRouterReady, projectId, router]);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [lastResult, setLastResult] = useState<ExecuteResult | null>(null);

  const getToken = useCallback(async (): Promise<string> => {
    const token = await user?.getIdToken(true);
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    return token;
  }, [user]);

  const callApi = useCallback(
    async (dryRun: boolean) => {
      if (!projectId) throw new Error('Selecione um projeto antes de continuar.');
      const callerToken = await getToken();
      const res = await fetch('/api/admin/clean-master-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerToken, projectId, confirm: true, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na operação.');
      return data;
    },
    [getToken, projectId],
  );

  const handlePreview = async () => {
    setIsPreviewing(true);
    setLastResult(null);
    try {
      const data = await callApi(true);
      setPreview({
        scanned: data.scanned,
        wouldDelete: data.wouldDelete,
        totalObjects: data.totalObjects ?? 0,
        totalLogs: data.totalLogs ?? 0,
        sample: data.sample || [],
        serverDurationMs: data.serverDurationMs,
      });
      setConfirmText('');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro na pré-visualização',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecute = async () => {
    if (confirmText.trim().toUpperCase() !== 'REMOVER') return;
    setIsExecuting(true);
    try {
      const data = await callApi(false);
      setLastResult({
        scanned: data.scanned,
        deletedCount: data.deletedCount ?? data.deletedMocks ?? 0,
        deletedLogs: data.deletedLogs ?? 0,
        deletedLocks: data.deletedLocks ?? 0,
        totalObjects: data.totalObjects ?? 0,
        totalLogs: data.totalLogs ?? 0,
      });
      setPreview(null);
      setConfirmText('');
      toast({
        title: 'Limpeza concluída',
        description: `${data.deletedCount ?? data.deletedMocks ?? 0} mock(s) inativa(s) removida(s) permanentemente.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsExecuting(false);
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

  if (!canCleanCatalog) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full">
          <PageHeader
            variant="fiori"
            title="Limpar catálogo"
            subtitle="Utilitários"
            backHref="/"
          />
          <AccessDeniedScreen />
        </div>
      </DashboardShell>
    );
  }

  if (!projectId) {
    return null;
  }

  return (
    <div className="fiori-wizard-page--fullscreen">
      <PageHeader
        variant="fiori"
        title="Limpar catálogo"
        subtitle="Exclusão permanente de mocks inativas do projeto"
        icon={<Database className="w-5 h-5" aria-hidden />}
        empresa={getProjectCompanyName(projectData) ?? undefined}
        projectName={projectData?.name}
        backHref="/"
      />

      <div className="fiori-wizard-body custom-scrollbar">
        <div className="fiori-wizard-inner">
          <section className="fiori-wizard-panel">
              <h2 className="fiori-wizard-panel-title">
                <Database className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Remover mocks inativas
              </h2>
              <p className="fiori-wizard-panel-desc">
                Exclui permanentemente do banco todas as mocks com status <strong>Inativo</strong> no
                projeto atual, incluindo objetos de migração, comentários, logs técnicos e bloqueios de
                edição associados. Mocks ativas não são afetadas.
              </p>

              <div className="fiori-backup-type-row">
                <button
                  type="button"
                  className="fiori-wizard-btn fiori-wizard-btn--emphasized"
                  onClick={handlePreview}
                  disabled={isPreviewing || isExecuting}
                >
                  {isPreviewing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                      Analisando…
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" aria-hidden />
                      Pré-visualizar
                    </>
                  )}
                </button>
              </div>

              <div className="fiori-wizard-panel-body custom-scrollbar">
                {!preview && !lastResult && !isPreviewing && (
                  <div className="fiori-wizard-empty">
                    <Search className="w-6 h-6 text-[var(--fiori-label)]" aria-hidden />
                    <p>Clique em Pré-visualizar para analisar mocks inativas neste projeto.</p>
                  </div>
                )}

                {isPreviewing && !preview && (
                  <div className="fiori-wizard-empty">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--fiori-brand)]" aria-hidden />
                    <p>Analisando mocks inativas…</p>
                  </div>
                )}

                {preview && (
                  <div className="flex flex-col flex-1 min-h-0 gap-3 rounded border border-[var(--fiori-border-light)] bg-[#fafafa] p-3">
                    <p className="text-[0.75rem] font-semibold text-[var(--fiori-text)] shrink-0">
                      Mocks no projeto: {preview.scanned.toLocaleString('pt-BR')} · Inativas a remover:{' '}
                      {preview.wouldDelete.toLocaleString('pt-BR')}
                    </p>
                    {preview.wouldDelete > 0 && (
                      <p className="text-[0.6875rem] text-[var(--fiori-label)] shrink-0">
                        Objetos: {preview.totalObjects.toLocaleString('pt-BR')} · Logs:{' '}
                        {preview.totalLogs.toLocaleString('pt-BR')}
                        {preview.serverDurationMs != null && (
                          <> · Análise: {preview.serverDurationMs.toLocaleString('pt-BR')} ms</>
                        )}
                      </p>
                    )}
                    {preview.sample.length > 0 && (
                      <ul className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-0.5 text-[0.6875rem] font-mono text-[var(--fiori-label)]">
                        {preview.sample.map((row) => (
                          <li key={row.id}>
                            {row.name} — {row.objectCount} obj., {row.logCount} logs
                          </li>
                        ))}
                      </ul>
                    )}
                    {preview.wouldDelete === 0 && (
                      <p className="flex items-center gap-1.5 text-[0.6875rem] text-emerald-700 shrink-0">
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
                        Nenhuma mock inativa neste projeto.
                      </p>
                    )}
                  </div>
                )}

                {preview && preview.wouldDelete > 0 && (
                  <div className="space-y-4 shrink-0">
                    <div className="fiori-wizard-warning">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      <div>
                        <p className="fiori-wizard-warning-title">Ação irreversível</p>
                        <p className="fiori-wizard-warning-text">
                          Digite <strong className="font-mono">REMOVER</strong> para confirmar a exclusão de{' '}
                          {preview.wouldDelete.toLocaleString('pt-BR')} mock(s) inativa(s),{' '}
                          {preview.totalObjects.toLocaleString('pt-BR')} objeto(s) e{' '}
                          {preview.totalLogs.toLocaleString('pt-BR')} log(s).
                        </p>
                      </div>
                    </div>

                    <div className="fiori-form-field max-w-md">
                      <label className="fiori-field-label" htmlFor="limpar-catalogo-confirm">
                        Confirmação
                      </label>
                      <input
                        id="limpar-catalogo-confirm"
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="REMOVER"
                        className={cn(
                          'fiori-input font-mono uppercase shadow-none',
                          confirmText &&
                            confirmText.trim().toUpperCase() !== 'REMOVER' &&
                            'fiori-invalid',
                        )}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <p className="fiori-field-hint">Digite exatamente REMOVER para habilitar a remoção.</p>
                    </div>
                  </div>
                )}

                {lastResult && (
                  <div className="flex items-start gap-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden />
                    <div>
                      <p className="text-[0.75rem] font-semibold text-emerald-800">Concluído</p>
                      <p className="text-[0.6875rem] text-emerald-700 mt-0.5">
                        {lastResult.deletedCount.toLocaleString('pt-BR')} mock(s),{' '}
                        {lastResult.totalObjects.toLocaleString('pt-BR')} objeto(s),{' '}
                        {lastResult.deletedLogs.toLocaleString('pt-BR')} log(s) e{' '}
                        {lastResult.deletedLocks.toLocaleString('pt-BR')} bloqueio(s) removidos.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="fiori-wizard-footer">
                <Link href="/" className="fiori-wizard-btn fiori-wizard-btn--ghost">
                  Fechar
                </Link>
                <button
                  type="button"
                  className="fiori-wizard-btn fiori-wizard-btn--emphasized !bg-[var(--fiori-negative,#bb0000)] hover:!bg-[#a30000]"
                  disabled={
                    !preview ||
                    preview.wouldDelete === 0 ||
                    confirmText.trim().toUpperCase() !== 'REMOVER' ||
                    isExecuting
                  }
                  onClick={handleExecute}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                      Removendo…
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" aria-hidden />
                      Remover mocks inativas
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        </div>
    </div>
  );
}
