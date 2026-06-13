import { sendSmtpMail, type SendSmtpMailResult } from '@/lib/email/smtp';
import {
  buildPasswordResetEmail,
  buildWelcomeUserEmail,
  resolveAppLoginUrl,
  type PasswordResetEmailParams,
  type WelcomeUserEmailParams,
} from '@/lib/email/welcome-user';

type SendMailOptions = { replyTo?: string; fromName?: string; bcc?: string };

export async function sendWelcomeUserEmail(
  params: Omit<WelcomeUserEmailParams, 'loginUrl'> & { loginUrl?: string },
  options?: SendMailOptions,
): Promise<SendSmtpMailResult> {
  const loginUrl = params.loginUrl ?? resolveAppLoginUrl();
  const { subject, html, text } = buildWelcomeUserEmail({ ...params, loginUrl });

  return sendSmtpMail({
    to: params.email,
    subject,
    html,
    text,
    fromName: options?.fromName ?? 'Migra Manager',
    replyTo: options?.replyTo,
    bcc: options?.bcc,
  });
}

export async function sendPasswordResetEmail(
  params: Omit<PasswordResetEmailParams, 'loginUrl'> & { loginUrl?: string },
  options?: SendMailOptions,
): Promise<SendSmtpMailResult> {
  const loginUrl = params.loginUrl ?? resolveAppLoginUrl();
  const { subject, html, text } = buildPasswordResetEmail({ ...params, loginUrl });

  return sendSmtpMail({
    to: params.email,
    subject,
    html,
    text,
    fromName: options?.fromName ?? 'Migra Manager',
    replyTo: options?.replyTo,
    bcc: options?.bcc,
  });
}
