/**
 * Formatadores para relatórios de estatística de carga
 */

export function formatStatDate(dt: string | undefined): string {
  if (!dt) return '—';
  const brMatch = dt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return `${brMatch[1]}.${brMatch[2]}.${brMatch[3]}`;
  try {
    const d = new Date(dt);
    if (!isNaN(d.getTime()))
      return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  } catch { }
  return '—';
}

export function formatStatTime(dt: string | undefined): string {
  if (!dt) return '—';
  const timeMatch = dt.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3] ?? '00'}`;
  try {
    const d = new Date(dt);
    if (!isNaN(d.getTime()))
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  } catch { }
  return '—';
}

export function formatStatDuration(ms: number | undefined): string {
  if (!ms || ms <= 0) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formata data para e-mail (ISO ou pt-BR)
 */
export function fmtEmailDate(dt: string | undefined): string {
  if (!dt) return '—';
  const m = dt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleDateString('pt-BR');
}

/**
 * Formata hora para e-mail
 */
export function fmtEmailTime(dt: string | undefined): string {
  if (!dt) return '—';
  const m = dt.match(/\d{2}:\d{2}:\d{2}/);
  if (m) return m[0].slice(0, 5);
  const d = new Date(dt);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formata duração legível para e-mail
 */
export function fmtEmailDuration(ms: number | undefined): string {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
