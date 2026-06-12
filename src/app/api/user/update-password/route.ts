import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/firebase/admin';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`user:update-password:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec), "Cache-Control": "no-store" } }
      );
    }

    const { newPassword, callerToken } = await req.json();

    if (!newPassword || !callerToken) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    // Verify the caller's token — any authenticated user can change their own password
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(callerToken);
    } catch {
      return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
    }

    // Update password via Admin SDK (bypasses the client-side "requires-recent-login" restriction)
    await adminAuth.updateUser(decoded.uid, { password: newPassword });

    // Clear the mustChangePassword flag
    await adminDb.collection('users').doc(decoded.uid).update({ mustChangePassword: false });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
