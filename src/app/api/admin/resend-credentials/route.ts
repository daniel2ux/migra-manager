import { NextRequest, NextResponse } from 'next/server';
import { verifyCallerRole } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email/send-welcome-user';
import { resolveAppLoginUrl } from '@/lib/email/welcome-user';
import { getSmtpConfig } from '@/lib/email/smtp';
import { normalizeRecipientEmail } from '@/lib/email/reply-to';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:resend-credentials:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec), 'Cache-Control': 'no-store' } },
      );
    }

    const { name, email, tempPassword, callerToken } = await req.json();

    if (!name?.trim() || !email?.trim() || !tempPassword?.trim() || !callerToken) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const normalizedEmail = normalizeRecipientEmail(email);
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Formato de e-mail inválido.' }, { status: 400 });
    }

    const verification = await verifyCallerRole(callerToken, ['master']);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? 'Não autorizado.' }, { status: 403 });
    }
    const caller = verification.decoded;

    const smtp = await getSmtpConfig();
    if (!smtp) {
      return NextResponse.json({ error: 'Configuração SMTP não definida no sistema.' }, { status: 400 });
    }

    let mailResult;
    try {
      mailResult = await sendPasswordResetEmail(
        {
          name: String(name).trim().toUpperCase(),
          email: normalizedEmail,
          tempPassword: String(tempPassword),
          loginUrl: resolveAppLoginUrl(req),
        },
        {
          fromName: 'Migra Manager',
          replyTo: caller.email ?? undefined,
          bcc: smtp.user,
        },
      );
    } catch (mailErr: unknown) {
      const emailError = mailErr instanceof Error ? mailErr.message : 'Falha ao enviar e-mail.';
      console.warn('[resend-credentials] e-mail não enviado:', emailError);
      return NextResponse.json(
        { success: false, emailSent: false, emailError },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      {
        success: true,
        emailSent: true,
        messageId: mailResult.messageId,
        sentTo: normalizedEmail,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
