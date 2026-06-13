import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/supabase/admin';
import { sendSmtpMail } from '@/lib/email/smtp';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { z } from 'zod';

/**
 * Schema para validação rigorosa do corpo da requisição de e-mail.
 */
const EmailRequestSchema = z.object({
  callerToken: z.string().min(1, 'Token de autenticação é obrigatório.'),
  from: z.string().email('E-mail do remetente inválido.').optional().or(z.literal('')),
  fromName: z.string().optional(),
  to: z.string().email('E-mail do destinatário inválido.'),
  subject: z.string().min(1, 'Assunto é obrigatório.'),
  html: z.string().min(1, 'Conteúdo HTML é obrigatório.'),
  text: z.string().optional(),
});



/**
 * Verifica o token de ID do usuário autenticado.
 */
async function verifyUser(token: string): Promise<{ uid: string } | { error: string }> {
  if (!token) return { error: 'Token não fornecido.' };

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return { error: 'Sessão inválida ou expirada.' };
  }
}

/**
 * Handler POST para envio de e-mails via SMTP configurado no banco de dados.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP
    const ip = getClientIp(req);
    const rate = checkRateLimit(`email:send:${ip}`, 25, 60_000);
    
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { 
          status: 429, 
          headers: { 
            'Retry-After': String(rate.retryAfterSec),
            "Cache-Control": "no-store" 
          } 
        }
      );
    }

    // 2. Validação do Body
    const body = await req.json().catch(() => ({}));
    const validation = EmailRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Dados da requisição inválidos.', 
        details: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { callerToken, from, fromName, to, subject, html, text } = validation.data;

    // 3. Autenticação
    const authResult = await verifyUser(callerToken);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const senderEmail = from && from.trim() !== '' ? from : undefined;
    const finalName = fromName || (senderEmail ? senderEmail.split('@')[0] : 'Sistema Migra');

    await sendSmtpMail({
      to,
      subject,
      html,
      text,
      fromName: finalName,
      replyTo: senderEmail,
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    console.error('[API/EMAIL/SEND] Internal Error:', err);
    return NextResponse.json(
      { error: 'Falha técnica ao processar envio de e-mail.' },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

