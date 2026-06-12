# Setup Supabase — Migra Manager

Projeto remoto recomendado: **Migra** (`nisaukwqrdyomvrczwrf`, região `sa-east-1`).

## 1. Variáveis de ambiente

Copie `.env.example` → `.env.local` e preencha:

| Variável | Onde obter |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Settings → API → Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role (somente servidor) |
| `SUPERADMIN_UID` | Saída de `node scripts/seed-master-user.mjs` |
| `NEXT_PUBLIC_SUPERADMIN_UID` | Mesmo UUID do master (hooks client-side) |

Remova variáveis `FIREBASE_*` do `.env.local` — não são mais usadas.

## 2. Aplicar migrations

Via Supabase Dashboard → SQL Editor, ou MCP/CLI:

1. `20260612000001_initial_schema.sql`
2. `20260612000002_rls_policies.sql`
3. `20260612000003_catalogo_and_storage.sql`
4. `20260612000004_rls_hardening.sql`
5. `20260612000005_fix_set_updated_at_search_path.sql`

## 3. Buckets Storage

Criados pela migration `000003`: `avatars`, `signatures`, `backups`.

## 4. Usuário master

```bash
npm run db:seed-master
```

O script grava automaticamente `SUPERADMIN_UID` e `NEXT_PUBLIC_SUPERADMIN_UID` no `.env.local`.

**Login padrão:** `admin@migra.local` / `MigraMaster2026!`

## 5. Auth hardening (recomendado)

Proteção contra senhas vazadas (HaveIBeenPwned) e comprimento mínimo:

**Opção A — Dashboard**

1. [Auth → Providers → Email](https://supabase.com/dashboard/project/nisaukwqrdyomvrczwrf/auth/providers)
2. Ative **Prevent use of leaked passwords**
3. Defina **Minimum password length** ≥ 10
4. Salve

**Opção B — Script (Management API)**

1. Crie token em [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. Adicione `SUPABASE_ACCESS_TOKEN=sbp_...` ao `.env.local`
3. Rode: `npm run db:configure-auth`

> Nota: leaked password protection pode exigir plano Pro.

## 6. Tipos TypeScript

```bash
npm run db:gen-types
```

Gera `src/supabase/database.types.ts` a partir do schema remoto.

## 7. Validar

```bash
npm run dev
```

Acesse http://localhost:9002/login com o e-mail/senha do seed.
