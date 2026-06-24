export const MAX_EMAIL_ATTACHMENTS = 5;
export const MAX_EMAIL_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB por arquivo
export const MAX_EMAIL_ATTACHMENTS_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB no total

export interface EmailAttachmentInput {
  filename: string;
  content: string;
  contentType?: string;
}

export interface ParsedEmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function sanitizeAttachmentFilename(raw: string): string {
  const base = raw.split(/[/\\]/).pop()?.trim() ?? 'anexo';
  const cleaned = base.replace(/[\x00-\x1f<>:"|?*]/g, '_').replace(/^\.+/, '');
  const name = cleaned.slice(0, 200) || 'anexo';
  return name;
}

export function validateEmailAttachments(
  attachments: EmailAttachmentInput[] | undefined,
): ParsedEmailAttachment[] {
  if (!attachments?.length) return [];

  if (attachments.length > MAX_EMAIL_ATTACHMENTS) {
    throw new Error(`Máximo de ${MAX_EMAIL_ATTACHMENTS} anexos por e-mail.`);
  }

  const parsed: ParsedEmailAttachment[] = [];
  let totalBytes = 0;

  for (const attachment of attachments) {
    const filename = sanitizeAttachmentFilename(attachment.filename);
    if (!filename) {
      throw new Error('Nome de anexo inválido.');
    }

    const content = attachment.content?.trim();
    if (!content) {
      throw new Error(`Anexo "${filename}" está vazio.`);
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(content, 'base64');
    } catch {
      throw new Error(`Conteúdo inválido no anexo "${filename}".`);
    }

    if (buffer.length === 0) {
      throw new Error(`Anexo "${filename}" está vazio.`);
    }

    if (buffer.length > MAX_EMAIL_ATTACHMENT_BYTES) {
      throw new Error(
        `Anexo "${filename}" excede ${formatBytes(MAX_EMAIL_ATTACHMENT_BYTES)}.`,
      );
    }

    totalBytes += buffer.length;
    if (totalBytes > MAX_EMAIL_ATTACHMENTS_TOTAL_BYTES) {
      throw new Error(
        `Tamanho total dos anexos excede ${formatBytes(MAX_EMAIL_ATTACHMENTS_TOTAL_BYTES)}.`,
      );
    }

    parsed.push({
      filename,
      content: buffer,
      contentType: attachment.contentType?.trim() || undefined,
    });
  }

  return parsed;
}
