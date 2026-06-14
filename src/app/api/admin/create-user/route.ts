import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/supabase/admin';
import { verifyCallerRole } from '@/lib/admin-auth';
import type { UserRole } from '@/types/admin';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { generateTempPassword } from '@/lib/security/temp-password';
import { sendWelcomeUserEmail } from '@/lib/email/send-welcome-user';
import { resolveAppLoginUrl } from '@/lib/email/welcome-user';
import { getSmtpConfig } from '@/lib/email/smtp';

const VALID_ROLES: UserRole[] = ['master', 'admin', 'especialista', 'membro'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const { email, name, role, company, position, reason, callerToken, accessProfileId } = body;

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

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim().toUpperCase();

    // Gera senha temporária com CSPRNG (evita Math.random).
    const tempPassword = generateTempPassword();

    let userRecord: { uid: string; email?: string | null };
    let createdAuth = false;

    try {
      userRecord = await adminAuth.createUser({
        email: normalizedEmail,
        password: tempPassword,
        displayName: normalizedName,
      });
      createdAuth = true;
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'auth/email-already-exists') {
        throw e;
      }

      const existingAuth = await adminAuth.getUserByEmail(normalizedEmail);
      const existingProfile = await adminDb.collection('users').doc(existingAuth.uid).get();
      if (existingProfile.exists) {
        return NextResponse.json({ error: 'O e-mail fornecido já está em uso.' }, { status: 400 });
      }

      // Auth órfão (cadastro anterior falhou ao gravar profile) — recupera o cadastro.
      await adminAuth.updateUser(existingAuth.uid, { password: tempPassword, disabled: false });
      userRecord = { uid: existingAuth.uid, email: existingAuth.email };
    }

    const targetRef = adminDb.collection('users').doc(userRecord.uid);
    const normalizedCompany = typeof company === 'string' ? company.trim() : '';
    const normalizedPosition = typeof position === 'string' ? position.trim().toUpperCase() : '';

    const profilePayload = {
      uid: userRecord.uid,
      email: normalizedEmail,
      name: normalizedName,
      role,
      company: normalizedCompany || null,
      position: normalizedPosition || null,
      accessProfileId: accessProfileId ?? null,
      isDisabled: false,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await targetRef.set(profilePayload);

      await adminDb.collection('audit_logs').add({
        action: 'CREATE_USER',
        targetUid: userRecord.uid,
        targetEmail: normalizedEmail,
        targetName: normalizedName,
        newRole: role,
        accessProfileId: accessProfileId ?? null,
        reason: reason.trim(),
        callerUid: caller.uid,
        callerEmail: caller.email ?? 'N/A',
        timestamp: new Date().toISOString(),
      });
    } catch (profileErr) {
      if (createdAuth) {
        await adminAuth.deleteUser(userRecord.uid).catch((rollbackErr) => {
          console.error('[create-user] rollback auth falhou:', rollbackErr);
        });
      }
      throw profileErr;
    }

    let emailSent = false;
    let emailError: string | undefined;
    let messageId: string | undefined;
    const smtp = await getSmtpConfig();
    try {
      const mailResult = await sendWelcomeUserEmail(
        {
          name: normalizedName,
          email: normalizedEmail,
          tempPassword,
          role,
          company: normalizedCompany,
          position: normalizedPosition,
          loginUrl: resolveAppLoginUrl(req),
        },
        {
          fromName: 'Migra Manager',
          replyTo: caller.email ?? undefined,
          bcc: smtp?.user,
        },
      );
      emailSent = true;
      messageId = mailResult.messageId;
      console.info('[create-user] e-mail enviado:', { to: normalizedEmail, messageId });
    } catch (mailErr: unknown) {
      emailError = mailErr instanceof Error ? mailErr.message : 'Falha ao enviar e-mail.';
      console.warn('[create-user] e-mail não enviado:', emailError);
    }

    return NextResponse.json(
      { success: true, uid: userRecord.uid, tempPassword, emailSent, emailError, messageId, sentTo: normalizedEmail },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    console.error('[create-user]', err);
    const message = err instanceof Error ? err.message : 'Erro interno do servidor.';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
