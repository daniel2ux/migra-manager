import { ROLE_LABELS, type UserRole } from '@/types/usuarios';

export interface WelcomeUserEmailParams {
  name: string;
  email: string;
  tempPassword: string;
  role: UserRole;
  company?: string | null;
  position?: string | null;
  loginUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatOptionalRow(label: string, value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  return `
    <tr>
      <td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;">${escapeHtml(trimmed)}</td>
    </tr>`;
}

export function buildWelcomeUserEmail(params: WelcomeUserEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const roleLabel = ROLE_LABELS[params.role] ?? params.role;
  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safePassword = escapeHtml(params.tempPassword);
  const safeLoginUrl = escapeHtml(params.loginUrl);
  const companyRow = formatOptionalRow('Empresa', params.company);
  const positionRow = formatOptionalRow('Cargo', params.position);

  const subject = 'Migra Manager — Seu acesso ao sistema';

  const text = [
    `Olá, ${params.name}!`,
    '',
    'Seu acesso ao Migra Manager foi criado. Utilize as credenciais abaixo no primeiro login:',
    '',
    `E-mail: ${params.email}`,
    `Senha temporária: ${params.tempPassword}`,
    `Perfil: ${roleLabel}`,
    params.company?.trim() ? `Empresa: ${params.company.trim()}` : '',
    params.position?.trim() ? `Cargo: ${params.position.trim()}` : '',
    '',
    `Acesse: ${params.loginUrl}`,
    '',
    'Por segurança, você será solicitado a definir uma nova senha no primeiro acesso.',
    'Não compartilhe esta senha e altere-a assim que entrar no sistema.',
    '',
    '— Equipe Migra Manager',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#0070f2;padding:24px 28px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.82);">Migra Manager</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;line-height:1.3;color:#ffffff;">Bem-vindo(a) ao sistema</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Olá, <strong>${safeName}</strong> — seu acesso foi criado com sucesso.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#64748b;">
                Utilize as credenciais abaixo para entrar pela primeira vez. Por segurança, será necessário definir uma senha definitiva no primeiro acesso.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;vertical-align:top;">E-mail</td>
                        <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;">${safeEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">Senha temporária</td>
                        <td style="padding:8px 0;">
                          <code style="display:inline-block;background:#ffffff;border:1px solid #cbd5e1;border-radius:4px;padding:8px 12px;font-size:15px;font-weight:700;letter-spacing:0.06em;color:#0f172a;">${safePassword}</code>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">Perfil</td>
                        <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;">${escapeHtml(roleLabel)}</td>
                      </tr>
                      ${companyRow}
                      ${positionRow}
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-radius:6px;background:#0070f2;">
                    <a href="${safeLoginUrl}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Acessar o sistema</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#94a3b8;word-break:break-all;">
                Ou copie o endereço: <a href="${safeLoginUrl}" style="color:#0070f2;text-decoration:none;">${safeLoginUrl}</a>
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.5;color:#9a3412;">
                    <strong>Importante:</strong> não compartilhe sua senha temporária. Altere-a no primeiro login e mantenha suas credenciais em local seguro.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                Mensagem automática do Migra Manager. Em caso de dúvidas, contate o administrador do sistema.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export interface PasswordResetEmailParams {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}

export function buildPasswordResetEmail(params: PasswordResetEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safePassword = escapeHtml(params.tempPassword);
  const safeLoginUrl = escapeHtml(params.loginUrl);

  const subject = 'Migra Manager — Nova senha temporária';

  const text = [
    `Olá, ${params.name}!`,
    '',
    'A senha do seu acesso ao Migra Manager foi redefinida pelo administrador.',
    'Utilize as credenciais abaixo para entrar no sistema:',
    '',
    `E-mail: ${params.email}`,
    `Senha temporária: ${params.tempPassword}`,
    '',
    `Acesse: ${params.loginUrl}`,
    '',
    'Por segurança, você será solicitado a definir uma nova senha no próximo acesso.',
    'Não compartilhe esta senha e altere-a assim que entrar no sistema.',
    '',
    '— Equipe Migra Manager',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#e76500;padding:24px 28px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.82);">Migra Manager</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;line-height:1.3;color:#ffffff;">Senha redefinida</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Olá, <strong>${safeName}</strong> — sua senha foi redefinida pelo administrador do sistema.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#64748b;">
                Utilize as credenciais abaixo para entrar. Por segurança, será necessário definir uma senha definitiva no próximo acesso.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;vertical-align:top;">E-mail</td>
                        <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;">${safeEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">Senha temporária</td>
                        <td style="padding:8px 0;">
                          <code style="display:inline-block;background:#ffffff;border:1px solid #cbd5e1;border-radius:4px;padding:8px 12px;font-size:15px;font-weight:700;letter-spacing:0.06em;color:#0f172a;">${safePassword}</code>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-radius:6px;background:#0070f2;">
                    <a href="${safeLoginUrl}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Acessar o sistema</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#94a3b8;word-break:break-all;">
                Ou copie o endereço: <a href="${safeLoginUrl}" style="color:#0070f2;text-decoration:none;">${safeLoginUrl}</a>
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.5;color:#9a3412;">
                    <strong>Importante:</strong> não compartilhe sua senha temporária. Altere-a no próximo login e mantenha suas credenciais em local seguro.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                Mensagem automática do Migra Manager. Em caso de dúvidas, contate o administrador do sistema.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export function resolveAppLoginUrl(req?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) return `${configured}/login`;

  if (req) {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') ?? 'http';
    if (host) return `${proto}://${host}/login`;
  }

  return 'http://localhost:9002/login';
}
