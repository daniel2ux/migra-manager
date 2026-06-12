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

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Aplique as migrations em `supabase/migrations/`
3. Copie `.env.example` → `.env.local` e preencha as chaves

```bash
# Com Supabase CLI (opcional)
supabase link --project-ref SEU_REF
supabase db push
```

### 3. Dev server

```bash
npm run dev
```

App em [http://localhost:9002](http://localhost:9002).

## Variáveis de ambiente

Ver [`.env.example`](.env.example).

## Repositório

Este projeto vive em **`daniel2ux/migra-manager`** (stack Supabase, v3.x).

O repositório legado Firebase (`daniel2ux/migra`) está arquivado.

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 9002) |
| `npm run build` | Build de produção |
| `npm run typecheck` | Verificação TypeScript |
| `npm run lint` | ESLint |
