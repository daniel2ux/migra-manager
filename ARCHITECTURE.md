# Arquitetura Técnica: Sistema Migra (v2.11)

> **Última Atualização**: Junho 2026 — Versão de Produção (v2.11)

Este documento descreve as decisões arquiteturais e a organização técnica do sistema de gestão de migrações IS-U.

---

## 🔗 Visão Geral do Sistema

O **Migra** é uma aplicação **SaaS Multi-tenant** (isolamento por projeto) focada no monitoramento de janelas de migração de dados SAP IS-U para os setores de Energia, Gás e Saneamento.

### Princípios de Design

1. **Separação de Preocupações**: Hooks para dados/ações, componentes para UI
2. **URL como Fonte de Verdade**: Contexto de navegação via search params
3. **Persistência Inteligente**: localStorage para preferências, Supabase Postgres para dados críticos
4. **Design System Premium BI**: Consistência visual absoluta em toda aplicação
5. **Segurança em Camadas**: Supabase Auth + RLS (Postgres) + service role nas API routes

---

## 💻 Tech Stack (v2.11)

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Framework** | Next.js 15 (App Router, Turbopack) | ^15.5.14 |
| **Linguagem** | TypeScript 5 (strict mode) | ^5 |
| **UI Runtime** | React | ^19.2.1 |
| **Backend** | Supabase (Auth + Postgres + Storage) | ^2.x |
| **Compat layer** | `@/supabase/*-shim` (API estilo documento) → Postgres | — |
| **IA** | Genkit (Google Gemini Pro/Flash) | ^1.16.1 |
| **Estilização** | Tailwind CSS + ShadCN UI | ^3.4.1 / v4 |
| **Visualização** | Recharts + @xyflow/react | ^2.15.1 / ^12.10.1 |
| **Drag & Drop** | @dnd-kit (Core, Sortable, Modifiers) | latest |
| **Formulários** | React Hook Form + Zod | ^7.54.2 / ^3.24.2 |
| **Animações** | Framer Motion | ^12.38.0 |
| **Virtualização** | @tanstack/react-virtual | ^3.13.23 |

---

## 🏛️ Estrutura do Repositório

```
src/
├── app/                              # Next.js 15 App Router
│   ├── (dashboard)/                  # Route group — Páginas autenticadas
│   │   ├── page.tsx                  # Dashboard principal (KPIs + gráficos)
│   │   ├── components/               # Componentes específicos do dashboard
│   │   │   ├── DashboardControlPanel.tsx
│   │   │   ├── ForceLockDialog.tsx
│   │   │   ├── ReportDialog.tsx
│   │   │   └── StatReportDialog.tsx
│   │   ├── mocks/                    # Gestão de mocks
│   │   │   ├── page.tsx              # Página principal (444 linhas)
│   │   │   └── components/           # Componentes locais
│   │   ├── objetos/                  # Catálogo de objetos
│   │   │   ├── page.tsx              # Lista de objetos
│   │   │   ├── components/           # Componentes locais (10 arquivos)
│   │   │   ├── hooks/                # Hooks locais (useObjectsPage)
│   │   │   └── [mockId]/             # Detalhes por mock
│   │   │       ├── page.tsx
│   │   │       ├── components/       # Componentes locais (10 arquivos)
│   │   │       ├── hooks/            # Hooks locais (useObjectImport)
│   │   │       └── types.ts
│   │   ├── projetos/                 # Gestão de projetos
│   │   ├── logs/                     # Logs técnicos
│   │   ├── relatorios/               # Relatórios de migração
│   │   ├── configuracoes/            # Configurações do sistema
│   │   │   └── emails/               # Gestão de e-mails
│   │   ├── grupos-atividade/         # Grupos de atividade
│   │   ├── usuarios/                 # Gestão de usuários
│   │   ├── perfis/                   # Perfis de acesso
│   │   ├── perfil/                   # Perfil do usuário
│   │   ├── alterar-senha/            # Alteração de senha
│   │   ├── sobre/                    # Sobre o produto
│   │   └── docs/                     # Documentação
│   ├── api/                          # API Routes (server-side)
│   │   ├── admin/                    # Ações administrativas
│   │   │   ├── change-role/route.ts  # Alterar papel
│   │   │   ├── clean-master-catalog/route.ts # Limpeza do catálogo mestre
│   │   │   ├── create-user/route.ts  # Criar usuário
│   │   │   ├── reset-password/route.ts # Resetar senha
│   │   │   └── session-action/route.ts # Ações de sessão
│   │   ├── ai/                       # Fluxos de IA (Genkit)
│   │   │   ├── description/route.ts
│   │   │   └── performance-analysis/route.ts
│   │   ├── backup/                   # Backup e restauração (create, list, restore, …)
│   │   ├── email/send/route.ts       # Envio de e-mail
│   │   ├── log-service/              # Serviço de logs
│   │   │   ├── clear-mock/route.ts
│   │   │   ├── import/route.ts
│   │   │   ├── import-upload/route.ts
│   │   │   ├── list/route.ts
│   │   │   └── preview/route.ts
│   │   └── user/update-password/route.ts
│   ├── login/                        # Autenticação
│   ├── register/                     # Registro
│   └── layout.tsx                    # Root layout
├── context/                          # Contextos React (Gerenciamento de Estado)
│   ├── SelectionContext.tsx          # Estado global de seleção (Objetos, Mocks)
│   └── ...
├── components/                       # Componentes React
│   ├── dashboard/                    # Dashboard (12+ arquivos)
│   │   ├── dashboard-charts.tsx
│   │   ├── dashboard-kpi-sidebar.tsx
│   │   ├── dashboard-summary.tsx
│   │   ├── MigrationResultChart.tsx
│   │   ├── PerformanceComparisonChart.tsx
│   │   ├── consolidated-tooltip.tsx
│   │   └── ...
│   ├── layout/                       # Layout (5 arquivos)
│   │   ├── dashboard-shell.tsx       # Wrapper de páginas
│   │   ├── main-sidebar.tsx          # Navegação principal
│   │   ├── page-header.tsx           # Header padronizado
│   │   ├── active-project-badge.tsx
│   │   └── user-badge.tsx
│   ├── mocks/                        # Mocks (9+ arquivos)
│   │   ├── mock-card.tsx
│   │   ├── mock-table.tsx
│   │   ├── mock-row.tsx
│   │   ├── mock-header.tsx
│   │   ├── mock-alerts.tsx
│   │   ├── mock-form-dialog.tsx
│   │   └── features/                 # Features específicas
│   │       ├── mock-action-cell.tsx
│   │       └── mock-status-badge.tsx
│   ├── objetos/                      # Objetos (8+ arquivos)
│   │   ├── dependency-graph.tsx
│   │   ├── header-actions-toolbar.tsx
│   │   ├── objetos-dialogs-wrapper.tsx
│   │   └── ...
│   ├── logs/                         # Logs (5 arquivos)
│   ├── projetos/                     # Projetos (7 arquivos)
│   ├── reports/                      # Relatórios (7 arquivos)
│   ├── configuracoes/                # Configurações (3 arquivos)
│   ├── email/                        # E-mail (2 arquivos)
│   ├── shared/                       # Compartilhados (3 arquivos)
│   ├── ui/                           # ShadCN UI (37 arquivos)
│   └── ...                           # Componentes avulsos
├── hooks/                            # Custom hooks (22 hooks)
│   ├── useLocalStorageState.ts       # Estado persistente (localStorage)
│   ├── usePresence.ts                # Presença do usuário (online/offline)
│   ├── useEditLock.ts                # Lock de edição em documentos
│   ├── use-dashboard-data.ts         # Dados do dashboard
│   ├── use-dashboard-filters.ts      # Filtros do dashboard
│   ├── use-dashboard-dialogs.ts      # Dialogs do dashboard
│   ├── use-dashboard-auto-select.ts  # Auto-seleção de mock
│   ├── use-mocks-data.ts             # Dados de mocks
│   ├── useMocksActions.ts            # Ações de mocks
│   ├── use-mock-carga-actions.ts     # Ações de carga de mocks
│   ├── use-objects-data.ts           # Dados de objetos
│   ├── use-object-form.ts            # Formulários de objetos
│   ├── use-object-selection.ts       # Seleção de objetos
│   ├── use-report-data.ts            # Dados de relatórios
│   ├── use-report-aggregation.ts     # Agregação de relatórios
│   ├── use-users-data.ts             # Dados de usuários
│   ├── use-user-actions.ts           # Ações de usuários
│   ├── use-projects-data.ts          # Dados de projetos
│   ├── use-email-contacts.ts         # Contatos de e-mail
│   ├── useAuthedFetch.ts             # Fetch autenticado
│   ├── useMobile.tsx                 # Detecção mobile
│   └── useToast.ts                   # Sistema de toasts
├── supabase/                         # Camada Supabase + shims compat (API documento)
│   ├── client.ts / admin.ts          # Browser + service role
│   ├── provider.tsx                  # Auth, hooks useDb/useMemoDb/useUser
│   ├── query-builder.ts              # doc/collection/query → Postgres
│   ├── compat-db-shim.ts             # Shim `@/supabase/compat-db-shim`
│   ├── hooks/                        # use-collection, use-doc
│   └── mutations.ts                  # Writes non-blocking
├── lib/                              # Utilitários (14 arquivos)
│   ├── utils.ts                      # cn(), utilitários gerais
│   ├── formatters.tsx                # Formatação pt-BR (números, %, duração, datas)
│   ├── stat-date-formatters.ts       # Formatação de datas para estatísticas
│   ├── admin-auth.ts                 # Autenticação admin (server-side)
│   ├── admin-batch.ts                # Operações em batch admin
│   ├── auth-server.ts                # Autenticação server-side
│   ├── log-parser.ts                 # Parser de logs de migração
│   ├── print-styles.ts               # Estilos de impressão
│   ├── placeholder-images.ts         # Imagens placeholder
│   └── migration/                    # Lógica de migração
│       ├── business-logic.ts         # Regras de negócio
│       ├── dependency-utils.ts       # Utilitários de dependência
│       ├── format-utils.ts           # Utilitários de formatação
│       ├── gestao-sequence.ts        # Ordem de exibição (dashboard ↔ gestão de objetos)
│       └── sequence-utils.ts         # Sequência de carga (parse, compare, display)
├── types/                            # TypeScript interfaces (6 arquivos)
│   ├── migration.ts                  # MigrationObject, Mock, LoadHistoryEntry
│   ├── master-object.ts              # MasterObject (catálogo)
│   ├── activity-group.ts             # ActivityGroup
│   ├── admin.ts                      # Tipos administrativos
│   ├── email.ts                      # EmailContact, EmailGroup
│   └── usuarios.ts                   # Tipos de usuário
└── ai/                               # Genkit AI (3 arquivos)
    ├── genkit.ts                     # Configuração Genkit
    ├── dev.ts                        # Entry point para desenvolvimento
    └── flows/
        └── ai-description-generator.ts # Flow de geração de descrições
```

---

## 💾 Modelo de Dados (Supabase Postgres)

### Tabelas Postgres (schema `public`)

Mapeamento de caminhos legados → tabela Supabase (via `src/supabase/path-mapper.ts`):

| Caminho no app (legado) | Tabela Postgres | Relacionamentos |
|-------------------------|-----------------|-----------------|
| `users/{uid}` | `profiles` | FK → `auth.users` |
| `projects/{id}` | `projects` | `member_uids[]`, `project_members` |
| `projects/{pid}/mocks/{id}` | `mocks` | FK `project_id` |
| `…/migrationObjects/{id}` | `migration_objects` | FK `mock_id`, `project_id` |
| `…/comments/{id}` | `comments` | FK `object_id`, `project_id` |
| `masterObjects/{id}` | `master_objects` | catálogo global |
| `activityGroups/{id}` | `activity_groups` | `object_ids[]` |
| `emailContacts`, `emailGroups` | `email_contacts`, `email_groups` | config |
| `accessProfiles/{id}` | `access_profiles` | RBAC templates |
| `editLocks/{id}` | `edit_locks` | locks de edição |
| `sessions/{uid}` | `sessions` | FK `user_id` → `profiles` |
| `migrationLogs/{id}` | `migration_logs` | FK `project_id` opcional |
| `appConfig/{key}` | `app_config` | chave/valor JSONB |
| `fileAliases/{id}` | `file_aliases` | padrões de arquivo |

Tipos gerados: `src/supabase/database.types.ts` (`npm run db:gen-types`).

---

## 🧠 Fluxo de Dados & Estado

### 1. Seleção de Contexto

A aplicação utiliza **URL Search Params** como fonte principal de verdade para contexto de navegação:

```
Dashboard:        /?mock=MOCK-ID&projectId=PROJ-ID
Objetos:          /objetos/[mockId]?projectId=PROJ-ID
Relatórios:       /relatorios?projectId=PROJ-ID&mock=MOCK-ID
```

### 2. Gerenciamento de Estado Global

A partir da **v2.10**, o sistema utiliza **React Context** para estados que cruzam múltiplas páginas ou componentes profundos:

- **SelectionContext**: Gerencia a seleção única de Objetos e Mocks em toda a aplicação. Substitui o uso de queries redundantes no `localStorage` para estados efêmeros de UI.
- **Benefits**: Performance superior (evita re-renders desnecessários), tipagem forte e consistência visual imediata.

### 3. Persistência Inteligente

| Chave | Armazenamento | Descrição |
|-------|---------------|-----------|
| `dashboard_last_mock_id` | localStorage | Mock selecionado no dashboard |
| `dashboard_last_project_id` | localStorage | Projeto selecionado |
| `dashboard_show_performance` | localStorage | Visibilidade do painel de performance |
| `project_order` | Postgres (`profiles`) | Ordenação manual de projetos (por usuário) |
| `relatorio-comparativo-project` | localStorage | Projeto no relatório comparativo |
| `relatorio-comparativo-mock-a/b` | localStorage | Mocks baseline/alvo |

### 3. Sincronização de Objetos

Objetos de carga herdam propriedades do catálogo mestre (`masterObjects`). A atualização é feita de forma atômica via `writeBatch` para garantir integridade entre:
- Grupos de atividade ↔ masterObjects
- Dependências entre objetos
- Catálogo → Instâncias de mock

### 4. Hooks de Dados vs. Ações

O projeto adota o padrão de **Separação de Preocupações**:

```typescript
// Hook de DADOS (busca Supabase via compat layer)
const { data, loading, error } = useDashboardData(projectId);

// Hook de AÇÕES (mutação/estado UI)
const { openDialog, closeDialog, isDialogOpen } = useDashboardDialogs();
const { handleCreate, handleUpdate, handleDelete } = useMocksActions();
```

**Regra**: Hooks de ação devem ser declarados após hooks de dados para estabilidade do HMR.

### 5. Ordenação do Dashboard

A grade do dashboard segue a **mesma ordem de exibição** da gestão de objetos da mock selecionada:

| Módulo | Responsabilidade |
|--------|------------------|
| `gestao-sequence.ts` | Índice de ordem (catálogo mestre ou instâncias da mock) |
| `sequence-utils.ts` | Comparação e formatação de sequência de carga (`XX.XX`) |
| `use-dashboard-filtering.ts` | Aplica filtros e ordenação antes de renderizar os cards |
| `page.tsx` | Coluna **Seq.** = posição na grade (`formatSequence(index + 1, 0)`), não o valor bruto do banco |

**Separação de utilitários**: `@/lib/formatters.tsx` concentra formatação pt-BR (números, %, duração, datas). Lógica de sequência de carga permanece em `@/lib/migration/sequence-utils.ts`.

---

## 🚀 Estratégia de Deploy

### Deploy (standalone)

```
npm run build → output standalone (Docker / Cloud Run / Vercel)
```

### Configurações Críticas

```typescript
// next.config.ts
{
  output: 'standalone',
  generateBuildId: () => 'migra-stable-v1', // Previne ChunkLoadError entre deploys
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  transpilePackages: ['@genkit-ai/google-genai', 'genkit'],
}
```

**Motivo do `generateBuildId` estável**: deploys paralelos podem causar `ChunkLoadError` quando o navegador cacheia chunks de versões diferentes.

---

## 🔐 Segurança

### Camadas de Proteção

1. **Supabase Auth**: Autenticação primária (JWT)
2. **RLS (Row Level Security)**: Políticas Postgres em `supabase/migrations/`
3. **Admin Auth (server-side)**: Validação de permissões em API routes + service role
4. **Edit Locks**: Prevenção de edições concorrentes (`edit_locks`)
5. **Session Management**: Presença em `sessions`

### Políticas RLS principais (Postgres)

Funções helper em `private.*` (schema `private`, `SECURITY DEFINER`):

```sql
-- Acesso ao projeto: admin/master OU member_uids OU project_members OU project_ids no profile
CREATE FUNCTION private.has_project_access(p_project_id UUID) ...

-- Perfis: leitura própria ou admin/master
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR id = auth.uid());

-- Migration objects: leitura com acesso ao projeto; escrita com acesso ao projeto
CREATE POLICY migration_objects_select ON public.migration_objects
  FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));

-- Edit locks: leitura aberta; escrita apenas com user_id = auth.uid()
CREATE POLICY edit_locks_insert ON public.edit_locks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

Migrations completas: `supabase/migrations/20260612000002_rls_policies.sql` e `000004_rls_hardening.sql`.

**Superadmin**: `SUPERADMIN_UID` / `NEXT_PUBLIC_SUPERADMIN_UID` no `.env.local` (bypass client-side em hooks legados).

---

## 🤖 Integração com IA (Genkit)

### Fluxo Atual

```
Usuário → Solicita descrição → Genkit Flow → Google Gemini → Descrição técnica
```

### Configuração

```typescript
// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-pro',
});
```

### Uso Planejado

- ✅ **Descrições de Objetos**: Geração automática baseada em palavras-chave
- 🔄 **Análise de Carga**: Diagnóstico de erros baseado em logs históricos
- 🔄 **Recomendações**: Sugestões de sequência e paralelismo

---

## 🧩 Padrão de Modularização (v2.7+)

### Arquitetura de Componentes

```
Page Orchestrator (200-400 linhas)
    ├── Hooks de Dados (use-*-data.ts)
    ├── Hooks de Ação/UI (use*Actions.ts)
    ├── Sub-componentes Locais (Header, Table, Card)
    └── Injeção de Props
```

### Métricas de Refatoração

| Página | Antes | Depois | Redução |
|--------|-------|--------|---------|
| `relatorios/page.tsx` | 885 | 101 | **-89%** |
| `usuarios/page.tsx` | 1.863 | 373 | **-80%** |
| `projetos/page.tsx` | 1.204 | 408 | **-66%** |
| `logs/page.tsx` | 704 | 301 | **-57%** |
| `mocks/page.tsx` | 1.179 | 444 | **-62%** |
| `main-sidebar.tsx` | 1.028 | 4 | **-99%** |
| `activity-groups-manager.tsx` | 898 | 1 | **-99%** |
| **TOTAL** | **7.761** | **1.632** | **-79%** |

### Artefatos Criados

- **42 componentes** atômicos
- **19 hooks** customizados
- **64 arquivos** no total

---

## 📊 Design System "Premium BI"

A shell visual adota tokens **SAP Fiori Horizon** em `src/styles/fiori-shell.css` (tipografia, hovers e exceções de `border-radius` sobre a regra global `.dashboard-no-rounded`). O restante do design system permanece na paleta SkyBlue abaixo.

### Paleta de Cores

| Uso | Cor | Hex |
|-----|-----|-----|
| **Primário/Accent** | SkyBlue-500 | `#00AEEF` |
| **Sucesso** | Emerald-500 | `#10b981` |
| **Erro/Alerta** | Red-500 | `#ef4444` |
| **Aviso** | Amber-500 | `#f59e0b` |
| **Background** | Slate-50 | `#F8FAFC` |
| **Cards** | White | `#FFFFFF` |
| **Texto** | Slate-900 | `#0F172A` |

**⚠️ Restrição**: Proibido uso de tons de roxo ou lilás.

### Tipografia

| Elemento | Estilo |
|----------|--------|
| Headers | `font-black uppercase tracking-widest` (9px-11px) |
| Métricas/Valores | `font-mono` (IDs, durações, volumes) |
| Tabelas | `text-[11px]` células, `text-[10px]` headers |
| Inputs | `text-xs` (12px), sem negrito |

### Interatividade

- **Foco de Campo**: `scale-[1.01]` + `shadow-md`
- **Hover**: `bg-slate-200/60` com transição suave
- **Seleção em Tabelas**: Borda lateral SkyBlue + background `SkyBlue-50`
- **Botões**: `border-0` + `active:scale-95`

---

## 📈 Evolução do Projeto

| Versão | Foco | Principais Mudanças |
|--------|------|---------------------|
| **v3.0** | Supabase | Migração Firebase → Supabase, RLS, `@/supabase`, refactors sidebar/activity-groups |
| **v2.11** | Fiori & Sequência | UI Fiori Horizon, ordem dashboard ↔ gestão, limpeza de dead code |
| **v2.10** | Performance | SelectionContext, log cleanup, Next.js 15.5 |
| **v2.9** | Documentação | Docs completos, estrutura mapeada |
| **v2.8** | DnD & Stability | Reordenação de projetos, URL como verdade |
| **v2.7** | Modularização | Hooks dedicados, fragmentação de UI |
| **v2.6** | Visual Clean | Remoção de negritos, padronização 12px |
| **v2.5** | Premium UX | Feedback tátil, branding SkyBlue |
| **v2.4** | Estabilidade | ChunkLoadError fix, Grupos de Atividade |

---

> **Desenvolvido por H2D Consultoria** — 2026
