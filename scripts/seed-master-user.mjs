/**
 * Cria usuário master inicial no Supabase Auth + profile.
 *
 * Uso:
 *   node scripts/seed-master-user.mjs
 *   node scripts/seed-master-user.mjs --email admin@migra.local --password 'SenhaForte123!'
 *
 * Requer em .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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

function parseArgs(argv) {
  const out = {
    email: 'admin@migra.local',
    password: 'MigraMaster2026!',
    name: 'Administrador Master',
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--email' && argv[i + 1]) out.email = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) out.password = argv[++i];
    else if (argv[i] === '--name' && argv[i + 1]) out.name = argv[++i];
  }
  return out;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const { email, password, name } = parseArgs(process.argv);
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name },
});

let userId = created?.user?.id;

if (createError) {
  if (!createError.message?.toLowerCase().includes('already')) {
    console.error('Erro ao criar usuário:', createError.message);
    process.exit(1);
  }
  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error('Erro ao listar usuários:', listError.message);
    process.exit(1);
  }
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    console.error('Usuário já existe mas não foi encontrado na listagem.');
    process.exit(1);
  }
  userId = existing.id;
  console.log(`Usuário ${email} já existe — atualizando profile master.`);
} else {
  console.log(`Usuário criado: ${email}`);
}

const { error: profileError } = await admin.from('profiles').upsert({
  id: userId,
  email,
  name,
  role: 'master',
  is_master: true,
  is_disabled: false,
  must_change_password: false,
});

if (profileError) {
  console.error('Erro ao atualizar profile:', profileError.message);
  process.exit(1);
}

console.log('\n--- Configure no .env.local ---');
console.log(`SUPERADMIN_UID=${userId}`);
console.log(`NEXT_PUBLIC_SUPERADMIN_UID=${userId}`);
console.log('\nLogin:', email);
console.log('Senha:', password);
