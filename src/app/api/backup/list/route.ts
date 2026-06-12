import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket } from '@/supabase/admin-storage';
import { verifyCallerRole } from '@/lib/admin-auth';
import type { BackupListItem, BackupMetadata } from '@/lib/backup/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callerToken } = body;

    if (!callerToken) {
      return NextResponse.json({ error: 'callerToken obrigatório.' }, { status: 400 });
    }

    const verification = await verifyCallerRole(callerToken, ['master', 'admin']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const bucket = getAdminStorageBucket();
    const [files] = await bucket.getFiles({ prefix: 'backups/' });

    const eligible = files.filter(f => f.name.endsWith('.json.gz'));
    const metaResults = await Promise.allSettled(eligible.map(f => f.getMetadata()));

    const items: BackupListItem[] = [];

    for (let i = 0; i < eligible.length; i++) {
      const result = metaResults[i];
      if (result.status === 'rejected') continue;

      const [meta] = result.value;
      const custom = (meta.metadata ?? {}) as Record<string, string>;
      const filename = eligible[i].name.replace('backups/', '');

      const rootCollections = custom.rootCollections
        ? custom.rootCollections.split(',').filter(Boolean)
        : [];

      const metadata: BackupMetadata = {
        version: custom.backupVersion ?? '1.0',
        createdAt: custom.createdAt ?? (meta.timeCreated as string),
        projectId: custom.projectId ?? '',
        collections: rootCollections,
        totalDocs: parseInt(custom.totalDocs ?? '0', 10),
        checksum: custom.checksum ?? '',
        sizeBytes: parseInt(custom.sizeBytes ?? String(meta.size ?? '0'), 10),
        filename,
      };

      items.push({ filename, storagePath: eligible[i].name, metadata });
    }

    // Newest first
    items.sort(
      (a, b) =>
        new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    );

    return NextResponse.json({ backups: items });
  } catch (err) {
    console.error('[api/backup/list]', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
