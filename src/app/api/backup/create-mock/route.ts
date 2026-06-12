import { NextRequest, NextResponse } from 'next/server';
import { verifyCallerRole } from '@/lib/admin-auth';
import { getBackupApiError } from '@/lib/backup/api-errors';
import {
  buildBackupFilename,
  buildCompressedBackup,
  parseBackupDestination,
} from '@/lib/backup/build-backup';
import { exportMockData } from '@/lib/backup/exporter-mock';
import { uploadBackupToStorage } from '@/lib/backup/upload-backup';

export const maxDuration = 300;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callerToken, projectId, mockId, destination: rawDestination, projectName } = body;
    const destination = parseBackupDestination(rawDestination);

    if (!callerToken || !projectId || !mockId) {
      return NextResponse.json(
        { error: 'callerToken, projectId e mockId são obrigatórios.' },
        { status: 400 },
      );
    }

    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const { data, totalDocs, collectionPaths, mockName } = await exportMockData(projectId, mockId);

    const resolvedProjectName =
      typeof projectName === 'string' && projectName.trim() ? projectName.trim() : projectId;
    const filename = buildBackupFilename({
      projectName: resolvedProjectName,
      mockName,
    });
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
          'X-Backup-Mock-Id': mockId,
          'X-Backup-Mock-Name': mockName,
          'X-Backup-Type': 'mock',
          'Cache-Control': 'no-store',
        },
      });
    }

    await uploadBackupToStorage(buffer, metadata);

    return NextResponse.json(
      {
        success: true,
        filename,
        metadata,
        mockName,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[api/backup/create-mock]', err);
    const { message, status } = getBackupApiError(err);
    return NextResponse.json(
      { error: message },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
