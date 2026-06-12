# Migra - Contexto do Projeto

## 📋 Visão Geral

**Migra** é um sistema de gestão técnica para migrações de dados IS-U, desenvolvido com Next.js 15, Firebase (Firestore/Auth) e Genkit (IA Google Gemini). A aplicação fornece dashboards de BI premium, gestão de mocks, objetos de migração, logs técnicos e relatórios.

### Tecnologias Principais

| Categoria | Tecnologia |
|-----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Linguagem** | TypeScript 5 (strict mode) |
| **UI/Styling** | React 19, Tailwind CSS, Radix UI, ShadCN |
| **Ícones** | Lucide React |
| **Visualização** | Recharts |
| **Backend** | Firebase Firestore, Firebase Auth |
| **IA** | Genkit (Google Gemini) |
| **Grafo** | ReactFlow (@xyflow/react) |

### Estrutura do Projeto

```
src/
├── app/
│   ├── (dashboard)/     # Páginas autenticadas (route group)
│   │   ├── mocks/       # Gestão de mocks de carga
│   │   ├── objetos/     # Objetos de migração
│   │   ├── logs/        # Logs técnicos
│   │   ├── relatorios/  # Relatórios
│   │   ├── configuracoes/
│   │   └── ...
│   ├── api/             # API routes (admin, email, logs)
│   ├── login/           # Autenticação
│   └── layout.tsx       # Root layout
├── components/
│   ├── dashboard/       # Componentes do dashboard
│   ├── objetos/         # Componentes de objetos
│   ├── layout/          # Sidebar, headers
│   ├── ui/              # Componentes shadcn/ui
│   └── shared/          # Componentes compartilhados
├── firebase/            # Config e hooks Firebase
├── hooks/               # Custom hooks (useLocalStorageState, usePresence)
├── lib/                 # Utilities (formatters.tsx)
├── types/               # TypeScript interfaces
└── ai/                  # Genkit AI flows
```

---

## 🚀 Comandos de Desenvolvimento

```bash
# Instalação
npm install

# Desenvolvimento (porta 9002)
npm run dev

# Genkit AI development
npm run genkit:dev
npm run genkit:watch

# Build de produção
npm run build

# Servir produção
npm start

# Linting e typecheck
npm run lint
npm run typecheck
```

### Configuração de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...

# Firebase Admin SDK (server-side apenas)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Superadmin UID
SUPERADMIN_UID=...
```

---

## 🎨 Design System "Premium BI"

### Paleta de Cores

| Uso | Cor |
|-----|-----|
| **Primário/Accent** | SkyBlue (`#3B82F6`) |
| **Sucesso** | Emerald-500 (`#10b981`) |
| **Erro/Alerta** | Red-500 (`#ef4444`) |
| **Aviso** | Amber-500 (`#f59e0b`) |
| **Background** | Slate-50 (`bg-slate-50`) |
| **Cards** | White (`bg-white`) |

### Tipografia

- **Headers**: `font-black uppercase tracking-widest` (9px-11px para secundários)
- **Valores/Métricas**: `font-mono` para dados técnicos, durações, contagens
- **Tabelas**: `text-[11px]` células, `text-[10px]` headers

### Componentes Chave

- **Botões**: `text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-xl border-0`
- **Select Items**: Hover/selected usam `slate-100` (não accent do tema)
- **Checkboxes**: Redondos (`rounded-full`) com `emerald-500`
- **Tooltips**: Dark (`bg-slate-900 text-white`) como padrão global

---

## 📊 Padrões de Implementação

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

### Formatação de Dados

```ts
import { formatNumber, formatPercentage, renderDuration } from "@/lib/formatters";

// Números: 1.234.567 (pt-BR)
formatNumber(1234567) // "1.234.567"

// Grandes volumes: 1,2M
// Percentuais: 99,99% (2 casas, vírgula)
formatPercentage(99.99) // "99,99"

// Durações: 01h 10m (font-mono)
renderDuration(4200000) // <span>01h 10m</span>
```

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

### Cards de Dashboard

- **Sucesso (100%)**: `bg-emerald-50/60 shadow-xs border-t-4 border-t-emerald-500`
- **Falha (<100%)**: `bg-white shadow-lg permanente border-t-4 border-t-amber-500/red-500`
- **Ordenação**: Pelo `chargeOrder`/`parallelOrder` do catálogo

### Persistência de Estado (localStorage)

```ts
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

// Mock selecionado (sync entre Dashboard e páginas)
const [selectedMock, setSelectedMock] = useLocalStorageState(
  "dashboard_last_mock_id",
  "all" // default: visão global
);

// Default inteligente: primeiro mock "EM ANDAMENTO"
```

---

## 🔐 Segurança e Regras do Firestore

### Níveis de Acesso

| Role | Permissões |
|------|------------|
| **master** | Acesso total (UID hardcoded + role) |
| **admin** | CRUD em configurações, usuários, catálogo |
| **user** | Leitura/escrita limitada a projetos associados |

### Regras Principais

```javascript
// users: leitura própria ou por admin
match /users/{userId} {
  allow read: if request.auth.uid == userId || isAdmin();
  allow update: if isAdmin() || (self && role unchanged);
}

// projects: membros do projeto ou admin
match /projects/{projectId} {
  allow read: if hasProjectAccess(projectId);
  allow write: if isAdmin();
}

// masterObjects/catalogo: leitura pública (logado), escrita admin
match /masterObjects/{id} {
  allow read, list: if isNotDisabled();
  allow write: if isAdmin();
}
```

---

## 🧩 Componentes e Hooks Principais

### Hooks

| Hook | Descrição |
|------|-----------|
| `useLocalStorageState<T>` | Estado persistente no localStorage com suporte a atualizações funcionais |
| `usePresence` | Gestão de presença do usuário (online/offline) |
| `useEditLock` | Lock de edição em documentos Firestore |
| `useFirestore` | Hook para acessar instância do Firestore |
| `useDoc` | Hook para ler documento do Firestore |
| `useCollection` | Hook para ler coleção do Firestore |
| `useUser` | Estado de autenticação do usuário |
| `useMemoFirebase` | Memoização de queries Firebase |

#### useLocalStorageState

```ts
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

// Uso básico
const [value, setValue] = useLocalStorageState("chave", "valor-padrao");

// Atualização funcional (igual useState)
setValue(prev => prev + 1);

// Persistência automática entre refresh/navegação
const [selectedMock, setSelectedMock] = useLocalStorageState(
  "dashboard_last_mock_id",
  "all"
);
```

**Chaves comuns usadas no projeto:**
- `dashboard_last_mock_id` - Mock selecionado no dashboard
- `dashboard_last_project_id` - Projeto selecionado
- `dashboard_show_performance` - Visibilidade do painel de performance
- `relatorio-comparativo-project` - Projeto no relatório comparativo
- `relatorio-comparativo-mock-a/b` - Mocks baseline/alvo
- `relatorio-comparativo-counter` - Contador de auditoria

### Componentes de Layout

- **MainSidebar**: Navegação principal (desktop)
- **DashboardShell**: Wrapper de páginas autenticadas
- **PageHeader**: Componente padronizado para headers de páginas

#### PageHeader (Padrão "Premium BI")

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

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `title` | `string` | Título principal da página |
| `subtitle` | `string` | Subtítulo/descrição |
| `badge` | `ReactNode` | Badge ao lado do título |
| `icon` | `ReactNode` | Ícone antes do título |
| `backHref` | `string` | URL para botão de voltar |
| `context` | `ReactNode` | Contexto inline (breadcrumbs) |
| `contextLabels` | `ReactNode` | Labels estruturados (ex: Projeto, Status) |
| `actions` | `ReactNode` | Ações/controles do header |
| `className` | `string` | Classes CSS adicionais |

**Características:**
- Altura fixa: `h-20` (80px)
- Sticky: `sticky top-0 z-30`
- Background: `bg-white/98 backdrop-blur-md`
- Borda: `border-b border-slate-200`
- Sombra: `shadow-md` (padrão, pode ser removida com `className="shadow-none"`)
- Print: `print:hidden`

**Páginas que usam PageHeader (15 total):**
- `/` (Dashboard)
- `/mocks` (Gestão de Mocks)
- `/objetos` (Objetos Master)
- `/objetos/[mockId]` (Detalhes da Mock)
- `/logs` (Consulta de Logs)
- `/projetos` (Projetos)
- `/grupos-atividade` (Grupos de Atividade)
- `/relatorios` (Relatórios)
- `/relatorios/comparativo` (Análise de Impacto)
- `/configuracoes` (Configurações)
- `/usuarios` (Usuários)
- `/perfis` (Gerenciar Perfis)
- `/perfil` (Perfil do Usuário)
- `/sobre` (Sobre o Produto)
- `/docs` (Documentação Técnica)

### Dialogs/Modals

```tsx
// Fullscreen Dialog
<Dialog className="w-screen h-screen max-w-none max-h-none rounded-none [&>button]:hidden">
  <DialogTitle className="sr-only">Título</DialogTitle>
  {/* Botão de fechar manual no footer */}
</Dialog>

// Selection Dialog
<Dialog className="h-[640px]">
  {/* Input não-controlado com debounce 200ms via ref */}
</Dialog>
```

---

## 📁 Tipos de Dados Principais

### MigrationObject

```ts
interface MigrationObject {
  id: string;
  mockId: string;
  projectId: string;
  masterObjectId?: string;
  name: string;
  description: string;
  chargeGroup?: string;
  chargeOrder?: string | number;
  
  // Timestamps de carga
  initialChargeStartTime?: string;
  chargeStartTime: string;
  chargeEndTime: string;
  
  // Métricas
  targetRecordsCount: number;
  processedRecordsCount: number;
  successfulRecordsCount: number;
  errorRecordsCount: number;
  currentChargeDurationMs: number;
  
  status?: 'PENDENTE' | 'CARGA_EM_ANDAMENTO' | 'CARGA_CONCLUIDA';
  dependencyIds?: string[];
  isParallel?: boolean;
  parallelOrder?: string | number;
}
```

### Mock

```ts
interface Mock {
  id: string;
  projectId: string;
  name: string; // ex: "MOCK-001"
  explanatoryText: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  status?: string;
  quantityExistingObjects: number;
  loadHistory?: LoadHistoryEntry[];
}
```

### MasterObject (Catálogo)

```ts
interface MasterObject {
  id: string;
  name: string;
  description: string;
  type?: "MASTER" | "TRANSACTIONAL" | "TECHNICAL" | "SCRIPT";
  status?: "ATIVO" | "INATIVO" | "LEGACY";
  chargeGroup?: string;
  chargeOrder?: string | number;
  parallelOrder?: string;
  isParallel?: boolean;
  dependencyIds?: string[];
  externalDependencies?: string[];
  activityGroupIds?: string[];
}
```

---

## 🧠 Grupos de Atividade

Funcionalidade para agrupar objetos por contexto (ex: "Estrutura Postal", "Dados Fiscais").

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

## 📝 Convenções de Código

### Components

```tsx
"use client"; // Para Client Components

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function MyComponent({ data }: MyComponentProps) {
  // useMemo para transformações pesadas de dados
  const transformed = useMemo(() => heavyTransform(data), [data]);
  
  return <div className={cn("base-class", condition && "conditional")}>{transformed}</div>;
}
```

### Formatters

- **Nunca** hardcode formatação de strings
- Sempre usar `@/lib/formatters.tsx`
- Locale padrão: `pt-BR`

### TypeScript

- Interfaces para props de componentes
- Evitar `any` (tolerado apenas em prototypes)
- Strict mode habilitado

### Linting

- Limpar variáveis não utilizadas antes de commit
- Terminadores (ponto e vírgula) consistentes

---

## 🖨️ Impressão de Relatórios

```css
@media print {
  @page { size: A4; margin: 15mm; }
  
  .report-print-no-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
```

- Wrapper com `display: table`
- Header fixo com `display: table-header-group`

---

## 🔧 Configurações Especiais (next.config.ts)

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['@genkit-ai/google-genai', 'genkit'],
  serverExternalPackages: ['firebase-admin', '@google-cloud/firestore'],
};
```

---

## 📚 Documentação Relacionada

- `migra-app.md`: Regras de design e arquitetura detalhadas
- `README.md`: Guia de início rápido
- `docs/`: Documentação adicional do projeto
