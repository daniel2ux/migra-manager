# Migra Manager

Sistema de gestão de migrações SAP IS-U — **Next.js 16 + Supabase**.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend:** Supabase (Auth, Postgres, Storage, Realtime)
- **IA:** Genkit + Google Gemini

## Setup local

### 1. Dependências

```bash
npm install
```

### 2. Supabase

Projeto configurado: **Migra** (`nisaukwqrdyomvrczwrf`, `sa-east-1`).

1. Copie `.env.example` → `.env.local`
2. Configure variáveis: `node scripts/configure-supabase-env.mjs`
3. Adicione `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API)
4. Crie usuário master: `npm run db:seed-master`
5. Guia completo: [`supabase/SETUP.md`](supabase/SETUP.md)

Migrations em `supabase/migrations/` (inclui buckets Storage; catálogo em `master_objects`).

### 3. Dev server

```bash
npm run dev
```

App em [http://localhost:9002](http://localhost:9002).

## Variáveis de ambiente

Ver [`.env.example`](.env.example).

## Repositório

Este projeto vive em **`daniel2ux/migra-manager`** (stack Supabase, v3.x).

O repositório legado (`daniel2ux/migra`) está arquivado.

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 9002) |
| `npm run build` | Build de produção |
| `npm run typecheck` | Verificação TypeScript |
| `npm run lint` | ESLint |
| `npm run db:configure-auth` | Hardening Auth (HIBP + senha mínima) via Management API |
| `npm run db:gen-types` | Gera `src/supabase/database.types.ts` |
