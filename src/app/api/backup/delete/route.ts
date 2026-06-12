import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket } from '@/supabase/admin-storage';
import { verifyCallerRole } from '@/lib/admin-auth';
import { isValidBackupFilename } from '@/lib/backup/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { callerToken, filename } = await req.json();

    if (!callerToken || !filename) {
      return NextResponse.json({ error: 'callerToken e filename obrigatórios.' }, { status: 400 });
    }

    if (!isValidBackupFilename(filename)) {
      return NextResponse.json({ error: 'filename inválido.' }, { status: 400 });
    }

    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const bucket = getAdminStorageBucket();
    const file = bucket.file(`backups/${filename}`);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    }

    await file.delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/backup/delete]', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
