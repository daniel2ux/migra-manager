/**
 * Hardening de Auth no projeto Supabase (senha mínima + HaveIBeenPwned).
 *
 * Requer token de acesso pessoal (não é a service role key):
 *   https://supabase.com/dashboard/account/tokens
 *
 * Uso:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/configure-supabase-auth.mjs
 *
 * Variáveis opcionais em .env.local:
 *   SUPABASE_ACCESS_TOKEN
 *   SUPABASE_PROJECT_REF (default: nisaukwqrdyomvrczwrf)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'nisaukwqrdyomvrczwrf';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error(`
SUPABASE_ACCESS_TOKEN não definido.

Opção A — Dashboard (manual):
  1. https://supabase.com/dashboard/project/${PROJECT_REF}/auth/providers
  2. Email → Password policy
  3. Ative "Prevent use of leaked passwords" (HaveIBeenPwned)
  4. Defina minimum password length ≥ 10
  5. Salve

Opção B — Script (API):
  1. Crie token em https://supabase.com/dashboard/account/tokens
  2. Adicione SUPABASE_ACCESS_TOKEN ao .env.local
  3. Rode: npm run db:configure-auth
`);
  process.exit(1);
}

const body = {
  password_hibp_enabled: true,
  password_min_length: 10,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let payload;
try {
  payload = JSON.parse(text);
} catch {
  payload = text;
}

if (!res.ok) {
  console.error('Falha ao atualizar auth config:', res.status, payload);
  if (res.status === 403 || res.status === 402) {
    console.error('Nota: leaked password protection pode exigir plano Pro ou superior.');
  }
  process.exit(1);
}

console.log('Auth config atualizado:');
console.log('  password_hibp_enabled: true');
console.log('  password_min_length: 10');
