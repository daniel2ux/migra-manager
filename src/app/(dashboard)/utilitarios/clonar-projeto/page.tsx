"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { useDb, useUser } from "@/supabase/provider";
import {
  collection,
  query,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
} from "@/supabase/compat-db-shim";
import { 
  Loader2, 
  Copy, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUsersData } from "@/hooks/use-users-data";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { AccessDeniedScreen } from "@/components/usuarios";
import { cn } from "@/lib/utils";
import type { Project, Mock } from "@/types/migration";

type Step = 1 | 2 | 3 | 4;

const WIZARD_STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "Projeto origem" },
  { id: 2, label: "Mock de referência" },
  { id: 3, label: "Novo projeto" },
  { id: 4, label: "Concluído" },
];

function WizardStepsNav({ step }: { step: Step }) {
  return (
    <nav className="fiori-wizard-steps fiori-wizard-steps--header" aria-label="Progresso do assistente">
      {WIZARD_STEPS.map(({ id, label }, index) => (
        <div key={id} className="fiori-wizard-step-wrap">
          <div
            className={cn(
              "fiori-wizard-step",
              step === id && "fiori-wizard-step--active",
              step > id && "fiori-wizard-step--done",
            )}
            aria-current={step === id ? "step" : undefined}
          >
            <span className="fiori-wizard-step-marker">
              {step > id ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> : id}
            </span>
            <span className="fiori-wizard-step-label">{label}</span>
          </div>
          {index < WIZARD_STEPS.length - 1 && (
            <div
              className={cn(
                "fiori-wizard-step-connector",
                step > id && "fiori-wizard-step-connector--done",
              )}
              aria-hidden
            />
          )}
        </div>
      ))}
    </nav>
  );
}

export default function ClonarProjetoPage() {
  const db = useDb();
  const { user } = useUser();
  const { toast } = useToast();
  const { isAdmin, isProfileLoading } = useUsersData("");
  const { projectId: activeProjectId } = useActiveProjectId();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false);

  // Step 1: Source Project
  const [searchSource, setSearchSource] = useState("");
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [hasSearchedProjects, setHasSearchedProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Step 2: Source Mock
  const [mocksList, setMocksList] = useState<Mock[]>([]);
  const [selectedMock, setSelectedMock] = useState<Mock | null>(null);

  // Step 3: New Project Data
  const [newProjectData, setNewProjectData] = useState({
    name: "",
    client: "",
    sigla: "",
    description: ""
  });

  // Pré-seleciona projeto ativo da sessão, se disponível
  useEffect(() => {
    const handleActiveProject = async () => {
      if (!db || !activeProjectId || selectedProject) return;
      try {
        const docRef = doc(db, "projects", activeProjectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const proj = { id: docSnap.id, ...docSnap.data() } as Project;
          setSelectedProject(proj);
          setStep(2);
        }
      } catch (error) {
        console.error("Erro ao carregar projeto ativo:", error);
      }
    };
    void handleActiveProject();
  }, [db, activeProjectId, selectedProject]);

  const fetchProjects = useCallback(async (filter?: string) => {
    if (!db) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, "projects")));
      let list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
      const term = (filter ?? "").trim().toLowerCase();
      if (term) {
        list = list.filter((p) => {
          const company = (p.company ?? p.empresa ?? "").toLowerCase();
          return (
            p.name.toLowerCase().includes(term) ||
            p.id.toLowerCase().includes(term) ||
            company.includes(term)
          );
        });
      }
      setProjectsList(list);
    } catch (_error) {
      toast({ variant: "destructive", description: "Erro ao buscar projetos." });
    } finally {
      setLoading(false);
    }
  }, [db, toast]);

  const handleSearchProjects = () => {
    setHasSearchedProjects(true);
    fetchProjects(searchSource);
  };

  // Fetch mocks for Step 2
  useEffect(() => {
    const fetchMocks = async () => {
      if (!db || !selectedProject) return;
      setLoading(true);
      try {
        const projectId = selectedProject.id;
        const mocksSnapshot = await getDocs(query(collection(db, "projects", projectId, "mocks")));

        const list = await Promise.all(
          mocksSnapshot.docs.map(async (mockDoc) => {
            const mock = { id: mockDoc.id, ...mockDoc.data() } as Mock;
            const objectsSnapshot = await getDocs(
              collection(db, "projects", projectId, "mocks", mockDoc.id, "migrationObjects"),
            );
            return {
              ...mock,
              quantityExistingObjects: objectsSnapshot.size,
            };
          }),
        );

        setMocksList(list);
      } catch (error) {
        console.error("Erro CompatDb Mocks:", error);
        toast({ variant: "destructive", description: "Erro ao buscar mocks." });
      } finally {
        setLoading(false);
      }
    };

    if (step === 2 && selectedProject) {
      fetchMocks();
    }
  }, [step, selectedProject, db, toast]);

  // Execute Cloning
  const handleClone = async () => {
    if (!db || !selectedMock || !selectedProject) return;
    setCloning(true);
    try {
      // 1. Get Masters ONLY
      const usersSnap = await getDocs(collection(db, "users"));
      const masterUids = usersSnap.docs
        .map(d => d.data())
        .filter(u => u.role === 'master' || u.isMaster === true)
        .map(u => u.uid);

      // 2. Create Project (Root)
      const projectRef = await addDoc(collection(db, "projects"), {
        name: newProjectData.name,
        empresa: newProjectData.client,
        sigla: newProjectData.sigla,
        description: newProjectData.description,
        memberUids: masterUids.length > 0 ? masterUids : [user?.uid], // Fallback only if no master found
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        isLocked: false
      });

      // 3. Create Mock MOCK-01 (Subcollection of new project)
      const mockRef = await addDoc(collection(db, "projects", projectRef.id, "mocks"), {
        id: "mock-01", // Some parts of the system use custom IDs
        projectId: projectRef.id,
        name: "MOCK-01",
        slug: "mock-01",
        description: "Mock clonado da estrutura original " + selectedMock.name,
        isLocked: false,
        quantityExistingObjects: selectedMock.quantityExistingObjects || 0,
        createdAt: serverTimestamp()
      });

      // 4. Clone Objects (Structure Only) - from subcollection of source mock
      const objectsSnap = await getDocs(
        collection(db, "projects", selectedProject.id, "mocks", selectedMock.id, "migrationObjects")
      );

      const oldToNewIdMap: Record<string, string> = {};
      const sourceObjects = objectsSnap.docs.map(d => ({ ...d.data(), oldId: d.id } as any));

      // First pass: Create objects in subcollection of new mock
      for (const obj of sourceObjects) {
        const { oldId, ...cleanData } = obj;
        const newObjRef = await addDoc(
          collection(db, "projects", projectRef.id, "mocks", mockRef.id, "migrationObjects"), 
          {
            ...cleanData,
            projectId: projectRef.id,
            mockId: mockRef.id,
            // Reset transactional data
            status: "PENDENTE",
            targetRecordsCount: 0,
            processedRecordsCount: 0,
            migratedRecordsCount: 0,
            successfulRecordsCount: 0,
            errorRecordsCount: 0,
            currentChargeDurationMs: 0,
            chargeStartTime: "",
            chargeEndTime: "",
            loadHistory: [],
            createdAt: serverTimestamp()
          }
        );
        oldToNewIdMap[oldId] = newObjRef.id;
      }

      setStep(4);
      toast({ description: "Projeto clonado com sucesso!" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", description: "Ocorreu um erro durante a clonagem." });
    } finally {
      setCloning(false);
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

  if (!isAdmin) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full">
          <PageHeader variant="fiori" title="Clonar projeto" subtitle="Utilitários" backHref="/" />
          <AccessDeniedScreen />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell noPadding>
      <div className="flex flex-col flex-1 min-h-[calc(100dvh-4rem)]">
        <PageHeader
          variant="fiori"
          title="Clonar projeto"
          subtitle="Wizard de replicação de estrutura"
          icon={<Copy className="w-5 h-5" aria-hidden />}
          backHref="/"
          progress={<WizardStepsNav step={step} />}
        />

        <div className="fiori-wizard-body custom-scrollbar">
          <div className="fiori-wizard-inner">
            {step === 1 && (
              <section className="fiori-wizard-panel">
                <h2 className="fiori-wizard-panel-title">
                  <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Selecionar projeto origem
                </h2>
                <p className="fiori-wizard-panel-desc">
                  Clique em Buscar para listar os projetos. Opcionalmente, filtre por nome, empresa ou ID.
                </p>

                <div className="fiori-wizard-search-row">
                  <div className="fiori-search-shell fiori-wizard-search">
                    <Search className="fiori-search-icon" aria-hidden />
                    <input
                      type="search"
                      placeholder="Nome do projeto…"
                      value={searchSource}
                      onChange={(e) => setSearchSource(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchProjects()}
                      className="fiori-search-input shadow-none"
                      aria-label="Buscar projeto origem"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchProjects}
                    disabled={loading}
                    className="fiori-wizard-btn fiori-wizard-btn--emphasized shrink-0"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : "Buscar"}
                  </button>
                </div>

                {loading ? (
                  <div className="fiori-wizard-empty">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--fiori-brand)]" aria-hidden />
                    <p>Buscando projetos…</p>
                  </div>
                ) : !hasSearchedProjects ? (
                  <div className="fiori-wizard-empty">
                    <Search className="w-6 h-6 text-[var(--fiori-label)]" aria-hidden />
                    <p>Clique em Buscar para exibir os projetos disponíveis.</p>
                  </div>
                ) : projectsList.length > 0 ? (
                  <div className="fiori-wizard-chip-grid">
                    {[...projectsList]
                      .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, undefined, { numeric: true }))
                      .map((p) => {
                        const company = (p.company ?? p.empresa)?.trim();
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedProject(p)}
                            className={cn(
                              "fiori-chip",
                              selectedProject?.id === p.id && "fiori-chip-selected",
                            )}
                            aria-pressed={selectedProject?.id === p.id}
                          >
                            <span className="font-semibold">{p.name || p.id}</span>
                            <span className="text-[0.6875rem] font-normal opacity-80">
                              {company || p.id}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ) : searchSource.trim() ? (
                  <div className="fiori-wizard-empty">
                    <AlertCircle className="w-6 h-6 text-[var(--fiori-label)]" aria-hidden />
                    <p>Nenhum projeto encontrado para &quot;{searchSource.trim()}&quot;.</p>
                  </div>
                ) : (
                  <div className="fiori-wizard-empty">
                    <AlertCircle className="w-6 h-6 text-[var(--fiori-label)]" aria-hidden />
                    <p>Nenhum projeto disponível.</p>
                  </div>
                )}

                <div className="fiori-wizard-footer">
                  <Link href="/" className="fiori-wizard-btn fiori-wizard-btn--ghost">
                    Fechar
                  </Link>
                  <button
                    type="button"
                    disabled={!selectedProject}
                    onClick={() => setStep(2)}
                    className="fiori-wizard-btn fiori-wizard-btn--emphasized"
                  >
                    Próximo
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="fiori-wizard-panel">
                <h2 className="fiori-wizard-panel-title">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Selecionar mock de referência
                </h2>
                <p className="fiori-wizard-panel-desc">
                  O mock selecionado definirá a estrutura (objetos e dependências) do novo projeto.
                </p>

                {loading ? (
                  <div className="fiori-wizard-empty">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--fiori-brand)]" aria-hidden />
                    <p>Buscando mocks…</p>
                  </div>
                ) : mocksList.length > 0 ? (
                  <div className="fiori-wizard-chip-grid">
                    {[...mocksList]
                      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMock(m)}
                          className={cn(
                            "fiori-chip",
                            selectedMock?.id === m.id && "fiori-chip-selected",
                          )}
                        >
                          <span className="font-semibold">{m.name}</span>
                          <span className="text-[0.6875rem] font-normal opacity-80">
                            {m.quantityExistingObjects || 0} objetos
                          </span>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="fiori-wizard-empty">
                    <AlertCircle className="w-6 h-6 text-[var(--fiori-label)]" aria-hidden />
                    <p>Nenhum mock encontrado neste projeto de origem.</p>
                  </div>
                )}

                <div className="fiori-wizard-footer">
                  <button type="button" onClick={() => setStep(1)} className="fiori-wizard-btn fiori-wizard-btn--ghost">
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedMock}
                    onClick={() => setStep(3)}
                    className="fiori-wizard-btn fiori-wizard-btn--emphasized"
                  >
                    Próximo
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="fiori-wizard-panel">
                <h2 className="fiori-wizard-panel-title">
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Dados do novo projeto
                </h2>
                <p className="fiori-wizard-panel-desc">
                  Configure as informações básicas para a nova instância.
                </p>

                <div className="fiori-wizard-form-grid">
                  <div className="fiori-wizard-field">
                    <label htmlFor="clone-project-name" className="fiori-wizard-label">Nome do projeto</label>
                    <Input
                      id="clone-project-name"
                      placeholder="Ex: Migração SAP 2026"
                      value={newProjectData.name}
                      onChange={(e) => setNewProjectData((prev) => ({ ...prev, name: e.target.value.toUpperCase() }))}
                      className="fiori-wizard-input shadow-none"
                    />
                  </div>
                  <div className="fiori-wizard-field">
                    <label htmlFor="clone-project-client" className="fiori-wizard-label">Cliente / empresa</label>
                    <Input
                      id="clone-project-client"
                      placeholder="Ex: ABC Energia"
                      value={newProjectData.client}
                      onChange={(e) => setNewProjectData((prev) => ({ ...prev, client: e.target.value.toUpperCase() }))}
                      className="fiori-wizard-input shadow-none"
                    />
                  </div>
                  <div className="fiori-wizard-field">
                    <label htmlFor="clone-project-sigla" className="fiori-wizard-label">Sigla do projeto</label>
                    <Input
                      id="clone-project-sigla"
                      placeholder="Ex: SAP-BCK"
                      value={newProjectData.sigla}
                      onChange={(e) => setNewProjectData((prev) => ({ ...prev, sigla: e.target.value.toUpperCase() }))}
                      className="fiori-wizard-input shadow-none"
                    />
                  </div>
                  <div className="fiori-wizard-field">
                    <label htmlFor="clone-project-desc" className="fiori-wizard-label">Descrição</label>
                    <Input
                      id="clone-project-desc"
                      placeholder="Breve descrição do projeto"
                      value={newProjectData.description}
                      onChange={(e) => setNewProjectData((prev) => ({ ...prev, description: e.target.value }))}
                      className="fiori-wizard-input shadow-none"
                    />
                  </div>
                </div>

                <div className="fiori-wizard-warning">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  <div>
                    <p className="fiori-wizard-warning-title">Aviso de segurança</p>
                    <p className="fiori-wizard-warning-text">
                      Este processo criará um novo projeto com o mock <strong>MOCK-01</strong>.
                      Nenhuma informação transacional (logs, arquivos, histórico de carga) será copiada.
                      O acesso ficará restrito inicialmente a perfis Admin e Master.
                    </p>
                  </div>
                </div>

                <div className="fiori-wizard-footer">
                  <button type="button" onClick={() => setStep(2)} className="fiori-wizard-btn fiori-wizard-btn--ghost">
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!newProjectData.name || !newProjectData.client || !newProjectData.sigla || cloning}
                    onClick={handleClone}
                    className="fiori-wizard-btn fiori-wizard-btn--success"
                  >
                    {cloning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden />
                    )}
                    Confirmar e clonar
                  </button>
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="fiori-wizard-panel fiori-wizard-panel--success">
                <div className="fiori-wizard-success-icon">
                  <CheckCircle2 className="w-10 h-10 text-[#107e3e]" aria-hidden />
                </div>
                <h2 className="fiori-wizard-success-title">Clone concluído com sucesso</h2>
                <p className="fiori-wizard-success-desc">
                  O projeto <strong>{newProjectData.name}</strong> foi criado. A estrutura foi replicada
                  para o <strong>MOCK-01</strong> e as permissões de acesso foram configuradas.
                </p>

                <div className="fiori-wizard-success-actions">
                  <a href="/projetos" className="fiori-wizard-btn fiori-wizard-btn--emphasized">
                    Ir para projetos
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setSelectedProject(null);
                      setSelectedMock(null);
                      setNewProjectData({ name: "", client: "", sigla: "", description: "" });
                    }}
                    className="fiori-wizard-btn fiori-wizard-btn--ghost"
                  >
                    Clonar outro projeto
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
