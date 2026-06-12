import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { verifyCallerRole } from '@/lib/admin-auth';
import type { ChangeRoleRequest, UserRole } from '@/types/admin';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

const VALID_ROLES: UserRole[] = ['master', 'admin', 'especialista', 'membro'];

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:change-role:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec), "Cache-Control": "no-store" } }
      );
    }

    const body: ChangeRoleRequest = await req.json();
    const { targetUid, newRole, reason, callerToken } = body;

    if (!targetUid || !newRole || !reason?.trim() || !callerToken) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos. targetUid, newRole, reason e callerToken são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(newRole)) {
      return NextResponse.json({ error: `Perfil inválido: '${newRole}'.` }, { status: 400 });
    }

    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }
    const caller = verification.decoded;

    if (caller.uid === targetUid) {
      return NextResponse.json(
        { error: 'OPERAÇÃO BLOQUEADA: Não é permitido alterar o próprio perfil.' },
        { status: 403 }
      );
    }

    const targetRef = adminDb.collection('users').doc(targetUid);
    const targetDoc = await targetRef.get();

    if (!targetDoc.exists) {
      return NextResponse.json({ error: 'Usuário alvo não encontrado.' }, { status: 404 });
    }

    const targetData = targetDoc.data();
    const previousRole = targetData?.role ?? 'membro';

    await targetRef.update({
      role: newRole,
      updatedAt: new Date().toISOString(),
    });

    await adminDb.collection('audit_logs').add({
      action: 'CHANGE_ROLE',
      targetUid,
      targetEmail: targetData?.email ?? 'N/A',
      targetName: targetData?.name ?? 'N/A',
      previousRole,
      newRole,
      reason: reason.trim(),
      callerUid: caller.uid,
      callerEmail: caller.email ?? 'N/A',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, targetUid, previousRole, newRole });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
