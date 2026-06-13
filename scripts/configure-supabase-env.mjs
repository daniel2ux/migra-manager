/**
 * Atualiza .env.local com variáveis Supabase do projeto Migra.
 * Não remove chaves legadas existentes — comente-as manualmente se desejar.
 *
 * Uso: node scripts/configure-supabase-env.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ENV_PATH = resolve(process.cwd(), '.env.local');

const SUPABASE_VARS = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://nisaukwqrdyomvrczwrf.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_MsLroaKAiOfT5LPFwaOZvA_YP4gH_XX',
};

function upsertEnv(lines, key, value) {
  const prefix = `${key}=`;
  const idx = lines.findIndex((l) => l.startsWith(prefix) || l.match(new RegExp(`^${key}=`)));
  const entry = `${key}=${value}`;
  if (idx >= 0) lines[idx] = entry;
  else lines.push(entry);
}

let lines = [];
if (existsSync(ENV_PATH)) {
  lines = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
}

// Bloco de cabeçalho Supabase
if (!lines.some((l) => l.includes('=== Supabase Migra Manager ==='))) {
  lines.unshift('', '# === Supabase Migra Manager ===');
}

for (const [key, value] of Object.entries(SUPABASE_VARS)) {
  upsertEnv(lines, key, value);
}

if (!lines.some((l) => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))) {
  lines.push('# Obtenha em: Dashboard → Settings → API → service_role');
  lines.push('SUPABASE_SERVICE_ROLE_KEY=');
}

if (!lines.some((l) => l.startsWith('SUPABASE_ACCESS_TOKEN='))) {
  lines.push('# Management API — https://supabase.com/dashboard/account/tokens');
  lines.push('# SUPABASE_ACCESS_TOKEN=');
}

writeFileSync(ENV_PATH, lines.filter((l, i, arr) => !(l === '' && arr[i + 1] === '')).join('\n') + '\n');
console.log('.env.local atualizado com URL e publishable key do projeto Migra.');
console.log('Preencha SUPABASE_SERVICE_ROLE_KEY e rode: npm run db:seed-master');
console.log('Opcional: SUPABASE_ACCESS_TOKEN → npm run db:configure-auth');
