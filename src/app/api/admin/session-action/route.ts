import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/supabase/admin';
import { verifyCallerRole } from '@/lib/admin-auth';
import { ActionRequest } from '@/types/admin';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

type UserRole = 'master' | 'admin' | 'especialista' | 'membro';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:session-action:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec), "Cache-Control": "no-store" } }
      );
    }

    const body: ActionRequest = await req.json();
    const { targetUid, action, callerToken } = body;

    if (!targetUid || !action || !callerToken) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const verification = await verifyCallerRole(callerToken, ['admin', 'master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }
    const caller = verification.decoded;

    const callerUserDoc = await adminDb.collection('users').doc(caller.uid).get();
    const callerRole = callerUserDoc.data()?.role as UserRole | undefined;

    const targetUserRef = adminDb.collection('users').doc(targetUid);
    const targetUserDoc = await targetUserRef.get();
    const targetUserData = targetUserDoc.data();

    if (action === 'delete') {
      if (caller.uid === targetUid) {
        return NextResponse.json(
          { error: 'Não é permitido excluir o próprio usuário.' },
          { status: 403 },
        );
      }
      if (callerRole !== 'master') {
        return NextResponse.json(
          { error: 'Apenas usuários MASTER podem excluir contas.' },
          { status: 403 },
        );
      }
      if (!targetUserDoc.exists || !targetUserData) {
        return NextResponse.json({ error: 'Usuário alvo não encontrado.' }, { status: 404 });
      }
      const targetRole = targetUserData?.role as UserRole | undefined;
      const targetIsMaster = targetRole === 'master' || targetUserData?.isMaster === true;
      if (targetIsMaster) {
        return NextResponse.json(
          { error: 'Não é permitido excluir usuários com perfil MASTER.' },
          { status: 403 },
        );
      }
    }

    if (['logout', 'block-logout', 'delete'].includes(action)) {
      try {
        await adminAuth.revokeRefreshTokens(targetUid);
        await adminDb.collection('sessions').doc(targetUid).delete();
      } catch {
        // User may not exist in Auth — safe to continue
      }
    }

    if (action === 'block' || action === 'block-logout') {
      await adminAuth.updateUser(targetUid, { disabled: true });
      await adminDb.collection('users').doc(targetUid).update({ isDisabled: true });
    }

    if (action === 'unlock') {
      await adminAuth.updateUser(targetUid, { disabled: false });
      await adminDb.collection('users').doc(targetUid).update({ isDisabled: false });
    }

    if (action === 'delete') {
      await adminDb.collection('audit_logs').add({
        action: 'DELETE_USER',
        targetUid,
        targetEmail: targetUserData?.email || 'N/A',
        targetName: targetUserData?.name || 'N/A',
        callerUid: caller.uid,
        callerEmail: caller.email,
        timestamp: new Date().toISOString(),
      });

      try {
        await adminAuth.deleteUser(targetUid);
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code;
        if (code !== 'auth/user-not-found') {
          await adminDb.collection('error_logs').add({
            type: 'AUTH_DELETION_FAILURE',
            uid: targetUid,
            error: e instanceof Error ? e.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }
      }

      await targetUserRef.delete();
    }

    return NextResponse.json({ success: true, action, targetUid });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
