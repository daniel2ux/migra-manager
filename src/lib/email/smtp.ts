import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { adminDb } from '@/supabase/admin';
import { normalizeRecipientEmail, resolveReplyTo } from '@/lib/email/reply-to';
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/** Ajusta porta/SSL conforme convenções SMTP (465 = TLS implícito, 587 = STARTTLS). */
export function normalizeSmtpConfig(raw: {
  host: unknown;
  port?: unknown;
  secure?: unknown;
  user: unknown;
  pass: unknown;
}): SmtpConfig {
  const port = Number(raw.port) || 587;
  let secure = Boolean(raw.secure);
  if (port === 465) secure = true;
  if (port === 587) secure = false;

  return {
    host: String(raw.host).trim(),
    port,
    secure,
    user: String(raw.user).trim(),
    pass: String(raw.pass),
  };
}

function buildTransportOptions(smtp: SmtpConfig): SMTPTransport.Options {
  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    requireTLS: smtp.port === 587,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 10000,
    tls: { minVersion: 'TLSv1.2' },
  };
}

function formatSmtpError(err: unknown): Error {
  if (!(err instanceof Error)) {
    return new Error('Falha ao enviar e-mail via SMTP.');
  }

  const code = (err as NodeJS.ErrnoException).code;
  const msg = err.message.toLowerCase();

  if (code === 'EAUTH' || msg.includes('authentication failed') || msg.includes('invalid login')) {
    return new Error('Falha de autenticação SMTP — confira usuário e senha em Configurações.');
  }
  if (msg.includes('greeting never received') || code === 'ETIMEDOUT' || code === 'ECONNECTION') {
    return new Error('Não foi possível conectar ao servidor SMTP — verifique host, porta e SSL/TLS.');
  }

  return err;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const smtpDoc = await adminDb.collection('appConfig').doc('smtpConfig').get();
  const smtp = smtpDoc.data() as Record<string, unknown> | null | undefined;
  if (!smtp?.host || !smtp?.user || !smtp?.pass) return null;

  return normalizeSmtpConfig({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    user: smtp.user,
    pass: smtp.pass,
  });
}

export interface SendSmtpMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
  /** Cópia oculta para auditoria (ex.: mailbox do remetente). */
  bcc?: string;
}

export interface SendSmtpMailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export async function sendSmtpMail(options: SendSmtpMailOptions): Promise<SendSmtpMailResult> {
  const smtp = await getSmtpConfig();
  if (!smtp) {
    throw new Error('Configuração SMTP não definida no sistema.');
  }

  const transporter = nodemailer.createTransport(buildTransportOptions(smtp));

  const finalName = options.fromName?.trim() || 'Migra Manager';
  const to = normalizeRecipientEmail(options.to);
  const replyTo = resolveReplyTo(options.replyTo, smtp.user);
  const bcc = options.bcc?.trim() ? normalizeRecipientEmail(options.bcc) : undefined;

  try {
    const info = await transporter.sendMail({
      from: `"${finalName}" <${smtp.user}>`,
      replyTo,
      to,
      bcc: bcc && bcc !== to ? bcc : undefined,
      subject: options.subject,
      html: options.html,
      text: options.text,
      headers: {
        'X-Mailer': 'Migra Manager',
        'Precedence': 'auto',
        'X-Auto-Response-Suppress': 'All',
      },
    });

    const accepted = Array.isArray(info.accepted) ? info.accepted.map(String) : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : [];

    if (rejected.length > 0) {
      throw new Error(`Destinatário rejeitado pelo servidor SMTP: ${rejected.join(', ')}`);
    }

    return {
      messageId: String(info.messageId ?? ''),
      accepted,
      rejected,
    };
  } catch (err) {
    throw formatSmtpError(err);
  }
}