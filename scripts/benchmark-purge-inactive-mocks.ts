// @ts-nocheck
/**
 * Benchmark do utilitário purge-inactive-mocks (dry-run).
 *
 * Uso:
 *   npx tsx scripts/benchmark-purge-inactive-mocks.ts
 *   npx tsx scripts/benchmark-purge-inactive-mocks.ts --project <uuid> --runs 5
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { purgeInactiveMocks } from '../src/lib/admin/purge-inactive-mocks';

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

function parseArgs(argv: string[]) {
  const out = { projectId: '', runs: 3 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--project' && argv[i + 1]) {
      out.projectId = argv[++i];
    } else if (argv[i] === '--runs' && argv[i + 1]) {
      out.runs = Math.max(1, Number(argv[++i]) || 3);
    }
  }
  return out;
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function resolveProjectId(admin: ReturnType<typeof createClient>, explicit?: string) {
  if (explicit) return explicit;
  const { data, error } = await admin.from('projects').select('id, name').limit(1);
  if (error) throw error;
  const row = (data ?? [])[0] as { id: string; name?: string } | undefined;
  if (!row) throw new Error('Nenhum projeto encontrado.');
  return String(row.id);
}

async function main() {
  loadEnvLocal();
  const { projectId: argProjectId, runs } = parseArgs(process.argv);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const projectId = await resolveProjectId(admin, argProjectId || undefined);
  const durations: number[] = [];
  let lastResult: Awaited<ReturnType<typeof purgeInactiveMocks>> | null = null;

  console.log(`Projeto: ${projectId}`);
  console.log(`Execuções dry-run: ${runs}\n`);

  for (let i = 0; i < runs; i++) {
    const result = await purgeInactiveMocks(admin as SupabaseClient, projectId, true);
    lastResult = result;
    durations.push(result.durationMs ?? 0);
    console.log(
      `  run ${i + 1}: ${result.durationMs}ms — inativas=${result.wouldDelete}, objetos=${result.totalObjects}, logs=${result.totalLogs}`,
    );
  }

  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  console.log('\nResumo:');
  console.log(`  min: ${Math.min(...durations)}ms`);
  console.log(`  p50: ${percentile(durations, 50)}ms`);
  console.log(`  avg: ${avg}ms`);
  console.log(`  max: ${Math.max(...durations)}ms`);

  if (lastResult) {
    console.log('\nÚltimo preview:');
    console.log(`  mocks varridas: ${lastResult.scanned}`);
    console.log(`  inativas: ${lastResult.wouldDelete}`);
    if (lastResult.sample.length > 0) {
      for (const row of lastResult.sample.slice(0, 5)) {
        console.log(`  - ${row.name}: ${row.objectCount} obj., ${row.logCount} logs`);
      }
      if (lastResult.sample.length > 5) {
        console.log(`  ... +${lastResult.sample.length - 5} na amostra`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
