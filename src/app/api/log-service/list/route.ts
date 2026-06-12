import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/supabase/admin';
import { verifyAdminOrMaster } from '@/lib/auth-server';
import * as fs from 'fs';
import * as readline from 'readline';

/** Counts non-empty lines in a file via streaming (latin1). */
async function countLines(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let count = 0;
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'latin1' }),
      crlfDelay: Infinity,
    });
    rl.on('line', line => { if (line.trim()) count++; });
    rl.on('close', () => resolve(count));
    rl.on('error', reject);
  });
}

const OBJECT_NAME_RE = /^[a-zA-Z0-9_\-.\s]{1,128}$/;
const MAX_OBJECTS = 100;
const MIN_PREFIX_LEN = 3;

/**
 * Returns files whose name matches `name` using various fuzzy strategies:
 * 1. Normalized comparison (remove all non-alphanumeric chars)
 * 2. Prefix matching (reducing length down to MIN_PREFIX_LEN)
 */
function findCandidates(files: string[], name: string): { candidates: string[]; matchedPrefix: string } {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normName = normalize(name);
  
  if (normName.length >= MIN_PREFIX_LEN) {
    // 1. Try normalized inclusion
    const normResults = files.filter(f => normalize(f).includes(normName));
    if (normResults.length > 0) return { candidates: normResults, matchedPrefix: name };
  }

  // 2. Fallback: Prefix matching (original logic)
  let prefix = name;
  while (prefix.length >= MIN_PREFIX_LEN) {
    const lower = prefix.toLowerCase();
    const prefixResults = files.filter(f => f.toLowerCase().includes(lower));
    if (prefixResults.length > 0) return { candidates: prefixResults, matchedPrefix: prefix };
    prefix = prefix.slice(0, -1);
  }

  return { candidates: [], matchedPrefix: name };
}

export async function POST(req: NextRequest) {
  try {
    const { objectNames, callerToken } = await req.json() as {
      objectNames: string[];
      callerToken: string;
    };

    // Validate objectNames
    if (!Array.isArray(objectNames) || objectNames.length === 0) {
      return NextResponse.json({ error: 'objectNames deve ser um array não vazio.' }, { status: 400 });
    }
    const safeNames = objectNames
      .slice(0, MAX_OBJECTS)
      .map(n => String(n).trim())
      .filter(n => OBJECT_NAME_RE.test(n));

    const auth = await verifyAdminOrMaster(callerToken);
    if (auth.error || !auth.decoded) {
      return NextResponse.json({ error: auth.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const configDoc = await adminDb.collection('appConfig').doc('settings').get();
    const logPath = configDoc.data()?.logPath as string | undefined;
    if (!logPath) {
      return NextResponse.json({ error: 'Caminho de logs não configurado. Acesse Configurações para definir.' }, { status: 400 });
    }

    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ error: 'Diretório de logs não encontrado.' }, { status: 404 });
    }

    let allFiles: string[] = [];
    try {
      allFiles = fs.readdirSync(logPath).filter(f => {
        const lower = f.toLowerCase();
        return (lower.endsWith('.log') || lower.endsWith('.err')) && !lower.includes('resumo');
      });
    } catch (fsErr: any) {
      console.error('[LOG_LIST] fs.readdirSync failed:', fsErr);
      return NextResponse.json({ error: 'Não foi possível ler a pasta de logs.' }, { status: 500 });
    }

    const assignments = safeNames.map((name: string) => {
      const { candidates, matchedPrefix } = findCandidates(allFiles, name);
      return { objectName: name, candidates, matchedPrefix };
    });

    // Count lines for found candidates
    const errFiles = new Set(
      assignments.flatMap(a => a.candidates.filter(f => f.toLowerCase().endsWith('.err')))
    );
    const lineCountMap: Record<string, number> = {};
    
    // Process line counts in parallel but safely
    await Promise.all([...errFiles].map(async f => {
      try {
        const fullPath = `${logPath}/${f}`;
        if (fs.existsSync(fullPath)) {
          lineCountMap[f] = await countLines(fullPath);
        } else {
          lineCountMap[f] = 0;
        }
      } catch (e: any) {
        console.warn(`[LOG_LIST] Failed to count lines for ${f}:`, e.message);
        lineCountMap[f] = 0;
      }
    }));

    return NextResponse.json({
      assignments, 
      totalFiles: allFiles.length,
      lineCountMap,
      debugFiles: allFiles.slice(0, 10),
    });
  } catch (err: any) {
    console.error('[LOG_LIST] General error:', err);
    return NextResponse.json({ error: 'Erro fatal ao listar arquivos de log.' }, { status: 500 });
  }
}
