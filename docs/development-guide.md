# Guia de Desenvolvimento: Migra (v2.11)

> **Junho 2026** — Guia prático para desenvolvimento no projeto Migra

Este documento fornece diretrizes, padrões e exemplos práticos para desenvolvimento no projeto Migra.

---

## 📋 Índice

1. [Ambiente de Desenvolvimento](#-ambiente-de-desenvolvimento)
2. [Estrutura de Pastas](#-estrutura-de-pastas)
3. [Padrões de Código](#-padrões-de-código)
4. [Componentes](#-componentes)
5. [Hooks Customizados](#-hooks-customizados)
6. [TypeScript & Tipagem](#-typescript--tipagem)
7. [Firebase](#-firebase)
8. [Formulários](#-formulários)
9. [Estilos & UI](#-estilos--ui)
10. [Testes](#-testes)
11. [Performance](#-performance)
12. [Git & Commits](#-git--commits)
13. [Troubleshooting](#-troubleshooting)

---

## 🛠️ Ambiente de Desenvolvimento

### Pré-requisitos

```bash
# Verificar versões
node -v    # >= 18
npm -v     # >= 9
```

### Instalação

```bash
# Clone e instale
git clone <repo-url>
cd migra
npm install

# Copiar variáveis de ambiente
cp .env.example .env.local
# Preencher .env.local com credenciais Firebase
```

### Comandos Principais

```bash
# Desenvolvimento (porta 9002, Turbopack)
npm run dev

# Genkit AI (desenvolvimento)
npm run genkit:dev
npm run genkit:watch       # Com hot-reload

# Build produção
npm run build

# Servir produção
npm start

# Linting
npm run lint

# Typecheck
npm run typecheck
```

### Extensões Recomendadas (VS Code)

- **ESLint**: Validação em tempo real
- **Prettier**: Formatação automática
- **Tailwind CSS IntelliSense**: Autocomplete de classes
- **Firebase**: Deploy e debugging
- **Error Lens**: Destaque de erros no código

---

## 📁 Estrutura de Pastas

### Regras de Organização

```
src/
├── app/                      # Rotas (App Router)
│   └── (dashboard)/
│       └── feature/
│           ├── page.tsx      # Página principal
│           ├── components/   # Componentes locais
│           └── hooks/        # Hooks locais
├── components/               # Componentes compartilhados
│   └── feature/              # Por feature (mocks, objetos, etc.)
├── hooks/                    # Hooks globais
├── firebase/                 # Configuração Firebase
├── lib/                      # Utilitários
└── types/                    # Interfaces TypeScript
```

**Regras:**
1. Componentes usados em **múltiplas features** → `src/components/`
2. Componentes de **uma única página** → `src/app/(dashboard)/feature/components/`
3. Hooks de **dados Firestore** → `src/hooks/use-*-data.ts`
4. Hooks de **ações/estado UI** → `src/hooks/use*Actions.ts`
5. Hooks de **uma única página** → `src/app/(dashboard)/feature/hooks/`
6. **Formatação pt-BR** → `@/lib/formatters.tsx`; **sequência de carga** → `@/lib/migration/sequence-utils.ts`; **ordem dashboard/gestão** → `@/lib/migration/gestao-sequence.ts`

---

## 📝 Padrões de Código

### Imports

```tsx
// 1. React e bibliotecas externas
import { useState, useMemo, useCallback } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

// 2. Componentes e hooks do projeto
import { PageHeader } from "@/components/layout/page-header";
import { useDashboardData } from "@/hooks/use-dashboard-data";

// 3. Utilitários e tipos
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import type { MigrationObject, Mock } from "@/types/migration";
```

### Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| **Componentes** | PascalCase | `MockTable`, `PageHeader` |
| **Hooks** | camelCase (prefixo `use`) | `useMocksActions`, `useDashboardData` |
| **Tipos/Interfaces** | PascalCase | `MigrationObject`, `MockCardProps` |
| **Variáveis/Funções** | camelCase | `handleCreate`, `selectedMock` |
| **Constantes** | UPPER_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_PAGE_SIZE` |
| **Arquivos** | kebab-case | `mock-table.tsx`, `use-dashboard-data.ts` |

### Ordem de Declaração (Componentes)

```tsx
"use client";

// 1. Imports
import { useState, useMemo } from "react";

// 2. Interface de props
interface MyComponentProps {
  data: MigrationObject[];
  onSelect: (id: string) => void;
  className?: string;
}

// 3. Componente principal
export function MyComponent({ data, onSelect, className }: MyComponentProps) {
  // 4. Hooks (dados primeiro, depois estado, depois ações)
  const { loading } = useDashboardData(projectId);
  const [selected, setSelected] = useState<string | null>(null);
  const { openDialog } = useDialogs();

  // 5. Memos e callbacks
  const filteredData = useMemo(() => filterData(data), [data]);
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    onSelect(id);
  }, [onSelect]);

  // 6. Render
  return (
    <div className={cn("base", className)}>
      {/* JSX */}
    </div>
  );
}
```

---

## 🧩 Componentes

### Criando um Novo Componente

```tsx
// src/components/mocks/mock-status-badge.tsx
"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MockStatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG = {
  ABERTO: { color: "bg-SkyBlue-500/10 text-SkyBlue-700", label: "ABERTO" },
  "EM ANDAMENTO": { color: "bg-amber-500/10 text-amber-700", label: "EM ANDAMENTO" },
  CONCLUÍDA: { color: "bg-emerald-500/10 text-emerald-700", label: "CONCLUÍDA" },
  ENCERRADO: { color: "bg-slate-500/10 text-slate-700", label: "ENCERRADO" },
} as const;

export function MockStatusBadge({ status, className }: MockStatusBadgeProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    color: "bg-slate-500/10 text-slate-600",
    label: status,
  };

  return (
    <Badge className={cn("text-[10px] uppercase tracking-widest", config.color, className)}>
      {config.label}
    </Badge>
  );
}
```

### Página com Componentes Extraídos

```tsx
// src/app/(dashboard)/mocks/page.tsx
"use client";

import { PageHeader } from "@/components/layout/page-header";
import { MockHeader } from "@/components/mocks/mock-header";
import { MockTable } from "@/components/mocks/mock-table";
import { MockAlerts } from "@/components/mocks/mock-alerts";
import { useMocksData } from "@/hooks/use-mocks-data";
import { useMocksActions } from "@/hooks/useMocksActions";

export default function MocksPage() {
  // Hooks
  const { mocks, loading, error } = useMocksData(projectId);
  const { handleCreate, handleDelete, isDeleteDialogOpen } = useMocksActions();

  // Loading state
  if (loading) return <LoadingSpinner />;

  // Error state
  if (error) return <ErrorMessage error={error} />;

  return (
    <>
      <PageHeader title="GESTÃO DE MOCKS" />
      <MockHeader onCreate={handleCreate} />
      <MockTable mocks={mocks} onDelete={handleDelete} />
      <MockAlerts deleteDialogOpen={isDeleteDialogOpen} />
    </>
  );
}
```

---

## 🪝 Hooks Customizados

### Hook de Dados (Firestore)

```tsx
// src/hooks/use-mocks-data.ts
"use client";

import { useMemo } from "react";
import { useCollection } from "@/firebase/firestore/use-collection";
import type { Mock } from "@/types/migration";

interface UseMocksDataReturn {
  mocks: Mock[];
  loading: boolean;
  error: Error | null;
}

export function useMocksData(projectId: string | null): UseMocksDataReturn {
  const mocksRef = useMemo(() => {
    if (!projectId) return null;
    return `projects/${projectId}/mocks`;
  }, [projectId]);

  const { data, loading, error } = useCollection<Mock>(mocksRef);

  return {
    mocks: data ?? [],
    loading,
    error,
  };
}
```

### Hook de Ações/UI

```tsx
// src/hooks/useMocksActions.ts
"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseMocksActionsReturn {
  isDeleteDialogOpen: boolean;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  handleDelete: (mockId: string) => Promise<void>;
}

export function useMocksActions(projectId: string): UseMocksActionsReturn {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const openDeleteDialog = useCallback(() => setIsDeleteDialogOpen(true), []);
  const closeDeleteDialog = useCallback(() => setIsDeleteDialogOpen(false), []);

  const handleDelete = useCallback(async (mockId: string) => {
    try {
      // Lógica de deleção
      await deleteMock(projectId, mockId);
      toast({ title: "Mock excluída com sucesso." });
      closeDeleteDialog();
    } catch (error) {
      toast({ title: "Erro ao excluir mock.", variant: "destructive" });
    }
  }, [projectId, toast, closeDeleteDialog]);

  return {
    isDeleteDialogOpen,
    openDeleteDialog,
    closeDeleteDialog,
    handleDelete,
  };
}
```

### Hook de Estado Persistente (localStorage)

```tsx
// src/hooks/use-local-storage-state.ts
import { useState, useCallback, useEffect } from "react";

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Silenciar erros de storage (ex: modo privado)
    }
  }, [key, state]);

  return [state, setState];
}
```

---

## 🔷 TypeScript & Tipagem

### Interfaces para Props

```tsx
// Sempre definir interfaces para props
interface ObjectCardProps {
  object: MigrationObject;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}

// Evitar inline props types
export function ObjectCard({ object, isSelected, onSelect, className }: ObjectCardProps) {
  // ...
}
```

### Tipos vs. Interfaces

```tsx
// Use `interface` para objetos nomeados (extensível)
interface Mock {
  id: string;
  name: string;
  status?: string;
}

// Use `type` para uniões, interseções, utilitários
type MockStatus = "ABERTO" | "EM ANDAMENTO" | "CONCLUÍDA" | "ENCERRADO";
type MockWithObjects = Mock & { objects: MigrationObject[] };
```

### Evitando `any`

```tsx
// ❌ Ruim
function processData(data: any) {
  return data.map((item: any) => item.name);
}

// ✅ Bom
function processData(data: MigrationObject[]): string[] {
  return data.map((item) => item.name);
}

// Tolerado: Prototypes, logs, integração externa
function logError(error: any) {
  console.error("Erro inesperado:", error);
}
```

### Type Guards

```tsx
function isMock(obj: Mock | MasterObject): obj is Mock {
  return "projectId" in obj;
}

function isMigrationObject(obj: unknown): obj is MigrationObject {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "mockId" in obj &&
    "chargeStartTime" in obj
  );
}
```

---

## 🔥 Firebase

### Configurando Firebase Client

```tsx
// src/firebase/config.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Lendo uma Coleção

```tsx
import { useCollection } from "@/firebase/firestore/use-collection";
import type { Mock } from "@/types/migration";

function MockList({ projectId }: { projectId: string }) {
  const path = `projects/${projectId}/mocks`;
  const { data, loading, error } = useCollection<Mock>(path);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <ul>
      {data?.map((mock) => (
        <li key={mock.id}>{mock.name}</li>
      ))}
    </ul>
  );
}
```

### Escrevendo no Firestore

```tsx
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";

async function createMock(projectId: string, mockData: Partial<Mock>) {
  const mockRef = doc(db, `projects/${projectId}/mocks`);
  await setDoc(mockRef, {
    ...mockData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return mockRef.id;
}
```

### Operações em Batch

```tsx
import { writeBatch, doc } from "firebase/firestore";
import { db } from "@/firebase/config";

async function syncActivityGroups(groupId: string, objectIds: string[]) {
  const batch = writeBatch(db);

  // Atualizar grupo
  const groupRef = doc(db, `activityGroups/${groupId}`);
  batch.update(groupRef, { objectIds });

  // Atualizar objetos (bidirecional)
  for (const objectId of objectIds) {
    const objectRef = doc(db, `masterObjects/${objectId}`);
    batch.update(objectRef, {
      activityGroupIds: arrayUnion(groupId),
    });
  }

  await batch.commit();
}
```

### Firebase Admin (Server-Side)

```tsx
// src/lib/admin-auth.ts
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/firebase/admin";

export async function verifyAdminToken(token: string) {
  const adminApp = getAdminApp();
  const auth = getAuth(adminApp);
  const decoded = await auth.verifyIdToken(token);
  return decoded;
}
```

---

## 📋 Formulários

### React Hook Form + Zod

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const mockFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de fim é obrigatória"),
});

type MockFormData = z.infer<typeof mockFormSchema>;

export function MockFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<MockFormData>({
    resolver: zodResolver(mockFormSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
    },
  });

  const onSubmit = async (data: MockFormData) => {
    await createMock(data);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <Input {...field} className="text-xs" />
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Input Não-Controlado com Debounce

```tsx
import { useRef, useEffect } from "react";

function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSearch(e.target.value);
    }, 200); // Debounce 200ms
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return <Input ref={inputRef} onChange={handleChange} placeholder="Buscar..." />;
}
```

---

## 🎨 Estilos & UI

### Tailwind + cn()

```tsx
import { cn } from "@/lib/utils";

// Combinar classes condicionais
<div className={cn(
  "base-classes",
  condition && "classes-condicionais",
  variant === "success" && "classes-sucesso",
  variant === "error" && "classes-erro",
  className // permitir customização externa
)} />
```

### Padrão Premium Input

```tsx
<Input
  className={cn(
    "text-xs",
    "scale-[1.01] shadow-inner",
    "focus:shadow-md transition-shadow duration-200",
    "border-0 bg-slate-100/80",
    "placeholder:text-slate-400"
  )}
/>
```

### Tabela Premium

```tsx
<table className="w-full text-[11px] border-collapse table-fixed">
  <thead className="sticky top-0 z-10">
    <tr>
      <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 border-b border-slate-400 bg-slate-200">
        Coluna
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className={cn(
      "border-b border-slate-100 transition-all duration-200 cursor-pointer relative",
      index % 2 === 0 ? "bg-white hover:bg-slate-200/60" : "bg-slate-50/30 hover:bg-slate-200/80",
      isSelected && "bg-SkyBlue-50/70 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-SkyBlue-500"
    )}>
      <td className="px-3 py-1.5 font-mono text-slate-700 truncate">valor</td>
    </tr>
  </tbody>
</table>
```

---

## 🧪 Testes

### Estrutura de Testes (Planejado)

```
tests/
├── unit/
│   ├── hooks/
│   │   └── useLocalStorageState.test.ts
│   ├── lib/
│   │   └── formatters.test.ts
│   └── components/
│       └── MockStatusBadge.test.ts
└── integration/
    └── mocks-page.test.tsx
```

### Exemplo de Teste Unitário

```tsx
// tests/unit/lib/formatters.test.ts
import { formatNumber, formatPercentage } from "@/lib/formatters";

describe("formatters", () => {
  it("should format numbers in pt-BR", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });

  it("should format percentages with 2 decimals", () => {
    expect(formatPercentage(99.99)).toBe("99,99");
  });
});
```

---

## ⚡ Performance

### useMemo para Dados Pesados

```tsx
// ❌ Recalcula em cada render
const filtered = objects.filter(obj => obj.status === "PENDENTE");

// ✅ Memoizado
const filtered = useMemo(
  () => objects.filter(obj => obj.status === "PENDENTE"),
  [objects]
);
```

### useCallback para Callbacks

```tsx
// Evita re-render de filhos
const handleSelect = useCallback(
  (id: string) => setSelectedId(id),
  [] // Sem dependências = função estável
);
```

### Virtualização (TanStack Virtual)

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualizedList({ items }: { items: MigrationObject[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ overflow: "auto" }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Otimizações de Build

```typescript
// next.config.ts
{
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
}
```

**Importar apenas o necessário:**

```tsx
// ❌ Importa tudo
import * as Icons from "lucide-react";

// ✅ Tree-shaking
import { Loader2, Plus, Trash2 } from "lucide-react";
```

---

## 📦 Git & Commits

### Convenção de Commits

```
<type>(<scope>): <description>

[optional body]
```

**Types:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `refactor`: Refatoração sem mudança de comportamento
- `docs`: Documentação
- `style`: Formatação, estilo (sem mudança de lógica)
- `test`: Adição ou correção de testes
- `chore`: Manutenção, dependências, CI

**Exemplos:**

```bash
# Nova funcionalidade
feat(mocks): adicionar clone de mock via diálogo

# Correção
fix(dashboard): corrigir cálculo de duração de carga

# Refatoração
refactor(objetos): extrair hook useObjectsPage

# Documentação
docs: atualizar guia de desenvolvimento

# Estilo
style(ui): ajustar espaçamento de tabelas

# Testes
test(formatters): adicionar testes de formatação

# Manutenção
chore: atualizar dependências Firebase
```

### Boas Práticas

```bash
# Verificar status
git status && git diff HEAD && git log -n 3

# Adicionar arquivos específicos
git add src/components/mocks/ src/hooks/useMocksActions.ts

# Commit com mensagem clara
git commit -m "feat(mocks): adicionar componente de clone de mock

- Criar MockCloneDialog com seleção de projeto alvo
- Integrar com useMocksActions para handler de criação
- Adicionar toast de sucesso/erro"

# Verificar commit
git status
```

---

## 🔧 Troubleshooting

### ChunkLoadError

**Problema**: Erro de carregamento de chunks após deploy.

**Solução**: Build ID estável configurado em `next.config.ts`.

```typescript
generateBuildId: () => 'migra-stable-v1'
```

### Firestore Permission Denied

**Problema**: Usuário não tem acesso a coleção.

**Verificar**:
1. Usuário está em `memberUids` do projeto?
2. Regras do Firestore estão corretas?
3. Token de autenticação válido?

### HMR Instability

**Problema**: Hot Module Replacement não funciona corretamente.

**Solução**: Declarar hooks de ação **após** hooks de dados.

```tsx
// ✅ Ordem correta
const { data } = useDashboardData();    // Dados primeiro
const { openDialog } = useDialogs();    // Ações depois
```

### localStorage não Persiste

**Problema**: Estado não persiste entre sessões.

**Verificar**:
1. Navegador em modo privado?
2. Chave correta no `useLocalStorageState`?
3. JSON válido (sem circular refs)?

### Build Falhando

```bash
# Verificar erros de tipo
npm run typecheck

# Verificar linting
npm run lint

# Limpar cache
rm -rf .next
npm run build
```

---

## 📚 Recursos Úteis

### Documentação

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev/)
- [Firebase Docs](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [ShadCN UI](https://ui.shadcn.com/)
- [Genkit](https://firebase.google.com/docs/genkit)

### Links Internos

- [README.md](../README.md) — Visão geral do projeto
- [ARCHITECTURE.md](../ARCHITECTURE.md) — Arquitetura técnica
- [blueprint.md](./blueprint.md) — Guia de estilo visual
- [QWEN.md](../QWEN.md) — Contexto para agentes IA

---

> **Desenvolvido por H2D Consultoria** — 2026
