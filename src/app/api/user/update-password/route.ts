import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { mapAuthPasswordError, validatePasswordPolicy } from '@/lib/security/password-policy';

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

    const policyError = validatePasswordPolicy(String(newPassword));
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(callerToken);
    } catch {
      return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
    }

    try {
      await adminAuth.updateUser(decoded.uid, { password: newPassword });
    } catch (authErr: unknown) {
      const message = authErr instanceof Error ? authErr.message : 'Falha ao atualizar senha.';
      console.warn('[update-password] auth:', message);
      return NextResponse.json(
        { error: mapAuthPasswordError(message) },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    await adminDb.collection('users').doc(decoded.uid).update({ mustChangePassword: false });

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor.';
    console.error('[update-password]', err);
    return NextResponse.json(
      { error: mapAuthPasswordError(message) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
