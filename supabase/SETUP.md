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

## 3. Buckets Storage

Criados pela migration `000003`: `avatars`, `signatures`, `backups`.

## 4. Usuário master

```bash
npm run db:seed-master
```

O script grava automaticamente `SUPERADMIN_UID` e `NEXT_PUBLIC_SUPERADMIN_UID` no `.env.local`.

**Login padrão:** `admin@migra.local` / `MigraMaster2026!`

## 5. Validar

```bash
npm run dev
```

Acesse http://localhost:9002/login com o e-mail/senha do seed.
