import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/firebase/admin';
import { verifyCallerRole } from '@/lib/admin-auth';
import { randomInt } from 'node:crypto';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

function generateTempPassword(): string {
  // Chars without ambiguous characters (0/O, 1/I/l)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[randomInt(0, chars.length)];
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:reset-password:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec), "Cache-Control": "no-store" } }
      );
    }

    const { targetUid, callerToken } = await req.json();

    if (!targetUid || !callerToken) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }
    const caller = verification.decoded;

    if (caller.uid === targetUid) {
      return NextResponse.json(
        { error: 'Não é possível resetar sua própria senha por aqui.' },
        { status: 400 }
      );
    }

    const targetDoc = await adminDb.collection('users').doc(targetUid).get();
    const targetData = targetDoc.data();

    if (!targetData) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const email = targetData.email as string;
    if (!email) {
      return NextResponse.json({ error: 'Usuário sem e-mail cadastrado.' }, { status: 400 });
    }

    let authUser;
    try {
      authUser = await adminAuth.getUserByEmail(email);
    } catch {
      return NextResponse.json(
        { error: `Usuário ${email} não encontrado no Firebase Auth.` },
        { status: 404 }
      );
    }

    const tempPassword = generateTempPassword();

    await adminAuth.updateUser(authUser.uid, { password: tempPassword, disabled: false });
    await adminDb.collection('users').doc(targetUid).update({ mustChangePassword: true });
    await adminDb.collection('sessions').doc(targetUid).delete().catch(() => {});

    await adminDb.collection('audit_logs').add({
      action: 'RESET_PASSWORD',
      targetUid: authUser.uid,
      targetEmail: email,
      targetName: targetData.name || 'N/A',
      callerUid: caller.uid,
      callerEmail: caller.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, tempPassword },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
