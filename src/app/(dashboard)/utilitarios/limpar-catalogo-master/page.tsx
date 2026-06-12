'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { AccessDeniedScreen } from '@/components/usuarios';
import { useToast } from '@/hooks/use-toast';
import { useUsersData } from '@/hooks/use-users-data';
import { useActiveProjectId } from '@/hooks/use-active-project-id';
import { getProjectCompanyName } from '@/lib/migration/project-company';
import { safeRouterReplace, useRouterReady } from '@/lib/navigation/safe-router';
import { Loader2, Trash2, AlertTriangle, CheckCircle2, Search, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/migration';

type PreviewResult = {
  scanned: number;
  wouldDelete: number;
  byStatus: Record<string, number>;
  sample: { id: string; name: string; status: string }[];
};

type ExecuteResult = {
  scanned: number;
  deletedCount: number;
  byStatus: Record<string, number>;
};

export default function LimparCatalogoMasterPage() {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const isRouterReady = useRouterReady();
  const { projectId } = useActiveProjectId();
  const { isMaster, isProfileLoading } = useUsersData('');
  const { toast } = useToast();

  const projectRef = useMemoFirebase(
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
    const token = await auth?.currentUser?.getIdToken(true);
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    return token;
  }, [auth]);

  const callApi = useCallback(
    async (dryRun: boolean) => {
      const callerToken = await getToken();
      const res = await fetch('/api/admin/clean-master-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerToken, confirm: true, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na operação.');
      return data;
    },
    [getToken],
  );

  const handlePreview = async () => {
    setIsPreviewing(true);
    setLastResult(null);
    try {
      const data = await callApi(true);
      setPreview({
        scanned: data.scanned,
        wouldDelete: data.wouldDelete,
        byStatus: data.byStatus || {},
        sample: data.sample || [],
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
        deletedCount: data.deletedCount,
        byStatus: data.byStatus || {},
      });
      setPreview(null);
      setConfirmText('');
      toast({
        title: 'Catálogo atualizado',
        description: `${data.deletedCount} objeto(s) removido(s).`,
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

  if (!isMaster) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full">
          <PageHeader
            variant="fiori"
            title="Limpar catálogo mestre"
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
    <DashboardShell noPadding>
      <div className="flex flex-col flex-1 min-h-[calc(100dvh-4rem)]">
        <PageHeader
          variant="fiori"
          title="Limpar catálogo mestre"
          subtitle="Remoção de objetos com status inválido em masterObjects"
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
                Remover status inválidos
              </h2>
              <p className="fiori-wizard-panel-desc">
                Exclui permanentemente objetos em{' '}
                <span className="font-mono text-[0.6875rem]">masterObjects</span> cujo status não seja{' '}
                <strong>ATIVO</strong> nem <strong>INATIVO</strong> (ex.: LEGACY). Objetos sem status são
                tratados como ATIVO e mantidos.
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

              {preview && (
                <div className="mt-4 space-y-3 rounded border border-[var(--fiori-border-light)] bg-[#fafafa] p-3">
                  <p className="text-[0.75rem] font-semibold text-[var(--fiori-text)]">
                    Varridos: {preview.scanned.toLocaleString('pt-BR')} · A remover:{' '}
                    {preview.wouldDelete.toLocaleString('pt-BR')}
                  </p>
                  {Object.entries(preview.byStatus).map(([status, count]) => (
                    <p key={status} className="text-[0.6875rem] text-[var(--fiori-label)]">
                      Status <span className="font-mono text-[var(--fiori-text)]">{status}</span>:{' '}
                      {count.toLocaleString('pt-BR')}
                    </p>
                  ))}
                  {preview.sample.length > 0 && (
                    <ul className="max-h-40 overflow-y-auto space-y-0.5 text-[0.6875rem] font-mono text-[var(--fiori-label)]">
                      {preview.sample.map((row) => (
                        <li key={row.id}>
                          {row.name} ({row.status})
                        </li>
                      ))}
                    </ul>
                  )}
                  {preview.wouldDelete === 0 && (
                    <p className="flex items-center gap-1.5 text-[0.6875rem] text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
                      Nenhum objeto fora de ATIVO/INATIVO no catálogo.
                    </p>
                  )}
                </div>
              )}

              {preview && preview.wouldDelete > 0 && (
                <div className="mt-4 space-y-4">
                  <div className="fiori-wizard-warning">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    <div>
                      <p className="fiori-wizard-warning-title">Ação irreversível</p>
                      <p className="fiori-wizard-warning-text">
                        Digite <strong className="font-mono">REMOVER</strong> para confirmar a exclusão de{' '}
                        {preview.wouldDelete.toLocaleString('pt-BR')} objeto(s).
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
                <div className="mt-4 flex items-start gap-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <p className="text-[0.75rem] font-semibold text-emerald-800">Concluído</p>
                    <p className="text-[0.6875rem] text-emerald-700 mt-0.5">
                      {lastResult.deletedCount.toLocaleString('pt-BR')} removido(s) de{' '}
                      {lastResult.scanned.toLocaleString('pt-BR')} varrido(s).
                    </p>
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
                      Remover do catálogo
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
