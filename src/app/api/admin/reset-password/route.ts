import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/supabase/admin';
import { verifyCallerRole } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { generateTempPassword } from '@/lib/security/temp-password';
import { sendPasswordResetEmail } from '@/lib/email/send-welcome-user';
import { resolveAppLoginUrl } from '@/lib/email/welcome-user';
import { getSmtpConfig } from '@/lib/email/smtp';
import { normalizeRecipientEmail } from '@/lib/email/reply-to';
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

    const profileEmail = normalizeRecipientEmail(String(targetData.email ?? ''));
    if (!profileEmail) {
      return NextResponse.json({ error: 'Usuário sem e-mail cadastrado.' }, { status: 400 });
    }

    let authUser;
    try {
      authUser = await adminAuth.getUserByEmail(profileEmail);
    } catch {
      return NextResponse.json(
        { error: `Usuário ${profileEmail} não encontrado na autenticação.` },
        { status: 404 }
      );
    }

    const email = normalizeRecipientEmail(authUser.email || profileEmail);

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

    let emailSent = false;
    let emailError: string | undefined;
    let messageId: string | undefined;
    const smtp = await getSmtpConfig();
    try {
      const mailResult = await sendPasswordResetEmail(
        {
          name: (targetData.name as string) || email,
          email,
          tempPassword,
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
      console.info('[reset-password] e-mail enviado:', { to: email, messageId });
    } catch (mailErr: unknown) {
      emailError = mailErr instanceof Error ? mailErr.message : 'Falha ao enviar e-mail.';
      console.warn('[reset-password] e-mail não enviado:', emailError);
    }

    return NextResponse.json(
      { success: true, tempPassword, emailSent, emailError, messageId, sentTo: email },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
