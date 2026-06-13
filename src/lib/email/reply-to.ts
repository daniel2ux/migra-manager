const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Domínios fictícios/internos que não devem ir em Reply-To (prejudicam entrega). */
const BLOCKED_REPLY_DOMAINS = ['.local', '.invalid', '.test', '.localhost'];

export function resolveReplyTo(candidate?: string | null, fallback?: string): string | undefined {
  const email = candidate?.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) return fallback;

  const domain = email.split('@')[1] ?? '';
  if (BLOCKED_REPLY_DOMAINS.some((suffix) => domain.endsWith(suffix))) {
    return fallback;
  }

  return email;
}

export function normalizeRecipientEmail(email: string): string {
  return email.trim().toLowerCase();
}
