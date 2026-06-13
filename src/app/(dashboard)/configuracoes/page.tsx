"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useDb, useUser, useDoc, useMemoDb } from "@/supabase";
import { doc, setDoc, type CompatDb } from "@/supabase/compat-db-shim";
import { PageHeader } from "@/components/layout/page-header";
import { FileAliasesManager } from "@/components/configuracoes/file-aliases-manager";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { getProjectCompanyName } from "@/lib/migration/project-company";
import type { Project } from "@/types/migration";
import {
  ShieldAlert, Loader2, CheckCircle2, Save,
  Mail,
  FileText,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { UserProfile } from "@/types/usuarios";
import { formatNumber, unformatNumber } from "@/lib/formatters";

export default function ConfiguracoesPage() {
  const db = useDb();
  const { user } = useUser();
  const { toast } = useToast();

  const userDocRef = useMemoDb(
    () => (user && db ? doc(db, "users", user.uid) : null),
    [db, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const smtpDocRef = useMemoDb(() => (db ? doc(db, "appConfig", "smtpConfig") : null), [db]);
  const { data: smtpData } = useDoc<any>(smtpDocRef);

  const settingsDocRef = useMemoDb(() => (db ? doc(db, "appConfig", "settings") : null), [db]);
  const { data: settingsData } = useDoc<any>(settingsDocRef);

  const { projectId } = useActiveProjectId();
  const projectRef = useMemoDb(
    () => (db && projectId ? doc(db, "projects", projectId) : null),
    [db, projectId],
  );
  const { data: projectData } = useDoc<Project>(projectRef);

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [savedSmtp, setSavedSmtp] = useState(false);

  const [maxImportLines, setMaxImportLines] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  const isMaster =
    userProfile?.role?.toLowerCase() === "master" ||
    userProfile?.isMaster === true;

  useEffect(() => {
    if (smtpData) {
      const port = Number(smtpData.port) || 587;
      setSmtpHost(smtpData.host ?? "");
      setSmtpPort(String(port));
      setSmtpSecure(port === 465 ? true : port === 587 ? false : (smtpData.secure ?? false));
      setSmtpUser(smtpData.user ?? "");
      setSmtpPass(smtpData.pass ?? "");
    }
  }, [smtpData]);

  const handleSmtpPortChange = (value: string) => {
    setSmtpPort(value);
    const port = parseInt(value, 10);
    if (port === 465) setSmtpSecure(true);
    else if (port === 587) setSmtpSecure(false);
  };

  useEffect(() => {
    if (settingsData) {
      setMaxImportLines(
        settingsData.maxImportLines
          ? formatNumber(settingsData.maxImportLines, false)
          : ""
      );
    }
  }, [settingsData]);

  const handleMaxImportLinesChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setMaxImportLines("");
      return;
    }
    setMaxImportLines(formatNumber(parseInt(digits, 10), false));
  };

  const handleSaveSmtp = async () => {
    if (!smtpHost.trim() || !smtpUser.trim() || !smtpPass.trim()) {
      toast({ variant: "destructive", description: "Preencha host, usuário e senha." });
      return;
    }
    setIsSavingSmtp(true);
    setSavedSmtp(false);
    try {
      const port = parseInt(smtpPort, 10) || 587;
      const secure = port === 465 ? true : port === 587 ? false : smtpSecure;
      await setDoc(doc(db as CompatDb, "appConfig", "smtpConfig"), {
        host: smtpHost.trim(),
        port,
        secure,
        user: smtpUser.trim(),
        pass: smtpPass,
        updatedAt: new Date().toISOString(),
        updatedByUid: user?.uid ?? "",
      });
      setSavedSmtp(true);
      // toast({ description: "Configuração SMTP salva." });
      setTimeout(() => setSavedSmtp(false), 3000);
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar configuração SMTP." });
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSavedSettings(false);
    try {
      const maxLines = maxImportLines.trim() ? unformatNumber(maxImportLines) : undefined;
      await setDoc(doc(db as CompatDb, "appConfig", "settings"), {
        maxImportLines: maxLines,
        updatedAt: new Date().toISOString(),
        updatedByUid: user?.uid ?? "",
      }, { merge: true });
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 3000);
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar configurações." });
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (!isMaster) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full">
          <PageHeader
            variant="fiori"
            title="Configurações"
            subtitle="Parâmetros do sistema"
            icon={<Settings className="w-5 h-5" aria-hidden />}
            empresa={getProjectCompanyName(projectData) ?? undefined}
            projectName={projectData?.name}
            backHref="/"
          />
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-5 max-w-md w-full">
              <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-black text-red-700 uppercase tracking-widest">Acesso Restrito</p>
                <p className="text-[10px] text-red-600 mt-1">Esta página está disponível apenas para usuários com perfil Master.</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell noPadding>
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 w-full flex-col overflow-hidden bg-slate-50/30">
        <PageHeader
          variant="fiori"
          title="Configurações"
          subtitle="Parâmetros do sistema"
          icon={<Settings className="w-5 h-5" aria-hidden />}
          empresa={getProjectCompanyName(projectData) ?? undefined}
          projectName={projectData?.name}
          backHref="/"
        />

        <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-8 md:py-6">
          {isMaster && (
            <div className="fiori-settings-page mx-auto w-full max-w-2xl">
              <section className="fiori-settings-panel">
                <header className="fiori-settings-panel-header fiori-settings-panel-header--actions">
                  <div className="fiori-settings-panel-header-main">
                    <Mail aria-hidden />
                    <h2 className="fiori-settings-panel-title">Configuração SMTP</h2>
                  </div>
                  <div className="fiori-settings-panel-header-actions">
                    <button
                      type="button"
                      onClick={handleSaveSmtp}
                      disabled={isSavingSmtp}
                      className="fiori-btn-transparent fiori-settings-panel-header-btn"
                    >
                      {isSavingSmtp ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Salvando…</>
                      ) : savedSmtp ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Salvo</>
                      ) : (
                        <><Save className="h-3.5 w-3.5" aria-hidden /> Salvar</>
                      )}
                    </button>
                  </div>
                </header>
                <div className="fiori-settings-panel-body space-y-4">
                  <p className="fiori-field-hint">
                    Credenciais do servidor de e-mail utilizadas para envio direto de estatísticas de carga.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="fiori-form-field col-span-2 md:col-span-1">
                      <label className="fiori-field-label" htmlFor="smtp-host">Host SMTP</label>
                      <Input
                        id="smtp-host"
                        value={smtpHost}
                        onChange={e => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="fiori-input shadow-none"
                      />
                    </div>
                    <div className="fiori-form-field">
                      <label className="fiori-field-label" htmlFor="smtp-port">Porta</label>
                      <Input
                        id="smtp-port"
                        value={smtpPort}
                        onChange={e => handleSmtpPortChange(e.target.value)}
                        placeholder="587"
                        className="fiori-input shadow-none"
                      />
                    </div>
                    <div className="fiori-form-field col-span-2 md:col-span-1">
                      <label className="fiori-field-label" htmlFor="smtp-user">Usuário</label>
                      <Input
                        id="smtp-user"
                        value={smtpUser}
                        onChange={e => setSmtpUser(e.target.value)}
                        placeholder="usuario@empresa.com"
                        className="fiori-input shadow-none"
                      />
                    </div>
                    <div className="fiori-form-field col-span-2 md:col-span-1">
                      <label className="fiori-field-label" htmlFor="smtp-pass">Senha</label>
                      <div className="relative">
                        <Input
                          id="smtp-pass"
                          type={showSmtpPass ? "text" : "password"}
                          value={smtpPass}
                          onChange={e => setSmtpPass(e.target.value)}
                          placeholder="••••••••"
                          className="fiori-input shadow-none pr-9"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPass((v) => !v)}
                          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-[var(--fiori-label)] transition-colors hover:bg-[#f5f6f7] hover:text-[var(--fiori-text)]"
                          aria-label={showSmtpPass ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showSmtpPass ? (
                            <EyeOff className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="fiori-settings-switch-row">
                    <div>
                      <label className="fiori-field-label" htmlFor="ssl-tls">SSL/TLS (porta 465)</label>
                      <p className="fiori-field-hint mt-0.5">Habilitar conexão segura para servidores na porta 465</p>
                    </div>
                    <Switch
                      id="ssl-tls"
                      className="fiori-switch"
                      checked={smtpSecure}
                      onCheckedChange={(checked) => setSmtpSecure(checked)}
                    />
                  </div>
                </div>
              </section>

              <FileAliasesManager className="fiori-settings-panel--fill" />

              <section className="fiori-settings-panel">
                <header className="fiori-settings-panel-header fiori-settings-panel-header--actions">
                  <div className="fiori-settings-panel-header-main">
                    <FileText aria-hidden />
                    <h2 className="fiori-settings-panel-title">Limite de importação de logs</h2>
                  </div>
                  <div className="fiori-settings-panel-header-actions">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="fiori-btn-transparent fiori-settings-panel-header-btn"
                    >
                      {isSavingSettings ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Salvando…</>
                      ) : savedSettings ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Salvo</>
                      ) : (
                        <><Save className="h-3.5 w-3.5" aria-hidden /> Salvar</>
                      )}
                    </button>
                  </div>
                </header>
                <div className="fiori-settings-panel-body space-y-4">
                  <p className="fiori-field-hint">
                    Define a quantidade máxima de linhas processadas na importação de logs técnicos (.err/.log).
                    Este limite protege contra cargas acidentais com volume excessivo. Deixe vazio para sem limite.
                  </p>
                  <div className="fiori-form-field">
                    <label className="fiori-field-label" htmlFor="max-import-lines">Máximo de linhas</label>
                    <Input
                      id="max-import-lines"
                      type="text"
                      inputMode="numeric"
                      value={maxImportLines}
                      onChange={(e) => handleMaxImportLinesChange(e.target.value)}
                      onBlur={() => {
                        if (maxImportLines.trim()) {
                          setMaxImportLines(formatNumber(unformatNumber(maxImportLines), false));
                        }
                      }}
                      placeholder="Ex.: 100.000 (deixe vazio para sem limite)"
                      className="fiori-input shadow-none"
                    />
                  </div>
                </div>
              </section>

              <aside className="fiori-settings-notes">
                <p className="fiori-settings-notes-title">Notas técnicas</p>
                <ul className="fiori-settings-notes-list">
                  <li>As configurações SMTP são utilizadas para envio direto de estatísticas de carga.</li>
                  <li>SSL/TLS deve ser habilitado para servidores que utilizam porta 465.</li>
                  <li>Alterações nas configurações são aplicadas imediatamente após salvar.</li>
                  <li>O mapeamento de arquivos permite associar nomes de objetos a padrões de nomes de arquivos diferentes (ex.: BILLEBF_MA → BILLDOCMA).</li>
                </ul>
              </aside>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
