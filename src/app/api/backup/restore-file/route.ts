import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { getAdminStorageBucket } from '@/firebase/admin-storage';
import { verifyCallerRole } from '@/lib/admin-auth';
import { restoreCollections } from '@/lib/backup/importer';
import type { BackupPayload, RestoreOptions } from '@/lib/backup/types';
import { createHash } from 'crypto';
import { gunzipSync } from 'zlib';

export const maxDuration = 300;
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callerToken = formData.get('callerToken') as string | null;
    const file = formData.get('file') as File | null;
    const optionsRaw = formData.get('options') as string | null;

    if (!callerToken || !file) {
      return NextResponse.json({ error: 'callerToken e file obrigatórios.' }, { status: 400 });
    }

    if (!file.name.endsWith('.json.gz')) {
      return NextResponse.json(
        { error: 'Formato inválido. O arquivo deve ser um .json.gz.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo permitido: 500 MB.` },
        { status: 413 }
      );
    }

    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const options: RestoreOptions = optionsRaw ? JSON.parse(optionsRaw) : { mode: 'merge' };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let payload: BackupPayload;
    try {
      const json = gunzipSync(buffer).toString('utf-8');
      payload = JSON.parse(json);
    } catch {
      return NextResponse.json(
        { error: 'Falha ao descompactar. O arquivo pode estar corrompido.' },
        { status: 400 }
      );
    }

    if (!payload?.metadata || !payload?.data) {
      return NextResponse.json(
        { error: 'Estrutura do backup inválida. Arquivo não reconhecido.' },
        { status: 400 }
      );
    }

    // Checksum validation
    if (payload.metadata.checksum) {
      const computed = `sha256:${createHash('sha256')
        .update(JSON.stringify({ data: payload.data }))
        .digest('hex')}`;

      if (computed !== payload.metadata.checksum) {
        return NextResponse.json(
          { error: 'Falha na validação de integridade (checksum inválido).' },
          { status: 400 }
        );
      }
    }

    // Persist uploaded file in Storage for audit trail
    try {
      const bucket = getAdminStorageBucket();
      const uploadedName = `uploads/${file.name}`;
      const storageFile = bucket.file(uploadedName);
      await storageFile.save(buffer);
    } catch {
      // Non-fatal: audit trail upload failure should not block restore
    }

    const result = await restoreCollections(payload.data, {
      mode: options.mode ?? 'merge',
      rootCollections: options.rootCollections?.length ? options.rootCollections : undefined,
      purgeBeforeRestore: options.purgeBeforeRestore ?? false,
    });

    return NextResponse.json(
      { success: true, result, backupMetadata: payload.metadata },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error('[api/backup/restore-file]', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
