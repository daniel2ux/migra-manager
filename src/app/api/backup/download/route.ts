import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket } from '@/firebase/admin-storage';
import { verifyCallerRole } from '@/lib/admin-auth';
import { isValidBackupFilename } from '@/lib/backup/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { callerToken, filename } = await req.json();

    if (!callerToken || !filename) {
      return NextResponse.json({ error: 'callerToken e filename obrigatórios.' }, { status: 400 });
    }

    if (!isValidBackupFilename(filename)) {
      return NextResponse.json({ error: 'filename inválido.' }, { status: 400 });
    }

    const verification = await verifyCallerRole(callerToken, ['master', 'admin']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const bucket = getAdminStorageBucket();
    const file = bucket.file(`backups/${filename}`);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    }

    const [content] = await file.download();

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(content.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[api/backup/download]', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
