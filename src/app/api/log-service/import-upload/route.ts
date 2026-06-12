import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/supabase/admin';
import { verifyAdminOrMaster } from '@/lib/auth-server';
import { randomUUID } from 'crypto';
import { getParser, errDedupKey } from '@/lib/log-parser';
import { deleteBatch } from '@/lib/admin-batch';

const BATCH_SIZE = 400;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const objectName = (formData.get('objectName') as string)?.trim();
    const mockId = formData.get('mockId') as string;
    const projectId = formData.get('projectId') as string;
    const callerToken = formData.get('callerToken') as string;
    const skipDelete = formData.get('skipDelete') === 'true';

    if (!file || !objectName || !mockId || !projectId || !callerToken) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes.' }, { status: 400 });
    }

    const auth = await verifyAdminOrMaster(callerToken);
    if (auth.error || !auth.decoded) {
      return NextResponse.json({ error: auth.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const safeName = file.name;
    const parse = getParser(safeName);

    const buffer = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(buffer);
    const rawLines = text.split(/\r?\n/);

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

    for (const line of rawLines) {
      const trimmed = line.trimEnd();
      if (!trimmed.trim()) continue;

      linesRead++;
      const entry = parse(trimmed, objectName, linesRead);

      if (!entry) {
        rejectedLines.push({ line: linesRead, reason: 'Linha malformada ou colunas insuficientes' });
        errorsCount++;
        continue;
      }

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
        const { error } = await admin.from('migration_logs').insert(pendingRows.splice(0, BATCH_SIZE));
        if (error) throw error;
      }
    }

    if (linesRead === 0) {
      return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 422 });
    }

    if (pendingRows.length > 0) {
      const { error } = await admin.from('migration_logs').insert(pendingRows);
      if (error) throw error;
    }

    const durationMs = Date.now() - startedAt;

    await admin.from('audit_logs').insert({
      action: 'IMPORT_MIGRATION_LOGS',
      user_id: auth.decoded.uid,
      details: {
        objectName, mockId, projectId, sourceFileName: safeName,
        recordsWritten, recordsDeleted, errorsCount,
      },
    });

    return NextResponse.json({
      success: true,
      objectName,
      linesRead,
      recordsWritten,
      recordsDeleted,
      errorsCount,
      duplicatesSkipped,
      rejectedLines,
      totalCount: recordsWritten + errorsCount,
      successCount: recordsWritten,
      durationMs,
      startTime: new Date(startedAt).toISOString(),
      endTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/api/logs/import-upload]', err);
    return NextResponse.json({ error: 'Erro interno na importação.' }, { status: 500 });
  }
}
