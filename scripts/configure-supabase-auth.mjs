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

function sanitizeToken(raw) {
  if (!raw) return '';
  let t = raw.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  // Remove caracteres não-ASCII (ex.: bullet • colado ao copiar do Dashboard)
  return t.replace(/[^\x21-\x7E]/g, '');
}

const token = sanitizeToken(process.env.SUPABASE_ACCESS_TOKEN);

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

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function getAuthConfig() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    headers: { Authorization: headers.Authorization },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET auth config ${res.status}: ${text}`);
  return JSON.parse(text);
}

const body = {
  password_hibp_enabled: true,
  password_min_length: 10,
};

let before;
try {
  before = await getAuthConfig();
  console.log('Config atual (antes):');
  console.log(`  password_hibp_enabled: ${before.password_hibp_enabled ?? 'n/a'}`);
  console.log(`  password_min_length: ${before.password_min_length ?? 'n/a'}`);
} catch (err) {
  console.warn('Não foi possível ler config atual:', err.message);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: 'PATCH',
  headers,
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
  if (res.status === 401) {
    console.error('Token inválido ou expirado. Gere um novo em https://supabase.com/dashboard/account/tokens');
  }
  if (res.status === 403 || res.status === 402) {
    console.error('Nota: leaked password protection pode exigir plano Pro ou superior.');
    console.error('Alternativa: configure manualmente em https://supabase.com/dashboard/project/' + PROJECT_REF + '/auth/providers');
  }
  process.exit(1);
}

const after = payload.password_hibp_enabled !== undefined ? payload : await getAuthConfig();

console.log('\nAuth config atualizado:');
console.log(`  password_hibp_enabled: ${after.password_hibp_enabled}`);
console.log(`  password_min_length: ${after.password_min_length}`);

if (!after.password_hibp_enabled) {
  console.warn('\nAviso: HIBP ainda desabilitado — verifique plano Pro ou use o Dashboard.');
}
