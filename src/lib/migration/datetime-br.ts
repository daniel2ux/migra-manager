/**
 * Parsing e formatação de data/hora em padrão brasileiro (pt-BR, 24h).
 * Aceita ISO `yyyy-mm-ddThh:mm:ss`, texto `dd/mm/yyyy hh:mm[:ss]` ou `dd/mm/yyyy, hh:mm[:ss]` (Intl).
 */

const BR_SEGMENT = /^(\d{2})\/(\d{2})\/(\d{4})[\s,]+(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function parseBrazilianLocalDateTime(value: string): Date | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)) {
    const d = new Date(v.length === 16 ? `${v}:00` : v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const brMatch = v.match(BR_SEGMENT);
  if (brMatch) {
    const [, dd, mm, yyyy, hh, mi, ss = "00"] = brMatch;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Ex.: `01/07/2026` — aceita ISO `yyyy-mm-dd` ou texto `dd/mm/yyyy`. */
export function formatBrazilianDate(value: string): string {
  if (!value?.trim()) return "";
  const v = value.trim();
  const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return `${dd}/${mm}/${yyyy}`;
  }
  const brMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return v;
  return v;
}

/** Ex.: `20/05/2026, 11:08:00` (pt-BR, 24h, com segundos). */
export function formatBrazilianDateTime(isoOrBr: string): string {
  if (!isoOrBr?.trim()) return "";
  const parsed = parseBrazilianLocalDateTime(isoOrBr);
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(parsed);
}

/** ISO local com segundos (sem timezone Z), usado no CompatDb/formulários. */
export function toIsoLocalSeconds(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}
