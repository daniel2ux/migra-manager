/**
 * Move objetos mestre legados (project_id NULL) para um projeto da empresa EDP.
 *
 * Uso (simulação — padrão):
 *   node scripts/migrate-master-objects-to-edp.mjs
 *   node scripts/migrate-master-objects-to-edp.mjs --company EDP
 *
 * Aplicar de fato:
 *   node scripts/migrate-master-objects-to-edp.mjs --apply
 *   node scripts/migrate-master-objects-to-edp.mjs --apply --project <uuid>
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
    company: 'EDP',
    projectId: '',
    apply: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--company' && argv[i + 1]) out.company = argv[++i];
    else if (argv[i] === '--project' && argv[i + 1]) out.projectId = argv[++i];
    else if (argv[i] === '--apply') out.apply = true;
    else if (argv[i] === '--dry-run') out.apply = false;
    else if (argv[i] === '--help' || argv[i] === '-h') out.help = true;
  }
  return out;
}

function normalizeKey(value) {
  return value.trim().toUpperCase();
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const args = parseArgs(process.argv);

if (args.help) {
  console.log(`
Migra objetos mestre sem project_id para um projeto da empresa informada.

Opções:
  --company <nome>   Filtro da empresa (padrão: EDP)
  --project <uuid>   Projeto destino (senão: primeiro projeto com "MIGRA" no nome, ou o primeiro da lista)
  --apply            Executa a migração (sem isso: apenas simula)
  --dry-run          Simula (padrão)
`);
  process.exit(0);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const companyNeedle = normalizeKey(args.company);

async function resolveCompany(client) {
  const { data, error } = await client.from('companies').select('id, name');
  if (error) throw new Error(`Erro ao listar empresas: ${error.message}`);

  const matches = (data ?? []).filter((row) => {
    const key = normalizeKey(row.name ?? '');
    return key === companyNeedle || key.includes(companyNeedle);
  });

  if (matches.length === 0) {
    throw new Error(
      `Nenhuma empresa encontrada para "${args.company}". Cadastre a empresa em Projetos primeiro.`,
    );
  }

  if (matches.length > 1) {
    console.log('Empresas correspondentes:');
    for (const row of matches) {
      console.log(`  - ${row.name} (${row.id})`);
    }
    const exact = matches.find((row) => normalizeKey(row.name) === companyNeedle);
    if (exact) return exact;
    throw new Error(
      `Mais de uma empresa corresponde a "${args.company}". Use --company com o nome exato.`,
    );
  }

  return matches[0];
}

async function resolveProject(client, companyId) {
  if (args.projectId) {
    const { data, error } = await client
      .from('projects')
      .select('id, name, company_id')
      .eq('id', args.projectId)
      .maybeSingle();
    if (error) throw new Error(`Erro ao buscar projeto: ${error.message}`);
    if (!data) throw new Error(`Projeto ${args.projectId} não encontrado.`);
    if (data.company_id !== companyId) {
      throw new Error(
        `Projeto "${data.name}" não pertence à empresa selecionada (company_id diferente).`,
      );
    }
    return data;
  }

  const { data, error } = await client
    .from('projects')
    .select('id, name, company_id, company')
    .eq('company_id', companyId)
    .order('name');

  if (error) throw new Error(`Erro ao listar projetos: ${error.message}`);

  const projects = data ?? [];
  if (projects.length === 0) {
    throw new Error('Nenhum projeto vinculado a esta empresa. Cadastre um projeto com a empresa EDP.');
  }

  const migra = projects.find((p) => normalizeKey(p.name ?? '').includes('MIGRA'));
  const chosen = migra ?? projects[0];

  if (projects.length > 1 && !migra) {
    console.log('Projetos disponíveis na empresa:');
    for (const p of projects) {
      console.log(`  - ${p.name} (${p.id})`);
    }
    console.log(`Usando o primeiro: ${chosen.name}`);
  }

  return chosen;
}

try {
  const company = await resolveCompany(admin);
  console.log(`Empresa: ${company.name} (${company.id})`);

  const project = await resolveProject(admin, company.id);
  console.log(`Projeto destino: ${project.name} (${project.id})`);

  const { count, error: countError } = await admin
    .from('master_objects')
    .select('id', { count: 'exact', head: true })
    .is('project_id', null);

  if (countError) {
    throw new Error(`Erro ao contar objetos legados: ${countError.message}`);
  }

  console.log(`Objetos sem project_id: ${count ?? 0}`);

  const { data: result, error: rpcError } = await admin.rpc(
    'backfill_master_objects_project_id',
    {
      p_project_id: project.id,
      p_apply: args.apply,
    },
  );

  if (rpcError) {
    if (rpcError.message?.includes('Could not find the function')) {
      console.error(
        '\nFunção backfill_master_objects_project_id não encontrada.',
        'Aplique a migration supabase/migrations/20260615000002_backfill_master_objects_function.sql',
        'ou rode: npx supabase db push',
      );
    }
    throw new Error(rpcError.message);
  }

  console.log('\nResultado:');
  console.log(JSON.stringify(result, null, 2));

  if (!args.apply) {
    console.log('\nSimulação concluída. Para aplicar: node scripts/migrate-master-objects-to-edp.mjs --apply');
  } else {
    console.log('\nMigração aplicada com sucesso.');
  }
} catch (err) {
  console.error('\nErro:', err instanceof Error ? err.message : err);
  process.exit(1);
}
