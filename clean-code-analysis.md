# Análise Clean Code — migra

_Gerado em: 2026-04-12_
_Atualizado em: 2026-04-30_

---

## 1. Arquivos Críticos por Tamanho

| Arquivo | Linhas | Problema |
|---|---|---|
| `src/app/(dashboard)/docs/page.tsx` | ~100 | [OK] Dados extraídos para `src/data/docs.ts` |
| `src/app/(dashboard)/objetos/page.tsx` | ~700 | [OK] Agora usa `<ObjetosFilters />` |
| `src/app/(dashboard)/objetos/[mockId]/page.tsx` | 797 | Page muito acoplada; lógica deveria estar em hooks |

**Regra violada:** Single Responsibility — cada arquivo deve ter um único motivo para mudar.

---

## 2. Abuso de `any` — Alta Severidade

Arquivos refatorados e tipados (CONCLUÍDO):
- [OK] **`use-dashboard-quick-edit.ts`** — `db`, `user`, `userProfile`, `toast` tipados. Removido `any`.
- [OK] **`dashboard-modals.tsx`** — props tipadas, removido `any`.
- [OK] **`use-mocks-actions.ts`** — Tipagem forte adicionada.
- [OK] **`use-objects-crud.ts`** — `db`, `user`, `toast` tipados.
- [OK] **`use-objects-page.ts`** — Totalmente tipado, removido `any` em queries e loops.
- [OK] **`use-objects-import.ts`** — Tipado para segurança em batches do Firestore.

Arquivos refatorados e tipados (CONCLUÍDO):
- [OK] **`configuracoes/page.tsx`** e **`usuarios/page.tsx`** — Removido `any`.

**Corrective actions:**
- Criar tipos `AppUser`, `UserProfile`, `ToastFn`, `AppDb` e substituir `any` nesses contratos (CONCLUÍDO nos hooks principais)
- Remover `(window as any).refreshData` — substituir por evento customizado (`CustomEvent`) ou estado React (CONCLUÍDO: removido uso em `use-dashboard-quick-edit.ts`)

---

## 3. `console.log` de Debug Residuais

**`src/components/logs/log-import-dialog.tsx`** — ~15 logs sequenciais de debug (linhas 226–310):
```
[LogImport] Processing object:
[LogImport] Created file entry:
[LogImport] Final selectedFiles count:
[LogImport] ========== runImport START ==========
[LogImport] Step 1: Getting Firebase Auth token
...
```
Esses logs foram usados para debug e devem ser removidos antes de produção.

Outros arquivos com `console.log` de debug (não erro):
- `src/app/(dashboard)/utilitarios/clonar-projeto/page.tsx:125` — `Encontrados ${list.length} mocks`

`console.error` e `console.warn` em catch blocks são **aceitáveis** (tratamento de erro).

---

## 4. Suppressions de ESLint/Deps

Arquivos com `eslint-disable`:
| Arquivo | Linha | Motivo suspeito |
|---|---|---|
| `EmailComposeDialog.tsx` | 187 | `react-hooks/exhaustive-deps` |
| `use-doc.tsx` | 103 | `react-hooks/exhaustive-deps` |
| `use-edit-lock.ts` | 91, 183, 196 | `react-hooks/exhaustive-deps` (3×) |
| `usePresence.ts` | 67 | `react-hooks/exhaustive-deps` |

**Regra:** cada supressão deve ter um comentário explicando **por que** as deps estão omitidas. Caso contrário, representa risco de stale closure.

---

## 5. Naming Inconsistency (Padrão kebab-case)

Status:
- [OK] **`src/hooks/`**: `use-mocks-actions.ts`, `use-presence.ts` padronizados.
- [OK] **`src/app/(dashboard)/hooks/`**: Todos os hooks (`use-dashboard-*`) padronizados.
- [OK] **`src/app/(dashboard)/objetos/hooks/`**: Todos os hooks (`use-objects-*`) padronizados.
- [OK] **`src/app/(dashboard)/components/`**: Componentes principais padronizados para kebab-case.

---

## 6. Duplicação de Código — `objetos/page.tsx`

`objetos/page.tsx` contém inline o mesmo JSX de filtros que já existe em `objetos/components/objetos-filters.tsx` (grupos de atividade, status, limpar filtros). O componente existe mas o page não o usa — o JSX foi replicado.

**Ação:** Substituir o bloco inline em `page.tsx` pelo `<ObjetosFilters />` já extraído.

---

## 7. Anti-Pattern: `window as any` para Comunicação

Em `useDashboardQuickEdit.ts:126`:
```ts
.then(() => { if (typeof (window as any).refreshData === 'function') (window as any).refreshData(); ... })
```
Este padrão (monkey-patching `window`) é frágil e invisível ao TypeScript. (CONCLUÍDO: Removido no refactoring do hook).

---

## 8. Tipos Genéricos Fracos em Interfaces

`DashboardModals.tsx` expõe props com tipos vagos que mascaram contratos reais:
```ts
formatStatDate: (ts: any) => string;
formatStatTime: (ts: any) => string;
formatStatDuration: (ms: any) => string;
```
(CONCLUÍDO: Tipagem rigorosa aplicada em `dashboard-modals.tsx`).

---

## Resumo de Prioridades

| # | Item | Impacto | Esforço | Status |
|---|---|---|---|---|
| 1 | Remover `console.log` de debug em `log-import-dialog.tsx` | Alto | Baixo | [OK] |
| 2 | Substituir `(window as any).refreshData` por evento tipado / Remover | Alto | Baixo | [OK] |
| 3 | Criar tipos `AppUser`, `UserProfile`, `ToastFn` e eliminar `any` nos hooks | Alto | Médio | [OK] |
| 4 | Renomear hooks e componentes para kebab-case | Médio | Baixo | [OK] |
| 5 | Usar `<ObjetosFilters />` em vez de JSX duplicado em `objetos/page.tsx` | Médio | Baixo | [OK] |
| 6 | Extrair dados estáticos de `docs/page.tsx` por `src/data/docs.ts` | Médio | Médio | [OK] |
| 7 | Documentar todas as supressões `eslint-disable` com justificativa | Baixo | Baixo | [OK] |
