import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { verifyCallerRole } from '@/lib/admin-auth';
import { getBackupApiError } from '@/lib/backup/api-errors';
import {
  buildBackupFilename,
  buildCompressedBackup,
  parseBackupDestination,
} from '@/lib/backup/build-backup';
import { exportAllCollections } from '@/lib/backup/exporter';
import { uploadBackupToStorage } from '@/lib/backup/upload-backup';

export const maxDuration = 300;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { callerToken, destination: rawDestination, projectId: bodyProjectId, projectName } =
      await req.json();
    const destination = parseBackupDestination(rawDestination);

    if (!callerToken) {
      return NextResponse.json({ error: 'callerToken obrigatório.' }, { status: 400 });
    }

    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const { data, totalDocs, collectionPaths } = await exportAllCollections();

    const projectId =
      typeof bodyProjectId === 'string' && bodyProjectId.trim()
        ? bodyProjectId.trim()
        : process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] ?? 'unknown';
    const resolvedProjectName =
      typeof projectName === 'string' && projectName.trim() ? projectName.trim() : projectId;
    const filename = buildBackupFilename({ projectName: resolvedProjectName });
    const { metadata, buffer } = buildCompressedBackup({
      data,
      projectId,
      filename,
      collectionPaths,
      totalDocs,
    });

    if (destination === 'local') {
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(buffer.length),
          'X-Backup-Total-Docs': String(totalDocs),
          'X-Backup-Size-Bytes': String(buffer.length),
          'X-Backup-Checksum': metadata.checksum,
          'X-Backup-Created-At': metadata.createdAt,
          'X-Backup-Project-Id': projectId,
          'X-Backup-Project-Name': resolvedProjectName,
          'X-Backup-Type': 'full',
          'Cache-Control': 'no-store',
        },
      });
    }

    await uploadBackupToStorage(buffer, metadata, { backupType: 'full' });

    return NextResponse.json(
      { success: true, filename, metadata },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[api/backup/create]', err);
    const { message, status } = getBackupApiError(err);
    return NextResponse.json(
      { error: message },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
