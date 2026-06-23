import { NextRequest, NextResponse } from 'next/server';
import { sendSmtpMail } from '@/lib/email/smtp';
import { validateEmailAttachments } from '@/lib/email/attachments';
import { assertRecipientsAllowed } from '@/lib/email/recipient-policy';
import { requireAuthenticatedCaller } from '@/lib/api/caller-auth';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { z } from 'zod';

const EmailAttachmentSchema = z.object({
  filename: z.string().min(1, 'Nome do anexo é obrigatório.'),
  content: z.string().min(1, 'Conteúdo do anexo é obrigatório.'),
  contentType: z.string().optional(),
});

const EmailRequestSchema = z.object({
  callerToken: z.string().min(1, 'Token de autenticação é obrigatório.'),
  from: z.string().email('E-mail do remetente inválido.').optional().or(z.literal('')),
  fromName: z.string().optional(),
  to: z.string().min(1, 'Destinatário é obrigatório.'),
  subject: z.string().min(1, 'Assunto é obrigatório.'),
  html: z.string().min(1, 'Conteúdo HTML é obrigatório.'),
  text: z.string().optional(),
  attachments: z.array(EmailAttachmentSchema).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`email:send:${ip}`, 25, 60_000);

    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rate.retryAfterSec),
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const validation = EmailRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Dados da requisição inválidos.',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { from, fromName, to, subject, html, text, attachments } = validation.data;

    const verification = await requireAuthenticatedCaller(body, req);
    if (verification.error || !verification.decoded) {
      return NextResponse.json(
        { error: verification.error ?? 'Não autorizado.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const userRate = checkRateLimit(`email:send:user:${verification.decoded.uid}`, 40, 60_000);
    if (!userRate.allowed) {
      return NextResponse.json(
        { error: 'Limite de envios por usuário atingido. Aguarde um momento.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(userRate.retryAfterSec),
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    let recipients: string[];
    try {
      recipients = await assertRecipientsAllowed(to);
    } catch (recipientError) {
      const message = recipientError instanceof Error ? recipientError.message : 'Destinatário não autorizado.';
      return NextResponse.json({ error: message }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    const senderEmail = from && from.trim() !== '' ? from : undefined;
    const finalName = fromName || (senderEmail ? senderEmail.split('@')[0] : 'Sistema Migra');

    let parsedAttachments;
    try {
      parsedAttachments = validateEmailAttachments(attachments);
    } catch (attachmentError) {
      const message = attachmentError instanceof Error ? attachmentError.message : 'Anexo inválido.';
      return NextResponse.json({ error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    await sendSmtpMail({
      to: recipients.join(', '),
      subject,
      html,
      text,
      fromName: finalName,
      replyTo: senderEmail,
      attachments: parsedAttachments,
    });

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: unknown) {
    console.error('[API/EMAIL/SEND] Internal Error:', err);
    return NextResponse.json(
      { error: 'Falha técnica ao processar envio de e-mail.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
