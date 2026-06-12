import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/supabase/admin';
import { verifyAdminOrMaster } from '@/lib/auth-server';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export async function POST(req: NextRequest) {
  try {
    const { filename, callerToken } = await req.json() as { filename: string; callerToken: string };

    const auth = await verifyAdminOrMaster(callerToken);
    if (auth.error || !auth.decoded) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const configDoc = await adminDb.collection('appConfig').doc('settings').get();
    const logPath = configDoc.data()?.logPath as string | undefined;
    if (!logPath) return NextResponse.json({ error: 'Caminho de logs não configurado.' }, { status: 400 });

    // Prevent path traversal
    const safeName = path.basename(filename);
    const fullPath = path.join(logPath, safeName);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: `Arquivo não encontrado: ${safeName}` }, { status: 404 });
    }

    const lines: string[] = [];
    const fileStream = fs.createReadStream(fullPath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    await new Promise<void>((resolve, reject) => {
      rl.on('line', (line) => {
        if (lines.length < 25) lines.push(line);
        else { rl.close(); fileStream.destroy(); }
      });
      rl.on('close', resolve);
      rl.on('error', reject);
    });

    return NextResponse.json({ lines, filename: safeName });
  } catch {
    return NextResponse.json({ error: 'Erro ao ler arquivo.' }, { status: 500 });
  }
}
