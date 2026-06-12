/**
 * Regenera src/supabase/database.types.ts a partir do projeto remoto.
 *
 * Requer login: npx supabase login
 * Uso: npm run db:gen-types
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'nisaukwqrdyomvrczwrf';
const outPath = resolve(process.cwd(), 'src/supabase/database.types.ts');

const result = spawnSync(
  'npx',
  ['supabase', 'gen', 'types', 'typescript', '--project-id', PROJECT_REF],
  { encoding: 'utf8', shell: true },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const fs = await import('fs');
const header = `// Auto-generated — não edite manualmente. Rode: npm run db:gen-types\n\n`;
fs.writeFileSync(outPath, header + result.stdout);
console.log(`Tipos gravados em ${outPath}`);
