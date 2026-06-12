---
trigger: always_on
glob:
description: Regras, arquitetura e padrões obrigatórios da plataforma Migra. Carregado em todo contexto de agente.
---

# MIGRA — Regras e Padrões da Plataforma

> Documento autoritativo para desenvolvimento na plataforma Migra. Todas as decisões de UI, código e negócio devem respeitar este arquivo.

---

## 1. Contexto e Propósito

O **Migra** é uma plataforma de aceleradores para migração de dados com foco especializado em sistemas **IS-U** (Energia, Saneamento, Gás e Petróleo).

- **Público-alvo**: Engenheiros de Dados, Analistas de Migração e Gestores de Projeto.
- **Objetivo**: Automação, monitoramento e governança de cargas complexas (SAP S/4HANA, ECC).
- **Domínio**: Projetos de migração contêm Mocks (cenários de teste), que contêm Objetos (entidades a migrar).

---

## 2. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15+ (App Router, Turbopack) |
| Runtime | React 19, TypeScript 5 |
| Styling | Tailwind CSS 3.4, tailwind-merge, class-variance-authority |
| UI Components | shadcn/ui + Radix UI primitives |
| Icons | Lucide React (traço fino, consistente) |
| Backend / Auth | Firebase 11 (Auth, Firestore, App Hosting) |
| Firebase Admin | firebase-admin 12 (server-side) |
| Charts | Recharts 2 |
| Graph | @xyflow/react + dagre (grafo de dependências) |
| Forms | React Hook Form 7 + Zod 3 |
| AI | Genkit 1 + @genkit-ai/google-genai (Gemini) |
| Utilities | date-fns, xlsx, clsx |

---

## 3. Estrutura de Rotas

| Rota | Descrição |
|---|---|
| `/` | Dashboard principal — KPIs, gráficos, resumo do projeto ativo |
| `/projetos` | Gestão de projetos (CRUD, membros) |
| `/mocks` | Gestão de Mocks — tabela com ações de carga, lock, clone |
| `/objetos` | Catálogo de Master Objects — CRUD, ordenação, dependências |
| `/objetos/[mockId]` | Gestão de objetos de um Mock específico — detalhe, progresso, histórico |
| `/relatorios` | Relatórios consolidados |
| `/relatorios/comparativo` | Análise comparativa de impacto entre Mocks |
| `/usuarios` | Gestão de usuários (admin) |
| `/login` | Autenticação |
| `/register` | Cadastro |
| `/alterar-senha` | Troca de senha |
| `/docs` | Documentação interna |
| `/sobre` | Sobre a plataforma |

---

## 4. Entidades de Negócio (Tipos Core)

### Projeto
Container de mais alto nível. Agrupa Mocks e define os membros com acesso.

### Mock (`/mocks`)
Cenário ou janela de teste de migração.
- `status`: `PENDENTE` → `CARGA_EM_ANDAMENTO` → `CARGA_CONCLUIDA` | `FINALIZADA`
- `isLocked`: quando `true`, bloqueia edições (modo auditoria)
- `isRunning`: booleano auxiliar de estado de execução
- `loadHistory`: array de `LoadHistoryEntry`

### MigrationObject — Objeto (`/objetos`)
Entidade de dados a ser migrada. Pertence a um Mock e a um Projeto.
- `status`: `PENDENTE` | `CARGA_EM_ANDAMENTO` | `CARGA_CONCLUIDA`
- `chargeOrder`: formato decimal **XX.XX** (ex: `01.01`). Objetos com mesmo prefixo (ex: `01.`) são paralelos.
- Campos de volume: `targetCount`, `processedCount`, `migratedCount`, `successCount`, `errorCount`
- Campos de tempo: `startTime`, `endTime`, `durationMs`
- `dependencies`: array de IDs de outros objetos
- `loadHistory`: histórico de todas as execuções (`inicial` | `reprocessamento`)

### LoadHistoryEntry
Registro de uma execução de carga. Contém: `type`, `startTime`, `endTime`, `targetCount`, `processedCount`, `successCount`, `errorCount`, `durationMs`, `userId`, `userName`.

---

## 5. Firebase / Firestore

- **Project ID**: `studio-4933855246-6debd`
- **Coleções principais**: `users`, `sessions`, `projects`, `mocks`, `migrationObjects`, `comments`
- **Acesso**: Restrito por `hasProjectAccess` nas Firestore Rules
- Usuários comuns vêem apenas projetos em `memberUids`
- Administradores (`role: 'admin'`) têm visibilidade total
- Presença de sessão rastreada em `/sessions` via hook `usePresence`
- API de sessão admin: `POST /api/admin/session-action` (logout, block, block-logout, delete, unlock)

---

## 6. RBAC — Controle de Acesso

- **Perfis**: `admin`, `user`, `membro`, `especialista`
- Perfil `especialista` **não é exibido nem contabilizado** em listagens de membros (é consultor externo)
- `SUPERADMIN_UID` no env tem acesso irrestrito
- Permissões granulares por projeto via `userProfile.projectIds`

---

## 7. Design System — "Premium BI"

### Paleta de Cores
| Uso | Cor |
|---|---|
| Primária / Branding | SkyBlue-500 (`#00AEEF`) |
| Sucesso | Esmeralda / `#28A745` |
| Erro | Coral / `#DC3545` |
| Referência / Histórico | Orange-500 / `#FD7E14` |
| Texto principal | Slate-900 |
| Background de página | Slate-50 |
| Cards | `bg-white`, bordas `border-slate-100` |

**⚠️ PROIBIDO**: Nunca usar tons de roxo ou lilás.

### Tipografia
- Títulos de seção: `font-black uppercase tracking-widest`, 9–11px
- Valores primários: peso `black` / `heavy`, tamanho `base` a `xl`
- Valores técnicos (contagens, durações): `font-mono`
- Locale: sempre `pt-BR` (ex: `1.234.567`, `99,99%`, `01h 10m`)

### Abreviações de Volume
- Valores ≥ 1.000.000 → abreviar (ex: `1,2M`)
- Durações: padrão `00h 00m`

---

## 8. Padrões de Layout e Header

### DashboardShell
- Wrapper de todas as páginas autenticadas
- Prop `noPadding` quando a página tem header sticky próprio
- Sidebar fixa no desktop (`md:`), Sheet mobile

### Header Padrão de Página (Tiered Header)
```
<div className="flex flex-col sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
  <div className="h-16 px-4 md:px-8 flex items-center gap-3">
    {/* Botão voltar (icon-only) */}
    {/* Título + subtítulo */}
    {/* Botões de ação agrupados */}
  </div>
</div>
```

### Grupo de Botões no Header
```
<div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-100">
  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-none hover:bg-slate-200" />
</div>
```

### Wrapper de Conteúdo
```
<div className="px-4 md:px-8 py-6 flex-1"> ... </div>
```

---

## 9. Padrões de Botões (OBRIGATÓRIO)

| Propriedade | Valor padrão |
|---|---|
| Variant | `ghost` (preferir sobre variant `outline` do shadcn) |
| Border | **Sempre `border-0`** — nenhuma borda em nenhum estado (hover, focus, selected) |
| Cantos | `rounded-none` para botões em grupos, `rounded` padrão caso isolado |
| Feedback | `active:scale-95` para press feedback |
| Hover (header/row) | `hover:bg-slate-200` |
| Hover (accent) | `hover:bg-SkyBlue-100` apenas em contextos de branding explícito |

### Tamanhos de Botão Customizados
| Size | Dimensão |
|---|---|
| `icon-xxs` | `h-7 w-7` |
| `icon-xs` / `xs` | `h-8 w-8` |
| `icon` | `h-10 w-10` |
| `sm` | `h-9` |
| `default` | `h-10` |

### Botões de Linha de Tabela (Row Actions)
- Tamanho: `h-8 w-8` (`size="icon-xs"`)
- Variant: `ghost`
- Hover: `hover:bg-slate-200`
- Sem `bg-secondary`, sem `border-none`, sem `shadow-xs`

---

## 10. TooltipProvider
- Usar **um único `<TooltipProvider delayDuration={0}>`** por seção/página (não aninhado por botão)
- Exceção: Popovers com Tooltip interno podem ter seu próprio `<TooltipProvider>`

---

## 11. Gráficos (Recharts)

- **Escala Y**: Logarítmica (`Math.log10`) para dados com grande variação de volume
- **Tooltips**: Exibir sempre o valor real (não transformado)
- **Toggles de visibilidade**: Usar `Switch` + `Label`, nunca botões no header do gráfico

---

## 12. Inputs de Formulário

### Padrão de Input Texto
```
className="h-9 text-[11px] font-normal bg-slate-200/60 border-none rounded-none transition-all focus:bg-white focus:ring-2 focus:ring-SkyBlue-500/40 outline-hidden shadow-inner"
```

### Inputs `datetime-local` e `date`
Browsers ignoram `font-size` CSS em inputs nativos de data. Usar `text-[11px]!` (com `!important`) para forçar o override:
```
className="h-9 text-[11px]! font-normal bg-slate-200/60 border-none rounded-none transition-all focus:bg-white focus:ring-2 focus:ring-SkyBlue-500/40 outline-hidden shadow-inner"
```

---

## 13. Cabeçalho de Tabela — Padrão Visual

Todas as tabelas devem seguir este padrão de cabeçalho:

```tsx
<TableHead className="text-xs font-bold text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
  Nome da Coluna
</TableHead>
```

- **Fonte**: `text-xs` (12px), `font-bold`
- **Cor**: `text-slate-700`
- **Background**: `bg-slate-50` (sólido, para cobrir linhas que passam por baixo)
- **Borda inferior**: `border-b border-slate-100`
- **Sticky**: `sticky top-0 z-10` em cada `<TableHead>` individualmente

---

## 14. Tabelas com Cabeçalho Fixo (Sticky Header)

Para tabelas que precisam de header fixo ao rolar:

1. **`wrapperClassName`** no componente `Table` para controlar o scroll container interno:
```tsx
<Table wrapperClassName="max-h-[calc(100vh-7rem)]">
```
O offset `7rem` = header da página (`4rem`) + padding do conteúdo (`3rem`). Ajustar conforme altura dos elementos acima da tabela.

2. **`sticky top-0 z-10 bg-slate-50`** em cada `<TableHead>` individualmente — NÃO no `<TableHeader>` nem no `<TableRow>`:
```tsx
<TableHead className="... sticky top-0 z-10 bg-slate-50">
```

3. **Gradient fade** no container para cobrir linhas parciais na borda inferior:
```tsx
<div className="relative">
  <Table wrapperClassName="max-h-[calc(100vh-7rem)]">...</Table>
  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-white to-transparent" />
</div>
```

4. O componente `Table` em `src/components/ui/table.tsx` aceita `wrapperClassName` para customizar o div interno (`relative w-full overflow-auto`).

---

## 14. Qualidade de Código

- TypeScript estrito — evitar `any`
- `useMemo` para transformações pesadas de dados
- Formatação: sempre via utilitários de `@/lib/formatters.tsx` (pt-BR)
- Sequência de carga: `@/lib/migration/sequence-utils.ts`; ordem dashboard ↔ gestão: `@/lib/migration/gestao-sequence.ts`
- Sem `console.log` ou arquivos `.txt` de debug no merge
- Componentes funcionais curtos e focados

---

## 13. Localização dos Arquivos Chave

| Arquivo | Descrição |
|---|---|
| `src/types/migration.ts` | Tipos core: Mock, MigrationObject, LoadHistoryEntry |
| `src/types/admin.ts` | SessionAction, ActionRequest |
| `src/lib/formatters.tsx` | Formatação pt-BR (números, %, duração, datas) |
| `src/lib/migration/sequence-utils.ts` | Sequência de carga (`parse`, `compare`, display `XX.XX`) |
| `src/lib/migration/gestao-sequence.ts` | Ordem de exibição alinhada entre dashboard e gestão de objetos |
| `src/firebase/config.ts` | Configuração Firebase client |
| `src/firebase/admin.ts` | Firebase Admin SDK |
| `src/components/layout/DashboardShell.tsx` | Shell principal das páginas |
| `src/components/ui/button.tsx` | Variantes e tamanhos de botão |
| `src/app/globals.css` (`@theme`) | Paleta SkyBlue e tokens shadcn (Tailwind v4) |

---

> ÚLTIMA ATUALIZAÇÃO: 2026-06-11
