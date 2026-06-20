/**
 * Limpeza pós-deploy para builds Next.js standalone.
 *
 * Pré-requisito: `npm run build` (next.config com output: 'standalone').
 *
 * Uso:
 *   node scripts/clean-post-deploy.mjs              # simula (dry-run)
 *   node scripts/clean-post-deploy.mjs --confirm    # remove de fato
 *   node scripts/clean-post-deploy.mjs --confirm --prepare-standalone
 *
 * Com --prepare-standalone, copia public/ e .next/static para .next/standalone/
 * antes da limpeza (requisito do modo standalone do Next.js).
 *
 * Após a limpeza, inicie a aplicação com:
 *   cd .next/standalone && node server.js
 *
 * Por padrão .git NÃO é removido (use --remove-git apenas em imagens Docker finais).
 */

import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = process.cwd();
const STANDALONE_DIR = join(ROOT, '.next', 'standalone');
const STANDALONE_STATIC = join(STANDALONE_DIR, '.next', 'static');
const STANDALONE_PUBLIC = join(STANDALONE_DIR, 'public');

const args = new Set(process.argv.slice(2));
const confirm = args.has('--confirm');
const dryRun = !confirm;
const prepareStandalone = args.has('--prepare-standalone');
const removeGit = args.has('--remove-git');
const removeSupabase = args.has('--remove-supabase');
const keepEnvExample = args.has('--keep-env-example');
const keepReadme = args.has('--keep-readme');

/** @type {string[]} */
const REMOVE_DIRS = [
  'node_modules',
  'src',
  'scripts',
  '.agents',
  'coverage',
  'out',
  'build',
  '.genkit',
  '.vercel',
  '.pnp',
];

/** @type {string[]} */
const REMOVE_FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.tsbuildinfo',
  'next.config.ts',
  'next-env.d.ts',
  'eslint.config.mjs',
  'postcss.config.mjs',
  'components.json',
  '.DS_Store',
];

/** @type {string[]} */
const DEBUG_LOG_FILES = [
  'npm-debug.log',
  'yarn-debug.log',
  'yarn-error.log',
  '.pnpm-debug.log',
];

function log(msg) {
  console.log(msg);
}

function warn(msg) {
  console.warn(`[aviso] ${msg}`);
}

function resolvePath(rel) {
  return resolve(ROOT, rel);
}

function pathExists(rel) {
  return existsSync(resolvePath(rel));
}

function isDirectory(rel) {
  const full = resolvePath(rel);
  return existsSync(full) && statSync(full).isDirectory();
}

function copyDir(srcRel, destRel) {
  const src = resolvePath(srcRel);
  if (!existsSync(src)) {
    warn(`Origem inexistente, ignorando cópia: ${srcRel}`);
    return;
  }
  log(`${dryRun ? '[dry-run] ' : ''}copiar ${srcRel} → ${destRel}`);
  if (!dryRun) {
    cpSync(src, resolvePath(destRel), { recursive: true, force: true });
  }
}

function removePath(rel, { isDir }) {
  const label = isDir ? 'pasta' : 'arquivo';
  log(`${dryRun ? '[dry-run] ' : ''}remover ${label}: ${rel}`);
  if (!dryRun) {
    rmSync(resolvePath(rel), { recursive: true, force: true });
  }
}

function prepareStandaloneArtifacts() {
  if (!existsSync(STANDALONE_DIR)) {
    throw new Error(
      '`.next/standalone` não encontrado. Execute `npm run build` antes da limpeza.',
    );
  }
  copyDir('public', '.next/standalone/public');
  copyDir('.next/static', '.next/standalone/.next/static');
}

function collectNextArtifactsToRemove() {
  const toRemove = [];
  const nextDir = resolvePath('.next');
  if (!existsSync(nextDir)) return toRemove;

  for (const name of readdirSync(nextDir)) {
    if (name === 'standalone') continue;
    const rel = join('.next', name);
    toRemove.push({ rel, isDir: statSync(resolvePath(rel)).isDirectory() });
  }
  return toRemove;
}

function collectLogFiles() {
  return DEBUG_LOG_FILES.filter((name) => pathExists(name) && !isDirectory(name));
}

function main() {
  log('=== Limpeza pós-deploy (Next.js standalone) ===');
  log(`Modo: ${dryRun ? 'dry-run (use --confirm para aplicar)' : 'CONFIRMADO — removendo'}`);
  log(`Raiz: ${ROOT}\n`);

  if (!existsSync(STANDALONE_DIR)) {
    warn('`.next/standalone` ausente. Rode `npm run build` antes de limpar em produção.');
  }

  if (prepareStandalone) {
    log('--- Preparar bundle standalone ---');
    prepareStandaloneArtifacts();
    log('');
  } else if (existsSync(STANDALONE_DIR)) {
    if (!existsSync(STANDALONE_PUBLIC)) {
      warn('public/ ainda não está em .next/standalone/public. Use --prepare-standalone na primeira limpeza.');
    }
    if (!existsSync(STANDALONE_STATIC)) {
      warn('.next/static ainda não está em .next/standalone/.next/static. Use --prepare-standalone na primeira limpeza.');
    }
  }

  const dirs = [...REMOVE_DIRS];
  const files = [...REMOVE_FILES];

  if (removeGit) dirs.push('.git');
  if (removeSupabase) dirs.push('supabase');
  if (!keepEnvExample) files.push('.env.example');
  if (!keepReadme) files.push('README.md');

  // Após copiar assets, public na raiz não é necessário.
  if (prepareStandalone || existsSync(STANDALONE_PUBLIC)) {
    dirs.push('public');
  }

  log('--- Pastas ---');
  for (const rel of dirs) {
    if (pathExists(rel) && isDirectory(rel)) removePath(rel, { isDir: true });
  }

  log('\n--- Artefatos .next (exceto standalone/) ---');
  for (const { rel, isDir } of collectNextArtifactsToRemove()) {
    removePath(rel, { isDir });
  }

  log('\n--- Arquivos ---');
  for (const rel of files) {
    if (pathExists(rel) && !isDirectory(rel)) removePath(rel, { isDir: false });
  }

  for (const name of collectLogFiles()) {
    removePath(name, { isDir: false });
  }

  log('\n--- Resultado ---');
  if (dryRun) {
    log('Nenhum arquivo removido (dry-run).');
    log('Execute com --confirm para aplicar a limpeza.');
  } else {
    log('Limpeza concluída.');
    if (existsSync(STANDALONE_DIR)) {
      log('Inicie o servidor: cd .next/standalone && node server.js');
    }
  }

  if (!removeGit) {
    log('`.git` preservado (passe --remove-git para remover em imagens finais).');
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
