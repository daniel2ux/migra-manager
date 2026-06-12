import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/supabase/admin';
import { verifyAdminOrMaster } from '@/lib/auth-server';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { getParser, errDedupKey } from '@/lib/log-parser';
import { deleteBatch } from '@/lib/admin-batch';

// -- Constants ----------------------------------------------------------------

const BATCH_SIZE = 400;
const PROGRESS_EVERY = 500; // emit a progress event every N lines read

// -- Stream file line-by-line ------------------------------------------------

async function* streamLines(fullPath: string, fileContent?: string): AsyncGenerator<string> {
  if (fileContent) {
    const lines = fileContent.split(/\r?\n/);
    for (const line of lines) yield line;
    return;
  }
  const fileStream = fs.createReadStream(fullPath, { encoding: 'latin1' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

// -- Main handler -------------------------------------------------------------

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  const { objectName: rawObjectName, mockId, projectId, filename, callerToken, skipDelete, lineLimit, fileContent } =
    await req.json() as {
      objectName: string; mockId: string; projectId: string;
      filename: string; callerToken: string;
      skipDelete?: boolean; lineLimit?: number;
      fileContent?: string;
    };
  const objectName = rawObjectName?.trim();

  if (!objectName || !mockId || !projectId || !filename || !callerToken) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes.' }, { status: 400 });
  }

  // Validate objectName is a valid string
  if (typeof objectName !== 'string' || objectName.length === 0) {
    return NextResponse.json({ error: 'Nome do objeto inválido.' }, { status: 400 });
  }

  const auth = await verifyAdminOrMaster(callerToken);
  if (auth.error || !auth.decoded) {
    return NextResponse.json({ error: auth.error ?? 'Não autorizado.' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data: configRow } = await admin.from('app_config').select('value').eq('key', 'settings').maybeSingle();
  const logPath = (configRow?.value as { logPath?: string } | null)?.logPath;
  if (!logPath) {
    return NextResponse.json({ error: 'Caminho de logs não configurado.' }, { status: 400 });
  }

  const safeName = path.basename(filename);
  const fullPath = path.join(logPath, safeName);

  if (!fileContent && !fs.existsSync(fullPath)) {
    return NextResponse.json({ error: `Arquivo não encontrado: ${safeName}` }, { status: 404 });
  }

  // -- Streaming response ---------------------------------------------------
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (obj: object) =>
        ctrl.enqueue(enc.encode(JSON.stringify(obj) + '\n'));

      try {
        const parse = getParser(safeName);

        const recordsDeleted = skipDelete ? 0 : await deleteBatch('migration_logs', [
          { field: 'mock', op: '==', value: mockId },
          { field: 'object', op: '==', value: objectName },
        ]);

        let recordsWritten = 0;
        let errorsCount = 0;
        let duplicatesSkipped = 0;
        let linesRead = 0;
        const rejectedLines: { line: number; reason: string }[] = [];
        const seenKeys = new Set<string>();
        const pendingRows: Record<string, unknown>[] = [];

        for await (const line of streamLines(fullPath, fileContent)) {
          const trimmed = line.trimEnd();
          if (!trimmed.trim()) continue;

          linesRead++;
          if (lineLimit && linesRead > lineLimit) {
            send({ type: 'info', message: `Limite de ${lineLimit} linhas atingido, interrompendo leitura.` });
            break;
          }

          const entry = parse(trimmed, objectName, linesRead);
          if (!entry) {
            rejectedLines.push({ line: linesRead, reason: 'Linha malformada ou colunas insuficientes' });
            errorsCount++;
          } else {
            const dedupKey = errDedupKey(entry);
            if (dedupKey) {
              if (seenKeys.has(dedupKey)) { duplicatesSkipped++; continue; }
              seenKeys.add(dedupKey);
            }

            pendingRows.push({
              ...entry,
              mock: mockId,
              filename: safeName,
              project_id: projectId,
              imported_at: new Date().toISOString(),
            });

            recordsWritten++;

            if (pendingRows.length >= BATCH_SIZE) {
              const { error: insErr } = await admin.from('migration_logs').insert(pendingRows.splice(0, BATCH_SIZE));
              if (insErr) throw insErr;
            }
          }

          // Emit progress every N lines
          if (linesRead % PROGRESS_EVERY === 0) {
            send({ type: 'progress', linesRead, recordsWritten, errorsCount });
          }
        }

        if (linesRead === 0) {
          send({ type: 'error', message: 'Arquivo vazio.', status: 422 });
          return;
        }

        if (pendingRows.length > 0) {
          const { error: insErr } = await admin.from('migration_logs').insert(pendingRows);
          if (insErr) throw insErr;
        }

        const durationMs = Date.now() - startedAt;

        await admin.from('audit_logs').insert({
          action: 'IMPORT_MIGRATION_LOGS',
          user_id: auth.decoded!.uid,
          details: {
            objectName, mockId, projectId, sourceFileName: safeName,
            recordsWritten, recordsDeleted, errorsCount,
          },
        });

        send({
          type: 'done', success: true, objectName, linesRead,
          recordsWritten, recordsDeleted, errorsCount, duplicatesSkipped,
          rejectedLines, durationMs, lineLimitApplied: lineLimit,
          limitReached: lineLimit ? linesRead >= lineLimit : false,
        });
      } catch (err: any) {
        console.error('[/api/logs/import] Fatal error during streaming:', err);
        send({
          type: 'error',
          message: 'Erro interno durante importação.'
        });
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  });
}
