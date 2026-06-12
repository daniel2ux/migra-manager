import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/supabase/admin';
import { verifyCallerRole } from '@/lib/admin-auth';
import type { UserRole } from '@/types/admin';
import { randomInt } from 'node:crypto';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

const VALID_ROLES: UserRole[] = ['master', 'admin', 'especialista', 'membro'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateTempPassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[randomInt(0, chars.length)];
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:create-user:${ip}`, 12, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec), "Cache-Control": "no-store" } }
      );
    }

    const body = await req.json();
    const { email, name, role, reason, callerToken } = body;

    if (!email || !name || !role || !reason?.trim() || !callerToken) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos. email, name, role, reason e callerToken são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Formato de e-mail inválido.' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Perfil inválido: '${role}'.` }, { status: 400 });
    }

    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }
    const caller = verification.decoded;

    // Gera senha temporária com CSPRNG (evita Math.random).
    const tempPassword = generateTempPassword(8);

    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: email.trim().toLowerCase(),
        password: tempPassword,
        displayName: name.trim().toUpperCase(),
      });
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'O e-mail fornecido já está em uso.' }, { status: 400 });
      }
      throw e;
    }

    const targetRef = adminDb.collection('users').doc(userRecord.uid);
    await targetRef.set({
      uid: userRecord.uid,
      email: email.trim().toLowerCase(),
      name: name.trim().toUpperCase(),
      role,
      isDisabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await adminDb.collection('audit_logs').add({
      action: 'CREATE_USER',
      targetUid: userRecord.uid,
      targetEmail: email.trim().toLowerCase(),
      targetName: name.trim().toUpperCase(),
      newRole: role,
      reason: reason.trim(),
      callerUid: caller.uid,
      callerEmail: caller.email ?? 'N/A',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, uid: userRecord.uid, tempPassword },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
