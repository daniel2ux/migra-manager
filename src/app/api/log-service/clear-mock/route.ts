import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/supabase/admin';
import { verifyCallerRole } from '@/lib/admin-auth';

export const maxDuration = 300;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callerToken, projectId, mockId, confirm } = body;

    if (!callerToken || !projectId || !mockId) {
      return NextResponse.json(
        { error: 'callerToken, projectId e mockId são obrigatórios.' },
        { status: 400 },
      );
    }

    if (!confirm) {
      return NextResponse.json(
        { error: 'Confirmação é obrigatória. Envie { confirm: true }.' },
        { status: 400 },
      );
    }

    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const batchSize = 400;

    const { data: logRows } = await admin
      .from('migration_logs')
      .select('id')
      .eq('mock', mockId)
      .eq('project_id', projectId);

    let deletedCount = 0;
    const logIds = (logRows ?? []).map((r) => (r as { id: string }).id);

    for (let i = 0; i < logIds.length; i += batchSize) {
      const chunk = logIds.slice(i, i + batchSize);
      const { error } = await admin.from('migration_logs').delete().in('id', chunk);
      if (error) throw error;
      deletedCount += chunk.length;
    }

    const { data: objectRows } = await admin
      .from('migration_objects')
      .select('id')
      .eq('mock_id', mockId)
      .eq('project_id', projectId)
      .eq('has_tech_logs', true);

    let flagsUpdatedCount = 0;
    const objectIds = (objectRows ?? []).map((r) => (r as { id: string }).id);

    for (let i = 0; i < objectIds.length; i += batchSize) {
      const chunk = objectIds.slice(i, i + batchSize);
      const { error } = await admin
        .from('migration_objects')
        .update({ has_tech_logs: false })
        .in('id', chunk);
      if (error) throw error;
      flagsUpdatedCount += chunk.length;
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      flagsUpdatedCount,
      message:
        deletedCount === 0
          ? 'Nenhum log encontrado para este mock. Flags de logs tecnicos foram sincronizadas.'
          : `${deletedCount} logs deletados com sucesso e ${flagsUpdatedCount} objeto(s) sincronizado(s).`,
    });
  } catch (err) {
    console.error('[api/log-service/clear-mock]', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
