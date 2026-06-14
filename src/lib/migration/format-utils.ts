/**
 * Shared formatting utilities for migration objects.
 */

export function formatNumber(val: number | string): string {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "string" ? parseInt(val.replace(/\D/g, ""), 10) : val;
  if (isNaN(num)) return "0";
  return num.toLocaleString("pt-BR");
}

export function unformatNumber(val: string): number {
  const rawValue = val.replace(/\D/g, "");
  return parseInt(rawValue, 10) || 0;
}

/** Formata contagem numérica durante digitação (pt-BR); vazio permanece vazio. */
export function formatNumberInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return formatNumber(parseInt(digits, 10));
}

export function formatDurationInput(ms: number, allowZero: boolean = false): string {
  if (!ms || ms <= 0) return allowZero ? "00H 00M 00S" : "00H 00M 01S";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}H ${minutes.toString().padStart(2, "0")}M ${seconds.toString().padStart(2, "0")}S`;
}

export function parseDurationString(str: string): number {
  const match = str.match(/(\d+)\s*H\s*(\d+)\s*M(?:\s*(\d+)\s*S)?/i);
  if (match) {
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const s = parseInt(match[3] || "0");
    return h * 3600000 + m * 60000 + s * 1000;
  }
  return 0;
}

export function formatPercentage(
  pct: number,
  formatType?: "success" | "error" | "default",
  hasErrors: boolean = false
): string {
  if (!pct || pct === 0) {
    if (formatType === "error" && hasErrors) return "0,01";
    return "0,00";
  }
  const formatted = pct.toFixed(2);
  if (formatType === "error" && hasErrors && formatted === "0.00") return "0,01";
  if (formatType === "success" && hasErrors && (pct >= 100 || formatted === "100.00")) return "99,99";
  if (pct >= 100) return "100,00";
  return formatted.replace(".", ",");
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

// formatCommentDate foi unificado em @/lib/formatters.tsx
// Este arquivo mantém apenas as funções específicas de migração

export function parseBrazilianDateTime(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const normalized = trimmed
    .replace(/\s+/g, " ")
    .replace(/,(?=\d{4})/g, "/") // Aceita "01/03,2026"
    .replace(/\./g, "/");

  const toLocalIso = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  };

  const brMatch = normalized.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:[ T,]+(\d{1,2})(?::|h)?(\d{1,2})?(?::(\d{1,2}))?)?$/
  );
  if (brMatch) {
    const [, dayRaw, monthRaw, yearRaw, hhRaw = "00", miRaw = "00", ssRaw = "00"] = brMatch;
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = yearRaw.length === 2 ? Number(`20${yearRaw}`) : Number(yearRaw);
    const hh = Number(hhRaw);
    const mi = Number(miRaw);
    const ss = Number(ssRaw);

    if (
      day < 1 || day > 31 ||
      month < 1 || month > 12 ||
      hh < 0 || hh > 23 ||
      mi < 0 || mi > 59 ||
      ss < 0 || ss > 59
    ) {
      return "";
    }

    const dt = new Date(year, month - 1, day, hh, mi, ss);
    if (
      Number.isNaN(dt.getTime()) ||
      dt.getFullYear() !== year ||
      dt.getMonth() !== month - 1 ||
      dt.getDate() !== day
    ) {
      return "";
    }

    return toLocalIso(dt);
  }

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (isoMatch) {
    const [, year, month, day, hh = "00", mi = "00", ss = "00"] = isoMatch;
    return `${year}-${month}-${day}T${hh}:${mi}:${ss}`;
  }

  // Evita parse ambíguo de datas com "/" no formato americano pelo Date nativo.
  if (normalized.includes("/")) return "";

  const d = new Date(normalized);
  if (!isNaN(d.getTime())) return toLocalIso(d);

  return "";
}
