import { getSupabaseAdmin } from '@/supabase/admin';

const EMAIL_SPLIT_RE = /[;,]/;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseRecipientList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const part of raw.split(EMAIL_SPLIT_RE)) {
    const email = normalizeEmail(part);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }

  return out;
}

export async function assertRecipientsAllowed(recipientField: string): Promise<string[]> {
  const recipients = parseRecipientList(recipientField);
  if (recipients.length === 0) {
    throw new Error('Nenhum destinatário informado.');
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('email_contacts').select('email');

  if (error) {
    throw new Error('Falha ao validar destinatários.');
  }

  const allowed = new Set(
    (data ?? [])
      .map((row) => normalizeEmail(String(row.email ?? '')))
      .filter(Boolean),
  );

  const blocked = recipients.filter((email) => !allowed.has(email));
  if (blocked.length > 0) {
    throw new Error('Destinatário não autorizado. Use apenas contatos cadastrados em Configurações → E-mails.');
  }

  return recipients;
}
