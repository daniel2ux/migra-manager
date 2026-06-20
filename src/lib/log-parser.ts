/**
 * Shared parsers for SAP IS-U migration log files (.log and .err).
 * Used by both server-side API routes and client-side import flows.
 */

export interface ParsedLogEntry {
  object: string;
  oldKey?: string;
  status: string;
  errorId?: string;
  errorNumber?: string;
  message: string;
  seq: number;
}

/**
 * Remove sufixo de quantidade quando o arquivo traz um contador
 * numérico isolado no fim da mensagem (ex.: "... (PARTNER) 19").
 */
function stripTrailingCountToken(message: string): string {
  if (!message) return "";
  const normalized = message.trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  const parts = normalized.split(" ");
  if (parts.length < 2) return normalized;

  const lastToken = parts[parts.length - 1];
  // Aceita apenas inteiro simples ou formatado com separador de milhar.
  if (!/^\d{1,3}(?:[.,]\d{3})*$|^\d+$/.test(lastToken)) return normalized;

  return parts.slice(0, -1).join(" ").trim();
}

/**
 * Parses a single line from a .err file.
 * Format: OBJECT  OLD_KEY  STATUS  ERROR_ID  ERROR_NUMBER  MESSAGE...
 * Columns are separated by 2+ spaces or tabs.
 */
function parseErrLine(
  line: string,
  objectName: string,
  lineNo: number,
): ParsedLogEntry | null {
  // Split by tab or 1+ spaces
  const fields = line.split(/\t|\s+/).map(f => f.trim()).filter(f => f.length > 0);
  
  // Minimal fields check: at least Object, Key and Message/Status
  if (fields.length < 3) return null;

  return {
    object:      objectName,
    oldKey:      fields[1] || '',
    status:      fields[2] || 'ERROR',
    errorId:     fields[3] || '',
    errorNumber: fields[4] || '',
    message:     stripTrailingCountToken(fields.length > 5 ? fields.slice(5).join(' ') : (fields[fields.length-1] || '')),
    seq:         lineNo,
  };
}

/**
 * Parses a single line from a .log file.
 * Format: OBJECT\tSEQ\tSTATUS\tMESSAGE...
 * Columns are tab-separated.
 */
function parseLogLine(
  line: string,
  objectName: string,
  lineNo: number,
): ParsedLogEntry | null {
  const fields = line.split('\t');
  if (fields.length < 4) return null;
  return {
    object:  objectName,
    status:  'INFO',
    message: fields.slice(3).join(' '),
    seq:     lineNo,
  };
}

/**
 * Returns the correct parser based on filename extension.
 */
export function getParser(filename: string) {
  return filename.toLowerCase().endsWith('.err') ? parseErrLine : parseLogLine;
}

/**
 * Deduplication key for .err records.
 * Returns null for records that should not be deduplicated.
 */
export function errDedupKey(entry: ParsedLogEntry): string | null {
  if (!entry.oldKey || !entry.errorId || !entry.errorNumber) return null;
  return `${entry.oldKey}|${entry.errorId}|${entry.errorNumber}`;
}
