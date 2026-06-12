# Migra App Rules & Design System

> This file documents the core rules, architectural patterns, and design standards for the Migra application.

---

## 🏛️ Application Architecture

- **Framework**: Next.js 15+ (App Router, Client Components where state needed).
- **Styling**: Tailwind CSS with a custom configuration focused on a "Premium BI" aesthetic.
- **Icons**: Lucide React for consistent, thin-stroke UI iconography.
- **Visualization**: Recharts for all data-heavy components.
- **Utilities**: Formatação pt-BR em `@/lib/formatters.tsx`; sequência de carga em `@/lib/migration/sequence-utils.ts`; ordem dashboard ↔ gestão em `@/lib/migration/gestao-sequence.ts`.
- **Route Group**: Todas as páginas autenticadas ficam em `src/app/(dashboard)/`. O `DashboardShell` é apenas wrapper de padding.
- **Header Pattern**: Componente `PageHeader` padronizado em todas as páginas (15 total).
- **Navigation**: Menu horizontal no topo com dropdowns para sub-itens. User menu no canto superior direito.
- **Build Stability**: Uso de `generateBuildId` no `next.config.ts` (`migra-stable-v1`) para evitar inconsistências de chunking no Firebase App Hosting.
- **Build Flags**: Configurado para ignorar erros de Lint e TypeScript durante o build para priorizar deploys de entrega contínua.
- **Drag & Drop**: Utiliza `@dnd-kit/core` e `@dnd-kit/sortable` para reordenação intuitiva de grids e listas com persistência no Firestore.
- **Hook Strategy**: Em páginas com alta densidade de hooks, novos estados e efeitos de UI de suporte (como reordenação) devem ser posicionados ao final do bloco de hooks da página para evitar erros de 'Hook Index Shift' e 'Size Change' durante o HMR.
- **Global State**: Utilização de `SelectionContext` para gerenciar seleções globais (Objetos, Mocks) evitando prop-drilling e garantindo sincronia entre componentes distantes.


---

## 🎨 Design System & Aesthetic

### Navigation Layout (Top Bar)

**Estrutura:**
- **Header Principal** (`h-16`): Logo, menu horizontal de navegação, user menu.
- **Painel de Controle do Dashboard** (`sticky top-16`): Fixo durante scroll, contém controles de filtro e visualização.

**Menu Horizontal:**
- Altura: `h-16` com `border-b-2` (indicador de página ativa em `SkyBlue-500`).
- Labels: `text-[9px] font-black uppercase tracking-wider`.
- Estados: `text-slate-400` (inativo), `text-SkyBlue-500` (ativo).
- Dropdowns: `text-slate-900` com `focus:bg-slate-100` para contraste máximo.

**User Menu (Dropdown):**
- Trigger: Nome do usuário + avatar/ícone.
- Itens: `text-slate-900` (Ver Perfil), `text-red-600` (Encerrar Sessão).
- Hover: `focus:bg-slate-100` (Perfil), `focus:bg-red-50` (Sessão).
- **Importante**: Sempre usar `focus:text-slate-900` ou `focus:text-red-600` para garantir contraste no hover.

- Altura: `py-4` com gap de controles `gap-3`.

### Visual Layout Standard ("Premium BI")

O Migra adota um padrão visual rigoroso que **deve ser mantido em todas as novas implementações**:
1. **Cards**: Bordas arredondadas padrão, sombras `shadow-xs` (inativo) a `shadow-lg` (interativo). 
2. **Grids Dinâmicos**: Uso de Drag & Drop para permitir que o usuário personalize a visualização (ex: reordenação de projetos).
3. **Sticky Headers**: Cabeçalhos de página e painéis de controle sempre fixos no topo com `backdrop-blur-md` e bordas inferiores sutis (`border-slate-200`).
4. **Espaçamento Compacto**: Priorização de densidade de dados com paddings reduzidos e fontes técnicas (`font-mono`).


### PageHeader Standard (Premium BI Header)

Todas as páginas do dashboard usam o componente `PageHeader` com as seguintes características:

```tsx
<PageHeader
    title="TÍTULO"
    subtitle="Subtítulo"
    backHref="/origem"
    contextLabels={
        <>
            <div>
                <span className="text-slate-400 text-[10px]">PROJETO</span>
                <span className="text-slate-900 text-xs">Nome do Projeto</span>
            </div>
            <div>
                <span className="text-slate-400 text-[10px]">STATUS</span>
                <span className="text-emerald-500 text-xs">EM EDIÇÃO</span>
            </div>
        </>
    }
    actions={
        <>
            <Select>...</Select>  {/* Filtros/Seletores */}
            <Button>Ação</Button>
            <UserBadge />
        </>
    }
/>
```

**Specs Técnicas:**
- Altura: `h-20` (80px)
- Posicionamento: `sticky top-0 z-30` (sempre visível)
- Background: `bg-white/98 backdrop-blur-md` (efeito vidro)
- Borda: `border-b border-slate-200`
- Sombra: `shadow-md` (padrão, removível via `className="shadow-none"`)
- Print: `print:hidden`

**Elementos:**
1. **Botão Voltar**: `<ChevronLeft>` com separador vertical `w-px bg-slate-200`
2. **Ícone**: Opcional, em `w-10 h-10 bg-SkyBlue-500 rounded-lg`
3. **Título**: `text-sm font-black text-slate-900 uppercase`
4. **Badge**: Ao lado do título (ex: contador de objetos)
5. **Context Labels**: Grid de labels (ex: PROJETO, STATUS MOCK)
6. **Ações**: Controles, filtros, UserBadge

**Páginas Padronizadas (15):**
- Dashboard, Mocks, Objetos, Logs, Projetos
- Grupos de Atividade, Relatórios, Relatórios/Comparativo
- Configurações, Usuários, Perfis, Perfil, Sobre, Docs

### Color Palette
- **Primary Accents**: `SkyBlue` (Indigo-like) or `Slate` for navigation and headers.
- **Success/Status**: Emerald-500 (`#10b981`) or `#28A745` (Green).
- **Error/Alert**: Red-500 (`#ef4444`) or `#DC3545` (Red).
- **Warning**: Amber-500 (`#f59e0b`).
- **Reference/History**: Orange-500 or `#FD7E14`.
- **Backgrounds**: Pure white (`bg-white`) for cards, subtle slate (`bg-slate-50`) for page backgrounds.
- **Constraint**: Avoid purple/violet colors unless explicitly requested.

### Typography
- **Headers**: Bold, uppercase tracking-widest for titles (Size: 10px to 12px for secondary headers).
- **Values**: Black/Heavy weight for primary metrics (Size: Base to Extra Large).
- **Monospacing**: Use `font-mono` for all technical values, durations, and record counts.
- **Table headers**: `text-[10px] font-black uppercase tracking-widest` ou `font-black uppercase tracking-wider text-slate-600`.
- **Table values**: `text-xs` (12px) herdado da `<table>`, células com `font-mono`.

---

## 📊 Dashboard Implementation Rules

### 1. Layout Structure (The "Premium BI" Grid)

**Top Bar (Header da Página):**
- Componente `PageHeader` com título, contexto e controles de projeto/mock.
- Altura: `h-20` (80px).

**Painel de Controle de Performance (Fixo):**
- Posicionamento: `sticky top-16 z-40` — sempre visível durante scroll.
- Background: `bg-white border-b border-slate-200`.
- Controles: "PERFORMANCE POR OBJETO", "FILTROS", "RELATÓRIO", "ESTATÍSTICA".
- **Sempre visível**: Não há mais botão "Ocultar Indicadores".

**Main Content Area:**
- **Main Charts**: Gráficos de carga de dados.
- **Performance Cards Grid**: Cards de objetos em grid responsivo (2-6 colunas).
- Padding: `py-4 px-4 md:px-8 pb-16 pt-0` (sem padding superior por causa do painel fixo).

**Summary Indicator Order (Sidebar)**:
1. MOCKS (Total count)
2. OBJETOS (Total artifacts)
3. VOLUME TOTAL (Records)
4. TEMPO TOTAL (Duration)
5. ANDAMENTO CONSOLIDADO (Progress bar)

**Comparison Section**: Positioned below the main results, spanning the full or divided width depending on screen size.

### 2. General Data Formatting
- **Locales**: Always use `pt-BR` for number formatting (e.g., `1.234.567`).
- **Large Volumes**: Values >= 1.000.000 should be abbreviated (e.g., `1,2M`).
- **Percentages**: Format with two decimal places and a comma (e.g., `99,99%`).
- **Durations**: Strictly follow the `00h 00m` pattern (e.g., `01h 10m`).

### 3. Chart Specifics
- **Y-Axis Scaling**: Use Logarithmic scales (`Math.log10`) for charts handling high and low volume variations simultaneously.
- **Tooltips**:
    - **MUST** show actual record counts, not log values.
    - **Formatting**: Values should be separated from labels for readability.
- **Visibility Controls**: Use `Switch` (flag) components with `Label` instead of buttons for dashboard visibility toggles.
- **Tooltip Logic**: Tooltips should show raw data (not transformed/scaled) for maximum transparency.

### 4. Dashboard Card Visual States
- Cards com `successPct === 100`: `bg-emerald-50/60` + `shadow-xs` + borda superior `bg-emerald-500`.
- Cards com `successPct < 100`: `bg-white` + `shadow-lg` permanente (equivalente ao hover) + borda superior contextual (`amber-500` ≥50%, `red-500` <50%).
- Painel **% CARGA** (`ConsolidatedTooltip asGridCell`): background `#E7E8EB`, fonte preta (`text-black`), negrito apenas quando `successPct < 100`, `text-base`.
- Cards inativos: sempre no final da listagem, sem grid de sequenciamento (GRUPO/SEQ/TIPO) no card.

### 5. Dashboard Card Ordering
- Cards ordenados pelo `chargeOrder`/`parallelOrder` do master (catálogo), via `_catalogOrder`/`_catalogParallelOrder`.

- Busca livre, filtro de status, toggle "em andamento", % carga com operadores.

### 7. Import Rules (Logs & Data)
- **Limpeza Automática**: Toda nova carga de dados via importação de arquivo **deve** limpar obrigatoriamente todos os logs técnicos (comentários) existentes para aquele Mock antes de iniciar o processamento. Isso garante integridade e evita confusão entre execuções.
- **Bypass de Limpeza**: Não há bypass configurável via UI. A limpeza é mandatória por padrão de projeto.

### 8. Mock States & Status Reporting
Status e visualização do ciclo de vida das janelas de migração:

| Status Logico | Badge Display | Cor / Estética | Descrição |
|---|---|---|---|
| `PENDENTE` (default) | **ABERTO** | Emerald (static) | Janela criada, pronta para configuração ou carga inicial. |
| `CARGA_EM_ANDAMENTO` | **EM ANDAMENTO** | Orange (pulse) | Janela ativa no SAP. Visível no seletor de contexto do Dashboard. |
| `CARGA_CONCLUIDA` | **CONCLUÍDA** | Emerald (check) | Carga finalizada pelo usuário. Dados congelados para análise de impacto. |
| `isLocked: true` | **ENCERRADO** | Amber (lock) | Janela bloqueada para edição (Auditoria). Visualização apenas leitura. |

- **Badge Component**: `MockStatusBadge` gerencia toda a lógica visual, garantindo consistência entre a lista de Mocks e o Dashboard.
- **Auto-default**: O Dashboard prioriza `EM ANDAMENTO` (ou `ATIVA`) como filtro inicial se disponível.

---

## 🪟 Dialog / Modal Rules

### Fullscreen Dialogs (exploração/relatório)
```
w-screen h-screen max-w-none max-h-none rounded-none [&>button]:hidden
```
- `DialogTitle` com `sr-only` é obrigatório (acessibilidade).
- Botão de fechar deve ser implementado manualmente no footer do dialog.

### Selection Dialogs
- Altura fixa `h-[640px]`.
- Input não-controlado com debounce 200ms via `ref`.
- Retorno de foco ao fechar.

---

## 👥 Professional Directory (RH)

Página de gestão de usuários (`/usuarios`) com grid de alta densidade:

- **Grid Layout**: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6` — prioriza visualização de múltiplos colaboradores.
- **Card Sizing**: Compacto, com paddings internos reduzidos (header: `px-2.5 pt-2.5`, footer: `px-3 py-2`).
- **Hierarquia Visual**: Ícone de status no canto superior esquerdo (Role-based: Crown/Shield), Nome do Usuário em `text-xs font-black`, Badges de perfil em `h-4`.
- **Iconografia de Fundo**: Marca d'água contextual (User logo) com opacidade sutil.
- **Ações Rápidas**:
  - `Settings`: Abre ficha técnica/configurações do usuário.
  - `Ban/ShieldCheck`: Bloqueio/Desbloqueio rápido.
  - `KeyRound`: Reset de senha.

---

## 🗂️ Table Standard

Usar `<table>` nativa (não componentes shadcn/ui) seguindo o padrão da Estatística de Carga:

```tsx
<table className="w-full text-xs border-collapse table-fixed">
  <colgroup>
    <col className="w-XX" /> {/* largura fixa por coluna */}
    <col />                  {/* última coluna ocupa o restante */}
  </colgroup>
  <thead className="sticky top-0 z-10">
    <tr>
      <th className="px-3 py-1.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-700 whitespace-nowrap border-b border-slate-400 bg-slate-200">Col</th>
    </tr>
  </thead>
  <tbody>
    <tr className={cn(
      "border-b border-slate-100 transition-all duration-200 group cursor-pointer relative",
      index % 2 === 0 ? "bg-white hover:bg-slate-200/60" : "bg-slate-50/30 hover:bg-slate-200/80",
      isSelected && "bg-SkyBlue-50/70 hover:bg-SkyBlue-100/40 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-SkyBlue-500 after:content-['']"
    )}>
      <td className="px-3 py-1.5 font-mono text-slate-700 whitespace-nowrap">valor</td>
    </tr>
  </tbody>
</table>
```

- Usar `table-fixed` + `<colgroup>` para colunas com largura fixa.
- Linhas zebradas: `bg-white` (par) / `bg-slate-50/30` (ímpar).
- **Seleção "Premium BI"**: Linhas selecionadas usam `bg-SkyBlue-50/70` e um indicador de borda esquerda (`after:w-1 after:bg-SkyBlue-500`). Refletem o estado global de seleção.
- Células truncadas com `truncate` em vez de `whitespace-nowrap` quando a coluna tem largura fixa e o conteúdo pode ser longo.
- Container da tabela: `pb-6` (sem `pt`) para o cabeçalho encostar no topo do painel scrollável.

---

## 🔘 Button & Input Standards

### Buttons (controles de header & cards)
- **Border**: **Sempre `border-0`** — nenhuma borda em nenhum estado (normal, hover, focus, selected, disabled).
- **Sizes**:
    - `default`: `h-10`
    - `sm`: `h-9`
    - `icon`: `h-10 w-10`
    - `icon-xs`: `h-8 w-8`
    - `icon-xxs`: `h-7 w-7` (usado em rods de cards e áreas densas).
- **Style**: `text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-xl` sem azul no estado inativo.
- **Feedback**: `active:scale-95` mandatório em botões interativos.

### Select (dropdown)
- `SelectItem`: hover e selecionado usam `focus:bg-slate-100 focus:text-slate-900 data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-900` — **não** usar `accent` do tema.
- Definido globalmente em `src/components/ui/select.tsx`.

### DropdownMenu Items (User Menu, Navigation)
- **Contraste no Hover**: Sempre usar `focus:text-slate-900` ou cor específica (ex: `focus:text-red-600`) para garantir que o texto permaneça visível.
- **Background no Hover**: `focus:bg-slate-100` (neutro) ou `focus:bg-red-50` (destrutivo).
- **Padrão**:
  ```tsx
  <DropdownMenuItem className="focus:bg-slate-100 focus:text-slate-900">
    <Link className="text-slate-900">Ver Perfil</Link>
  </DropdownMenuItem>
  <DropdownMenuItem className="focus:bg-red-50 focus:text-red-600">
    Encerrar Sessão
  </DropdownMenuItem>
  ```
- **Erro Comum**: Não confiar apenas na cor do filho (`<Link>`). O `DropdownMenuItem` tem `focus:text-accent-foreground` que pode sobrescrever.

### Inputs & Form Fields (Foco Premium e Limpeza Visual)
- **Global Feedback**: Todos os campos (`Input`, `Textarea`, `SelectTrigger`) utilizam o padrão de foco dinâmico.
- **Escala**: Elevam-se levemente (`scale-[1.01]`) ao receber foco, criando percepção de profundidade ("Bring to Front").
- **Sombra**: Alternam de `shadow-inner` (estado inativo) para `shadow-md` (estado ativo/foco).
- **Cores**: Anel de foco e borda em `SkyBlue-500/40` com troca de background para `bg-white`.
- **Estilo Base**: **`font-normal`** (obrigatório) em todos os `Input` e `Textarea` para reduzir o ruído visual e aumentar a legibilidade de dados densos.
- **Tamanho**: `text-xs!` (12px) padronizado, com fallback visual em `text-[11px]` para áreas de altíssima densidade.

### Checkboxes
- Redondos (`rounded-full`) com `emerald-500` ao selecionar.
- Exceção no `globals.css` necessária por causa do `.dashboard-no-rounded`.

---

## 💬 Tooltip Standards

### Dark Tooltip (padrão global)
```tsx
<TooltipContent className="bg-slate-900 text-white border-none rounded-none text-xs leading-relaxed">
```
- Paleta interna: títulos em `text-slate-400`, valores em `text-white`.

### Tooltip de Objeto
- Header, atributos (grid 2 cols), dependências diretas (SkyBlue), dependências externas (amber).

### Tooltips ricos em cards
- `side="bottom" align="start"`, largura ≤200px.
- `Badge` precisa de `forwardRef` para Radix posicionar corretamente.

---

## 📐 Header Standard (por página)

- Altura: `h-20`.
- Gradiente: `from-white/98`.
- `shadow-md`, `border-slate-300` (visível durante scroll).
- Ícone ao lado do título.
- Layout: título à esquerda, controles + `UserBadge` à direita (sem segunda linha).

### Botão Voltar (sub-páginas)
Inserir antes do ícone, com separador vertical:
```tsx
<Button variant="ghost" size="icon" onClick={() => router.back()}
  className="h-8 w-8 rounded-none hover:bg-slate-200 text-slate-500 active:scale-95">
  <ChevronLeft className="w-5 h-5" />
</Button>
<div className="h-6 w-px bg-slate-200 shrink-0" />
```

---

## 📋 Info Panels (Cards de Objeto)

- `bg-slate-100`, `border-0`, `shadow-inner`, `text-slate-800`.
- Grid grupo/seq: fundo `slate-100`.
- % carga: fundo branco (ou `#E7E8EB`), `font-bold`, cores contextuais.

---

## 📜 Scrollable Flex Panels

O elemento que rola deve ser **diretamente** o filho flex com:
```
flex-1 min-h-0 overflow-y-auto
```

---

## 🔄 State Persistence & Selection Sync

A aplicação mantém a coesão entre páginas através de persistência de estado no `localStorage`.

### 1. Mock Selecionado (Dashboard Sync)
- **Chave**: `dashboard_last_mock_id`.
- **Padrão**: O Dashboard define esta chave. Páginas relacionadas (como `/mocks`) consomem para destacar a linha correspondente.
- **Valor Especial**: `'all'` representa que nenhum mock específico está filtrando a visão global.
- **Defaulting**: No primeiro acesso (sem chave no storage), o sistema busca automaticamente o primeiro Mock com status `CARGA_EM_ANDAMENTO`.

### 2. Hook `useLocalStorageState`
- Utilizado para gerenciar estados que devem sobreviver a navegação e refresh.
- Suporta atualizações funcionais: `setState(prev => ...)` para consistência com o `useState` padrão do React.

---

## 🏷️ Grupos de Atividade

Funcionalidade que permite agrupar objetos por finalidade/contexto (ex: "Estrutura Postal", "Dados Fiscais").

### Arquitetura de dados
- **Coleção Firestore**: `activityGroups` — gerenciada em Configurações → Grupos de Atividade.
- **Campos do grupo**: `id`, `name`, `color`, `description`, `displayOrder`, `objectIds[]`.
- **Bidirecional**: `activityGroups[].objectIds` (IDs de `masterObjects`) ↔ `masterObjects[].activityGroupIds` (IDs de grupos). Sincronizados via `writeBatch`.
- **Tipo**: `ActivityGroup` em `src/types/activity-group.ts`.

### Onde aparecem
- **Página dedicada** (`/grupos-atividade`): gestão completa via `ActivityGroupsManager`. Acesso restrito a `admin`/`master`. Header com botão voltar padrão.
- **Configurações** (`/configuracoes`): entrada no menu que navega para `/grupos-atividade`.
- **Cards de objeto** (`/objetos`): badges coloridas abaixo da descrição via `ActivityGroupBadges`.
- **Grafo de dependências**: badges nos nós em ambos os modos (`card` e `global`). Nós compactos mostram badges menores.
- **Filtro de objetos** (`/objetos`): toggle por grupo no painel de filtros.
- **Filtro do dashboard** (`/`): Select por grupo no popover de filtros.

### Implementação do grafo (DependencyGraph)
- Custom node type (`ObjectNode`) lê `activityGroups` via **React Context** (`GraphContext`), não via `node.data` — evita problemas de closure/memoização do ReactFlow.
- Lookup **bidirecional**: `obj.activityGroupIds.includes(g.id) || g.objectIds.includes(obj.id)`.
- `NODE_TYPES` definido fora do componente (estável).
- O contexto é atualizado via `useMemo([activityGroups, isCompact])`.

### Regras Firestore
```
match /activityGroups/{groupId} {
  allow read, list: if isNotDisabled();
  allow create, update, delete: if isAdmin();
}
```

### Padrão de carregamento
```ts
useEffect(() => {
  if (!db) return;  // guard obrigatório
  getDocs(query(collection(db, 'activityGroups'), orderBy('displayOrder')))
    .then(snap => setActivityGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}, [db]);
```

---

## 🧹 Code Quality Standards

- **Components**: Functional components with `useMemo` for heavy data transformations.
- **Types**: Use TypeScript interfaces for all component props. Avoiding `any` where possible (though tolerated in prototypes).
- Formatação pt-BR: `@/lib/formatters.tsx` (números, %, duração, datas)
- Sequência de carga (`XX.XX`): `@/lib/migration/sequence-utils.ts` — não duplicar em formatters
- **Linting**: Ensure unused variables and terminators are cleaned before every commit.

---

## ♻️ Refatoração e Boas Práticas

### Princípios de Código Limpo

1. **DRY (Don't Repeat Yourself)**
   - Extrair componentes reutilizáveis para padrões repetidos (ex: `MockSelector`)
   - Criar funções utilitárias para lógica de negócio (ex: `calculateComparativeData`)

2. **Estado com Persistência**
   - Usar `useLocalStorageState` para estados que devem persistir entre navegações
   - Evitar `useEffect` para carregar/salvar no localStorage manualmente

3. **Tipagem TypeScript**
   - Definir interfaces para objetos de dados (ex: `ComparativeObject`)
   - Evitar `any` em código novo, usar tipos explícitos

4. **Componentes Pequenos e Focados**
   - Sub-componentes para partes complexas de UI (ex: `MockSelector`, `ReportHeader`)
   - Cada componente deve ter uma única responsabilidade

5. **Funções Puras e Testáveis**
   - Extrair lógica de transformação de dados para funções puras
   - Funções puras não dependem de estado externo ou efeitos colaterais

### Exemplo de Refatoração

```tsx
// ❌ Antes: Lógica repetida e estado manual
const [mockA, setMockA] = useState("all");
const [mockB, setMockB] = useState("all");
useEffect(() => {
  const stored = localStorage.getItem("mock-a");
  if (stored) setMockA(stored);
}, []);

// Selects repetidos
<Select>...</Select>  // Baseline
<Select>...</Select>  // Alvo

// ✅ Depois: Hook unificado e componente reutilizável
const [mockA, setMockA] = useLocalStorageState("mock-a", "all");
const [mockB, setMockB] = useLocalStorageState("mock-b", "all");

<MockSelector label="Baseline" value={mockA} onChange={setMockA} mocks={mocks} />
<MockSelector label="Alvo" value={mockB} onChange={setMockB} mocks={mocks} />
```

### Padrão de Cálculos Derivados

```tsx
// ❌ Evitar: Cálculos inline no render
const successRate = (success / total) * 100;

// ✅ Preferir: useMemo para cálculos complexos
const comparativeData = useMemo(() => {
  return calculateComparativeData(objectsA, objectsB);
}, [objectsA, objectsB]);
```

---

## 🔐 Permissões & RBAC

O sistema utiliza quatro níveis de permissão, armazenados no campo `role` do documento `users/{uid}` no Firestore.

| Role | Label | Acesso |
|------|-------|--------|
| `master` | MASTER | Controle total: configurações SMTP, gerenciamento de usuários, leitura/escrita em qualquer projeto. |
| `admin` | ADMIN | Gerencia objetos, grupos de atividade, mocks e projetos. Não acessa configurações SMTP. |
| `user` | USUÁRIO | Visualiza dashboard, objetos e relatórios do projeto ao qual pertence. Sem acesso a configurações. |
| `membro` | MEMBRO | Acesso somente leitura ao dashboard e logs do projeto vinculado. |

### Regras de Firestore

```
// Helpers
function isNotDisabled() { return request.auth != null && !get(/databases/$(database)/documents/users/$(request.auth.uid)).data.disabled; }
function role() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
function isAdmin() { return isNotDisabled() && role() in ['admin', 'master']; }
function isMaster() { return isNotDisabled() && role() == 'master'; }
function isMember(projectId) {
  return isNotDisabled() && request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.memberUids;
}

// Projetos
match /projects/{projectId} {
  allow read: if isMember(projectId);
  allow create, update, delete: if isAdmin();
}

// Grupos de Atividade
match /activityGroups/{groupId} {
  allow read, list: if isNotDisabled();
  allow create, update, delete: if isAdmin();
}

// Configurações SMTP
match /settings/smtp {
  allow read, write: if isMaster();
}
```

### Controles na UI

- **Botão SMTP / Rota `/configuracoes/smtp`**: Visível e acessível apenas para `master`.
- **Página `/grupos-atividade`**: Acesso restrito a `admin`/`master`; usuários com `user`/`membro` são redirecionados.
- **Gestão de Usuários `/usuarios`**: Apenas `master` pode alterar roles ou bloquear contas.
- **Criação/edição de Mocks e Objetos**: Requer `admin` ou `master`.

---

## 🛡️ Firebase & Hook Resilience Patterns

Para garantir uma UI fluida e livre de erros de permissão ("Permission Denied") ou falhas de execução ("TypeError") durante o carregamento inicial:

### 1. Consultas Sensíveis à Autenticação
Todo hook que realiza consultas ao Firestore DEVE validar a existência do usuário antes de criar a query. Se o usuário não estiver autenticado, a query deve ser `null`.

```tsx
// Exemplo no use-email-contacts.ts
const contactsQuery = useMemoFirebase(
  () => (user ? contactsCollectionRef : null),
  [contactsCollectionRef, user]
);

const { data } = useCollection(contactsQuery); // useCollection ignora se for null
```

### 2. Renderização Condicional de Diálogos
Componentes pesados ou que disparam hooks de dados (ex: `EmailComposeDialog`) não devem ser renderizados incondicionalmente no layout ou no dashboard. Use estados booleanos para renderizá-los apenas sob demanda.

```tsx
// ✅ Correto: Carrega hooks e dados apenas quando aberto
{isComposeOpen && <EmailComposeDialog open={isComposeOpen} onOpenChange={setIsComposeOpen} />}
```

### 3. Programação Defensiva em Listagens
Ao acessar propriedades de arrays vindos de hooks assíncronos (como `.length`), use sempre *optional chaining* e valores de fallback para evitar crashes durante o "flash" de inicialização do estado.

```tsx
// ❌ Perigo: Pode crashar se filteredItems ou groups for undefined
if (filteredItems.groups.length > 0) ...

// ✅ Seguro: Resiliente a estados indefinidos
if ((filteredItems?.groups?.length ?? 0) > 0) ...
```

### 4. Tratamento de Strings e Filtros
Sempre use *optional chaining* ao realizar operações de string (`toLowerCase`, `includes`) em dados vindos do banco, pois campos opcionais podem vir nulos.

```tsx
contacts: (contacts || []).filter(c =>
  c.name?.toLowerCase().includes(term)
)
```

---

## 🧩 Component Standardization: Modularization (v2.7)

Para manter a escalabilidade e legibilidade em páginas complexas, o Migra adota a fragmentação de componentes e extração de lógica:

1.  **Page Hook (`use-*-actions.ts`)**: Encapsula todos os estados locais (modais, alertas, busca) e as funções de execução (save, delete, clone).
2.  **Sub-componentes (`src/components/[feature]/*`)**:
    - `*-header.tsx`: Controles superiores e busca.
    - `*-table.tsx`: Estrutura de listagem principal.
    - `*-row.tsx`: Lógica e visual de cada item.
    - `*-alerts.tsx`: Agrupamento de diálogos de confirmação.
3.  **Filenames**: Devem seguir o padrão **kebab-case** (ex: `mock-row.tsx`).

---

## 📝 Changelog de Mudanças Recentes

### Abril 2026 - Modularização e Melhoria de Código (v2.7)

**1. Modularização da Página de Mocks**
- Extração de lógica para o hook customizado `useMocksActions`.
- Fragmentação da UI em componentes especializados (`mock-header`, `mock-table`, `mock-row`, `mock-alerts`).

**2. Padronização de Nomenclatura**
- Consolidação de arquivos em `kebab-case` para consistência em todo o repositório.

**3. Correção de Navegação: `/objetos/[mockId]?projectId=`**
- O componente `MockRow` não passava `projectId` no link "GESTÃO", resultando em `/objetos/[mockId]` sem query param.
- A página `objetos/[mockId]/page.tsx` usa `searchParams.get("projectId")` como pré-requisito para a query Firestore — sem ele, retorna `null` e nenhum objeto é carregado.
- **Correção**: `projectId` agora é propagado como prop via `MocksContent → MockTable → MockRow` e incluído no `href` do link.

### Abril 2026 - Melhorias de UX e Layout

**1. Remoção do Card "VISÃO GERAL"**
- Removido o header "Visão Geral - Status da Migração" do dashboard.
- Cards de performance agora começam diretamente após o painel de controle.

**2. Painel de Performance Fixo (Sticky)**
- Painel com controles "PERFORMANCE POR OBJETO", "FILTROS", etc. agora usa `sticky top-16 z-40`.
- Permanece visível durante todo o scroll da página.
- Background: `bg-white border-b border-slate-200`.

**3. Painel Sempre Visível**
- Removido botão "Ocultar Indicadores".
- Cards de performance são sempre exibidos (sem animação de colapso).

**4. Correção de Contraste em Dropdowns**
- **Problema**: Texto dos itens do dropdown desaparecia no hover (fundo claro + texto claro).
- **Solução**: Adicionar explicitamente `focus:text-slate-900` ou `focus:text-red-600` nos `DropdownMenuItem`.
- **Arquivos afetados**:
  - `src/components/layout/main-sidebar.tsx` (UserMenu, menu horizontal)
  - `src/components/layout/user-badge.tsx`
- **Padrão atual**:
  ```tsx
  // User Menu
  <DropdownMenuItem className="focus:bg-slate-100 focus:text-slate-900">
  <DropdownMenuItem className="focus:bg-red-50 focus:text-red-600">
  
  // Menu Horizontal (sub-itens)
  <DropdownMenuItem className="focus:bg-slate-100 focus:text-slate-900">
    <Link className="text-slate-900">...</Link>
  </DropdownMenuItem>
  ```

**5. Redução de Espaçamento**
- Padding do conteúdo: `py-8` → `py-4` (mais compacto).
- Space-y entre seções: `space-y-8` → `space-y-6`.

**6. v2.3 - Status Reporting & Object Detail Header**
- Implementado sistema unificado de badges de status para Mocks.
- Detalhes do objeto agora exibem o status da mock em tempo real no PageHeader.
- Mocks não bloqueadas aparecem como `ABERTO` se pendentes.
- Melhoria no contraste e alinhamento visual de badges no header.

**8. v2.5 - Premium Input Feedback & Global Form UX (Abril 2026)**
- **Feedback de Foco Premium**: Implementação global de escala (`scale-[1.01]`) e sombra externa (`shadow-md`) em todos os campos de entrada (`Input`, `Textarea`, `Select`).
- **Centralização de Estilo**: Centralização das regras de foco nos componentes base de UI (`src/components/ui/`), garantindo consistência em toda a aplicação e simplificação do código de diálogos de negócio.
- **Branding SkyBlue**: Refinamento do anel de foco para utilizar tonalidades de `SkyBlue`, eliminando cores de realce padrão do navegador.

**8. v2.6 - Visual Cleanliness & Data Density (Abril 2026)**
- **Remoção de Negritos**: Eliminação sistemática de `font-bold` e `font-black` de todos os campos de entrada de dados (`Input`, `Textarea`).
- **Foco na Legibilidade**: Adoção de `font-normal` para valores técnicos e inputs, reservando o negrito apenas para rótulos (Labels) e títulos, reduzindo a carga cognitiva em formulários densos.
- **Padronização 12px**: Consolidação do tamanho `text-xs` (12px) como padrão para inputs, garantindo acessibilidade sem comprometer o layout compacto.

**9. v2.8 - Drag & Drop Reordering (Abril 2026)**
- **Reordenação de Projetos**: Implementada funcionalidade de arrastar e soltar (`@dnd-kit`) nos cards de projetos.
- **Persistência de Ordem**: A ordem customizada pelo usuário é salva no campo `projectOrder` do documento de usuário no Firestore.
- **Estabilidade de Hooks**: Introduzida regra de posicionamento de hooks de UI ao final da sequência para mitigar erros de sincronismo do React/HMR.

**10. v2.10 - Global State & Data Integrity (Abril 2026)**
- **SelectionContext**: Introdução de gerenciamento de estado global para seleções de UI (Objetos e Mocks).
- **Limpeza Automática de Logs**: Implementada rotina de expurgo total de logs técnicos anteriores ao iniciar uma nova importação de carga.
- **Segurança v2**: Atualização de IDs de administrador e refinamento de regras de expiração de sessão.
- **Resiliência Auth**: Novo sistema de tratamento de erros de autenticação Firebase (auth/user-not-found, keys expiradas).

**11. v2.11 - Fiori UI & Sequência do Dashboard (Junho 2026)**
- **Fiori Horizon**: Tokens e hovers em `src/styles/fiori-shell.css` (cards, sidebar horizontal, login).
- **Ordem unificada**: Dashboard usa `gestao-sequence.ts` + `use-dashboard-filtering.ts`; coluna **Seq.** = posição na grade.
- **Limpeza**: Removida rota morta `POST /api/fs/browse` e exports não referenciados em utilitários de migração.


---

