import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket } from '@/firebase/admin-storage';
import { verifyCallerRole } from '@/lib/admin-auth';
import { restoreCollections } from '@/lib/backup/importer';
import { isValidBackupFilename } from '@/lib/backup/types';
import type { BackupPayload, RestoreOptions } from '@/lib/backup/types';
import { createHash } from 'crypto';
import { gunzipSync } from 'zlib';

export const maxDuration = 300;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      callerToken,
      filename,
      options,
    }: {
      callerToken: string;
      filename: string;
      options?: RestoreOptions;
    } = body;

    if (!callerToken || !filename) {
      return NextResponse.json({ error: 'callerToken e filename obrigatórios.' }, { status: 400 });
    }

    if (!isValidBackupFilename(filename)) {
      return NextResponse.json({ error: 'filename inválido.' }, { status: 400 });
    }

    // Restore is master-only — destructive operation
    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const bucket = getAdminStorageBucket();
    const file = bucket.file(`backups/${filename}`);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json({ error: 'Arquivo de backup não encontrado.' }, { status: 404 });
    }

    const [content] = await file.download();
    let payload: BackupPayload;

    try {
      const json = gunzipSync(content).toString('utf-8');
      payload = JSON.parse(json);
    } catch {
      return NextResponse.json(
        { error: 'Falha ao descompactar o arquivo. O arquivo pode estar corrompido.' },
        { status: 400 }
      );
    }

    if (!payload?.metadata || !payload?.data) {
      return NextResponse.json(
        { error: 'Estrutura do backup inválida. Arquivo não reconhecido.' },
        { status: 400 }
      );
    }

    // Validate checksum
    if (payload.metadata.checksum) {
      const computed = `sha256:${createHash('sha256')
        .update(JSON.stringify({ data: payload.data }))
        .digest('hex')}`;

      if (computed !== payload.metadata.checksum) {
        return NextResponse.json(
          { error: 'Falha na validação de integridade (checksum não confere). Arquivo corrompido.' },
          { status: 400 }
        );
      }
    }

    const restoreOptions: RestoreOptions = {
      mode: options?.mode ?? 'merge',
      rootCollections: options?.rootCollections?.length ? options.rootCollections : undefined,
      purgeBeforeRestore: options?.purgeBeforeRestore ?? false,
    };

    const result = await restoreCollections(payload.data, restoreOptions);

    return NextResponse.json(
      { success: true, result, backupMetadata: payload.metadata },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error('[api/backup/restore]', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
