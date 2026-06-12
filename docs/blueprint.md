# Blueprint: Migra IS-U Data Migration Manager (v2.9)

> **Última Atualização**: Abril 2026 — Guia de Estilo Visual e Funcionalidades

O **Migra** é uma plataforma de governança e monitoramento de cargas de dados complexas para sistemas IS-U (Energia, Gás, Saneamento). Este documento define as bases técnicas e o guia de estilo visual da aplicação.

---

## 🏛️ Núcleo Funcional

### Autenticação & Autorização
- **Firebase Auth**: Email/Senha e Social login
- **Níveis de Acesso**: `master`, `admin`, `user`
- **Controle de Sessão**: Gestão de sessões ativas e locks de edição
- **Recuperação de Senha**: Reset via email (admin)

### Dashboard de Governança
- **KPIs em Tempo Real**: Volume, progresso, erros, tempo total
- **Gráficos Interativos**: Recharts com tooltips consolidados
- **Filtros Dinâmicos**: Por projeto, mock, grupo de atividade
- **Seleção Persistente**: localStorage para última mock selecionada
- **Painel Lateral**: Resumo de métricas (MOCKS, OBJETOS, VOLUME, TEMPO, ANDAMENTO)

### Gestão de Projetos
- **Silos Isolados**: Cada projeto tem dados e acesso independentes
- **Reordenação Manual**: Drag & Drop com persistência no Firestore
- **Controle de Membros**: Associação granular de usuários
- **Badges de Status**: Visual para ativo, em edição, travado

### Mocks & Janelas de Carga
- **Estados Lógicos**: `ABERTO`, `EM ANDAMENTO`, `CONCLUÍDA`, `ENCERRADO`
- **Histórico de Execução**: Múltiplas cargas por mock
- **Clone de Mock**: Duplicação rápida com histórico
- **Trava de Edição**: Lock automático para prevenir conflitos
- **Alertas Visuais**: Badges coloridos por status

### Catálogo de Objetos
- **Master Objects**: Catálogo mestre reutilizável
- **Instâncias por Mock**: Objetos específicos de cada janela
- **Dependências**: Grafo visual com @xyflow/react
- **Sequenciamento**: Ordem de carga manual e automática
- **Paralelismo**: Configuração de carga paralela
- **Importação CSV**: Upload em massa de objetos
- **Edição em Lote**: Seleção múltipla com ações bulk

### Grupos de Atividade
- **Categorização Transversal**: "Estrutura Postal", "Dados Fiscais", etc.
- **Badges Coloridos**: Visual nos cards de objetos
- **Filtros Rápidos**: Integração com dashboard e objetos
- **Sincronização Bidirecional**: `activityGroups[].objectIds[]` ↔ `masterObjects[].activityGroupIds[]`

### Logs Técnicos
- **Importação**: Upload de arquivos de log
- **Visualização**: Tabela resumida + detalhes completos
- **Filtros**: Por nível, objeto, data, mock
- **Preview**: Pré-visualização antes de importar

### Relatórios
- **Comparativo de Impacto**: Análise entre mocks baseline/alvo
- **Filtros Avançados**: Por período, projeto, status
- **Exportação**: Impressão otimizada com CSS print styles
- **KPIs Consolidados**: Métricas agregadas por período

### AI-Powered Insights
- **Genkit + Gemini**: Geração de descrições técnicas
- **Diagnóstico Automatizado**: (Planejado) Análise de erros por logs
- **Recomendações**: (Planejado) Sugestões de sequência e paralelismo

### Gestão de E-mails
- **Contatos**: CRUD de contatos individuais
- **Grupos**: Agrupamento para notificações
- **Envio**: Integração com API route `/api/email/send`
- **Multi-Select**: Componente dedicado para seleção

---

## 🎨 Guia de Estilo (Premium BI)

### Identidade Visual

| Elemento | Cor | Hex | Uso |
|----------|-----|-----|-----|
| **Primário** | SkyBlue-500 | `#00AEEF` | Accent, links, seleções |
| **Sucesso** | Emerald-500 | `#10b981` | Status positivo, completion |
| **Erro** | Red-500 | `#ef4444` | Alertas críticos, falhas |
| **Aviso** | Amber-500 | `#f59e0b` | Trava, atenção, progresso |
| **Background** | Slate-50 | `#F8FAFC` | Fundo de páginas |
| **Cards** | White | `#FFFFFF` | Fundo de componentes |
| **Texto** | Slate-900 | `#0F172A` | Texto principal |
| **Texto Secundário** | Slate-700 | `#334155` | Descrições, labels |

**⚠️ Restrição Estética**: **Proibido** o uso de tons de roxo ou lilás em qualquer componente.

### Tipografia

| Elemento | Fonte | Peso | Tamanho | Observação |
|----------|-------|------|---------|------------|
| **Headers Principais** | Inter | Black (900) | 9px-11px | `uppercase tracking-widest` |
| **Headers Secundários** | Inter | Black (900) | 9px | `uppercase tracking-widest` |
| **Métricas/KPIs** | Inter | Black (900) | Variável | Valores de destaque |
| **Valores Técnicos** | Mono | Normal | 11px-12px | IDs, durações, volumes |
| **Tabelas (células)** | Inter | Normal | 11px | `text-[11px]` |
| **Tabelas (headers)** | Inter | Black (900) | 10px | `text-[10px] uppercase` |
| **Inputs/Forms** | Inter | Normal | 12px | `text-xs`, **sem negrito** |
| **Labels/Contexto** | Inter | Normal | 10px | `text-[10px] uppercase tracking-widest` |

### Ícones (Lucide React)

| Ícone | Uso |
|-------|-----|
| `Layers` | Mocks, objetos |
| `Box` | Objetos individuais |
| `Database` | Dados, volumes |
| `Activity` | Logs, atividade |
| `FileBarChart` | Relatórios |
| `Users` | Usuários |
| `Settings` | Configurações |
| `FolderTree` | Projetos |
| `GitBranch` | Dependências |
| `Clock` | Duração, tempo |
| `CheckCircle2` | Sucesso |
| `XCircle` | Erro |
| `AlertTriangle` | Aviso |
| `Lock` | Trava, segurança |
| `Play` | Iniciar carga |
| `Square` | Finalizar carga |
| `RotateCcw` | Reiniciar carga |
| `ChevronDown` | Dropdowns |
| `Search` | Busca, filtros |
| `Filter` | Filtros avançados |
| `Download` | Exportação |
| `Upload` | Importação |
| `Plus` | Adicionar |
| `Edit` | Edição |
| `Trash2` | Exclusão |
| `Copy` | Clone, duplicar |
| `Eye` | Visualização |
| `Info` | Tooltips, info |
| `X` | Fechar dialogs |

**Estilo de Ícones**: Traço fino (`thin-stroke`), tamanho consistente (`w-4 h-4` ou `w-5 h-5`).

---

## 🖼️ Layout & Navegação

### Estrutura de Páginas

```
┌─────────────────────────────────────────────────────┐
│  MainSidebar (256px fixo)                           │
│  - Logo + Título                                    │
│  - Navegação principal (15+ itens)                  │
│  - Versão do produto                                │
├───────────────────────────┬─────────────────────────┤
│  DashboardShell            │                         │
│  ┌───────────────────────┐│  PageHeader (h-20)      │
│  │ Título + Badge        ││  - Sticky top-0 z-30    │
│  │ Context Labels        ││  - backdrop-blur-md     │
│  │ Actions + UserBadge   ││  - shadow-md            │
│  └───────────────────────┘│                         │
│                           │  Conteúdo da Página     │
│                           │  - bg-slate-50          │
│                           │  - px-6 py-4            │
└───────────────────────────┴─────────────────────────┘
```

### PageHeader (Padrão "Premium BI")

Componente reutilizável para todos os headers de páginas do dashboard.

```tsx
import { PageHeader } from "@/components/layout/page-header";

<PageHeader
    title="TÍTULO DA PÁGINA"
    subtitle="Subtítulo opcional"
    icon={<Icon className="w-5 h-5 text-slate-400" />}
    badge={<Badge>Contador</Badge>}
    backHref="/pagina-anterior"
    contextLabels={
        <>
            <ContextLabel label="PROJETO" value="Nome do Projeto" />
            <ContextLabel label="STATUS" value="EM EDIÇÃO" color="emerald" />
        </>
    }
    actions={
        <>
            <Button>Ação 1</Button>
            <UserBadge />
        </>
    }
/>
```

**Características Fixas:**
- Altura: `h-20` (80px)
- Sticky: `sticky top-0 z-30`
- Background: `bg-white/98 backdrop-blur-md`
- Borda: `border-b border-slate-200`
- Sombra: `shadow-md`
- Print: `print:hidden`

### Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  Header (h-20) com título, controles, UserBadge     │
├───────────────────────────┬─────────────────────────┤
│  Main Chart (3/4 width)   │  Sidebar KPIs (1/4)     │
│  "Resultados da Carga"    │  - MOCKS                │
│                           │  - OBJETOS              │
│                           │  - VOLUME TOTAL         │
│                           │  - TEMPO TOTAL          │
│                           │  - ANDAMENTO            │
├───────────────────────────┴─────────────────────────┤
│  Comparison Section (full width)                    │
└─────────────────────────────────────────────────────┘
```

---

## 🎛️ Componentes de UI

### Botões

```tsx
// Padrão principal
<Button className="text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-xl border-0 active:scale-95">
  Ação
</Button>

// Primário (destaque)
<Button className="bg-SkyBlue-500 text-white hover:bg-SkyBlue-600 rounded-xl border-0">
  Ação Principal
</Button>

// Destrutivo
<Button className="bg-red-500 text-white hover:bg-red-600 rounded-xl border-0">
  Excluir
</Button>
```

**Características:**
- `border-0`: Sem bordas (padrão global)
- `rounded-xl`: Cantos arredondados (12px)
- `active:scale-95`: Feedback tátil de clique
- `hover:bg-slate-200`: Hover suave

### Inputs & Formulários

```tsx
// Input padrão (não-controlado com debounce)
<Input
  className="text-xs scale-[1.01] shadow-inner focus:shadow-md transition-shadow"
  placeholder="Buscar..."
/>

// Select
<Select>
  <SelectTrigger className="text-xs border-0 bg-slate-100/80">
    <SelectValue placeholder="Selecionar" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="opt">Opção</SelectItem>
  </SelectContent>
</Select>

// Textarea
<Textarea className="text-xs scale-[1.01] shadow-inner focus:shadow-md" />
```

**Feedback de Foco (Premium):**
- **Normal**: `shadow-inner` (sombra interna)
- **Foco**: `scale-[1.01]` + `shadow-md` (elevação)
- **Transição**: `transition-shadow duration-200`

### Tabelas (Padrão Nativo)

```tsx
<table className="w-full text-[11px] border-collapse table-fixed">
  <colgroup>
    <col className="w-32" />
    <col />
  </colgroup>
  <thead className="sticky top-0 z-10">
    <tr>
      <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 border-b border-slate-400 bg-slate-200">
        Coluna
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className={cn(
      "border-b border-slate-100 transition-all duration-200 group cursor-pointer relative",
      index % 2 === 0 ? "bg-white hover:bg-slate-200/60" : "bg-slate-50/30 hover:bg-slate-200/80",
      isSelected && "bg-SkyBlue-50/70 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-SkyBlue-500"
    )}>
      <td className="px-3 py-1.5 font-mono text-slate-700 truncate">valor</td>
    </tr>
  </tbody>
</table>
```

**Características:**
- `table-fixed`: Larguras fixas via `<colgroup>`
- `sticky top-0`: Header fixo no scroll
- **Zebrado**: Linhas alternadas (`bg-white` / `bg-slate-50/30`)
- **Seleção Premium**: Indicador lateral SkyBlue-500 + background destacado
- **Hover**: `hover:bg-slate-200/60` com transição suave

### Cards de Dashboard

```tsx
// Card de Sucesso (100%)
<div className="bg-emerald-50/60 shadow-xs border-t-4 border-t-emerald-500">
  {/* Conteúdo */}
</div>

// Card de Falha (<100%)
<div className="bg-white shadow-lg border-t-4 border-t-amber-500">
  {/* Conteúdo */}
</div>

// Card de Erro Crítico
<div className="bg-white shadow-lg border-t-4 border-t-red-500">
  {/* Conteúdo */}
</div>
```

**Regras:**
- Ordenação: Pelo `chargeOrder`/`parallelOrder` do catálogo
- Borda superior: 4px colorida por status
- Background suave: `bg-emerald-50/60` para sucesso

### Checkboxes

```tsx
<Checkbox className="rounded-full border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
```

**Características:**
- `rounded-full`: Redondo (não quadrado)
- `emerald-500`: Cor de check (não accent do tema)

### Tooltips

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <Button>Hover</Button>
    </TooltipTrigger>
    <TooltipContent className="bg-slate-900 text-white">
      <p>Conteúdo do tooltip</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Padrão Global**: Dark (`bg-slate-900 text-white`)

### Dialogs/Modals

```tsx
// Fullscreen Dialog (configurações, edição completa)
<Dialog className="w-screen h-screen max-w-none max-h-none [&>button]:hidden">
  <DialogContent className="h-full flex flex-col">
    <DialogTitle className="sr-only">Título</DialogTitle>
    {/* Conteúdo */}
    <DialogFooter>
      {/* Botão de fechar manual no footer */}
      <Button onClick={() => setOpen(false)}>Fechar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Selection Dialog (640px altura)
<Dialog className="h-[640px]">
  {/* Input não-controlado com debounce 200ms via ref */}
</Dialog>
```

### Badges de Status

| Status | Cor | Uso |
|--------|-----|-----|
| `ABERTO` | SkyBlue-500 | Mock disponível para edição |
| `EM ANDAMENTO` | Amber-500 | Carga em execução |
| `CONCLUÍDA` | Emerald-500 | Carga finalizada com sucesso |
| `ENCERRADO` | Slate-500 | Mock fechada (read-only) |
| `PENDENTE` | Slate-400 | Objeto aguardando carga |
| `CARGA_EM_ANDAMENTO` | Amber-500 | Objeto sendo carregado |
| `CARGA_CONCLUIDA` | Emerald-500 | Carga do objeto finalizada |

---

## 📊 Formatação de Dados

### Utilitários Principais (`@/lib/formatters.tsx`)

```ts
import { formatNumber, formatPercentage, renderDuration } from "@/lib/formatters";

// Números: 1.234.567 (pt-BR)
formatNumber(1234567) // "1.234.567"

// Grandes volumes: 1,2M
formatNumber(1234567, { compact: true }) // "1,2M"

// Percentuais: 99,99% (2 casas, vírgula)
formatPercentage(99.99) // "99,99"

// Durações: 01h 10m (font-mono)
renderDuration(4200000) // <span>01h 10m</span>
```

**Regras:**
- **Nunca** hardcode formatação de strings
- Sempre usar `@/lib/formatters.tsx`
- Locale padrão: `pt-BR`
- Durações sempre em `font-mono`

---

## 🖨️ Impressão de Relatórios

### CSS Print Styles

```css
@media print {
  @page { size: A4; margin: 15mm; }

  .report-print-no-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Esconder elementos de UI */
  .no-print, button, nav, aside {
    display: none !important;
  }
}
```

### Padrão de Wrapper

```tsx
<div className="display: table w-full">
  <div className="display: table-header-group">
    {/* Header fixo na impressão */}
  </div>
  <div className="display: table-row-group">
    {/* Conteúdo */}
  </div>
</div>
```

---

## 🎯 Interatividade & Feedback

### Transições

```tsx
// Hover em botões
className="transition-all duration-200 hover:scale-105"

// Hover em linhas de tabela
className="transition-all duration-200 group hover:bg-slate-200/60"

// Foco em inputs
className="transition-shadow duration-200 shadow-inner focus:shadow-md"
```

### Estados de Loading

```tsx
// Spinner padrão
<Loader2 className="w-4 h-4 animate-spin" />

// Skeleton (shadcn)
<Skeleton className="w-full h-4" />

// Loading de página
<div className="flex items-center justify-center h-screen">
  <Loader2 className="w-8 h-8 animate-spin text-SkyBlue-500" />
</div>
```

### Toasts (Notificações)

```tsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

// Sucesso
toast({
  title: "Sucesso",
  description: "Operação realizada com sucesso.",
  variant: "default",
});

// Erro
toast({
  title: "Erro",
  description: "Falha ao realizar operação.",
  variant: "destructive",
});
```

---

## 📱 Responsividade

### Breakpoints (Tailwind)

| Prefixo | largura | Uso |
|---------|---------|-----|
| `sm:` | 640px | Tablets |
| `md:` | 768px | Tablets grandes |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Telas grandes |

### Detecção Mobile

```tsx
import { useMobile } from "@/hooks/use-mobile";

const isMobile = useMobile();

if (isMobile) {
  // Layout adaptado para mobile
}
```

---

## 🔧 Convenções de Código

### TypeScript

```tsx
"use client"; // Para Client Components

import { useMemo } from "react";
import { cn } from "@/lib/utils";

// Interface para props
interface MyComponentProps {
  data: MigrationObject[];
  onSelect: (id: string) => void;
  className?: string;
}

export function MyComponent({ data, onSelect, className }: MyComponentProps) {
  // useMemo para transformações pesadas de dados
  const transformed = useMemo(() => heavyTransform(data), [data]);

  return (
    <div className={cn("base-class", condition && "conditional", className)}>
      {transformed}
    </div>
  );
}
```

**Regras:**
- Interfaces para props de componentes
- Evitar `any` (tolerado apenas em prototypes)
- Strict mode habilitado
- Terminadores (ponto e vírgula) consistentes

### Padrão de Hooks

```tsx
// Ordem de declaração (estabilidade HMR)
export function MyPage() {
  // 1. Hooks de dados (primeiro)
  const { data, loading } = useDashboardData(projectId);
  const { objects } = useObjectsData(mockId);

  // 2. Hooks de estado local
  const [selected, setSelected] = useState<string | null>(null);

  // 3. Hooks de ação/UI (por último)
  const { openDialog, closeDialog } = useDashboardDialogs();
  const { handleCreate, handleDelete } = useMocksActions();

  // ... resto do componente
}
```

### Linting

```bash
# Verificar linting
npm run lint

# Verificar tipos
npm run typecheck

# Auto-fix (quando possível)
npm run lint -- --fix
```

**Regras:**
- Limpar variáveis não utilizadas antes de commit
- Importar apenas o necessário (tree-shaking)
- Usar barrel exports para imports limpos

---

## 📦 Persistência de Estado (localStorage)

### Hook Principal

```tsx
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

// Uso básico
const [value, setValue] = useLocalStorageState("chave", "valor-padrao");

// Atualização funcional (igual useState)
setValue(prev => prev + 1);

// Persistência automática entre refresh/navegação
const [selectedMock, setSelectedMock] = useLocalStorageState(
  "dashboard_last_mock_id",
  "all" // default: visão global
);
```

**Chaves comuns usadas no projeto:**

| Chave | Valor | Descrição |
|-------|-------|-----------|
| `dashboard_last_mock_id` | `string` | Mock selecionado no dashboard |
| `dashboard_last_project_id` | `string` | Projeto selecionado |
| `dashboard_show_performance` | `boolean` | Visibilidade do painel de performance |
| `relatorio-comparativo-project` | `string` | Projeto no relatório comparativo |
| `relatorio-comparativo-mock-a` | `string` | Mock baseline |
| `relatorio-comparativo-mock-b` | `string` | Mock alvo |
| `relatorio-comparativo-counter` | `number` | Contador de auditoria |

---

## 🧠 Grupos de Atividade

### Arquitetura

- **Coleção**: `activityGroups` no Firestore
- **Bidirecional**: `activityGroups[].objectIds[]` ↔ `masterObjects[].activityGroupIds[]`
- **Sincronização**: Via `writeBatch` do Firestore

### Onde Aparecem

- Página `/grupos-atividade` (gestão completa)
- Cards de objeto em `/objetos` (badges coloridas)
- Grafo de dependências (badges nos nós)
- Filtros do dashboard e objetos

---

## 🤖 Integração com IA (Genkit)

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

### Flow de Descrição

```typescript
// src/ai/flows/ai-description-generator.ts
export const aiDescriptionGenerator = defineFlow({
  name: 'aiDescriptionGenerator',
  inputSchema: z.object({ keywords: z.array(z.string()) }),
  outputSchema: z.string(),
}, async (input) => {
  const { llm } = await ai.init();
  const response = await llm.generate({
    prompt: `Gere uma descrição técnica para um objeto de migração IS-U com as seguintes palavras-chave: ${input.keywords.join(', ')}`,
  });
  return response.text;
});
```

### Executar Genkit Dev Server

```bash
# Iniciar Genkit + Next.js
npm run genkit:watch

# Acessar UI do Genkit
# http://localhost:4000
```

---

> **Desenvolvido por H2D Consultoria** — 2026
