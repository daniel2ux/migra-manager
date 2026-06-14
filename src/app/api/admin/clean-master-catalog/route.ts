import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/supabase/admin';
import { verifyCallerRole } from '@/lib/admin-auth';
import { purgeInactiveMocks } from '@/lib/admin/purge-inactive-mocks';

export const maxDuration = 300;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callerToken, projectId, confirm, dryRun } = body as {
      callerToken?: string;
      projectId?: string;
      confirm?: boolean;
      dryRun?: boolean;
    };

    if (!callerToken) {
      return NextResponse.json({ error: 'callerToken é obrigatório.' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId é obrigatório.' }, { status: 400 });
    }

    if (!confirm) {
      return NextResponse.json(
        { error: 'Confirmação obrigatória. Envie { confirm: true }.' },
        { status: 400 },
      );
    }

    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const startedAt = Date.now();
    const result = await purgeInactiveMocks(admin, projectId, dryRun === true);

    return NextResponse.json({
      success: true,
      ...result,
      deletedCount: result.deletedMocks ?? 0,
      serverDurationMs: result.durationMs ?? Date.now() - startedAt,
    });
  } catch (err) {
    console.error('[clean-master-catalog]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 },
    );
  }
}
