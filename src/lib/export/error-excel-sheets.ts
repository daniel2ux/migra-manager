import type { ErrorEmailRow } from "@/components/email/email-compose-dialog";

const thin = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
const border = { top: thin, bottom: thin, left: thin, right: thin };

const SUMMARY_HEADERS = ["Migrador", "Data Migr.", "HrExecMig", "Empresa", "Obj.Migr.", "Erro ID", "Cód. Erro", "Ocorrências", "Mensagem"];
const SUMMARY_COL_WIDTHS = [18, 12, 11, 22, 14, 18, 12, 14, 60];

/** Colunas dos registros individuais de log importado. */
export const ERROR_ITEM_HEADERS = [
  "Migrador",
  "Data Migr.",
  "HrExecMig",
  "Empresa",
  "Obj.Migr.",
  "Seq",
  "INFOKEY",
  "Status",
  "Erro ID",
  "Cód. Erro",
  "Mensagem",
  "Arquivo",
  "Importado em",
];
const ITEM_COL_WIDTHS = [16, 11, 10, 18, 12, 8, 18, 10, 14, 11, 48, 22, 18];

export interface ErrorItemRow {
  migrador: string;
  dataMigr: string;
  hrExecMig: string;
  empresa: string;
  objeto: string;
  seq: string | number;
  infoKey: string;
  status: string;
  errorId: string;
  errorNumber: string;
  message: string;
  filename: string;
  importedAt: string;
}

export function errorTypeKeyFromParts(errorNumber?: string | null, errorId?: string | null): string {
  const n = String(errorNumber || "").trim();
  const id = String(errorId || "").trim();
  if (n && n !== "–") return n;
  if (id && id !== "–") return id;
  return "–";
}

export function formatImportedAtField(value: unknown): string {
  if (value == null || value === "") return "—";
  try {
    const v = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof v.toDate === "function") {
      const d = v.toDate();
      return formatPtBrDateTime(d);
    }
    const sec = v.seconds ?? v._seconds;
    if (typeof sec === "number" && Number.isFinite(sec)) {
      return formatPtBrDateTime(new Date(sec * 1000));
    }
    const d = new Date(value as string);
    if (!Number.isNaN(d.getTime())) return formatPtBrDateTime(d);
  } catch {
    /* fallthrough */
  }
  return String(value);
}

function formatPtBrDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function sanitizeExcelSheetName(raw: string): string {
  const INVALID = new Set<string>(["\\", "/", ":", "*", "?", "[", "]"]);
  let s = String(raw)
    .split("")
    .map((c) => (INVALID.has(c) ? "-" : c))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) s = "Erro";
  if (s.length > 31) s = s.slice(0, 31);
  return s;
}

/** Garante nomes de aba únicos (limite 31 caracteres do Excel). */
function uniqueSheetNames(baseNames: string[]): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (const b of baseNames) {
    let name = sanitizeExcelSheetName(b);
    if (!used.has(name)) {
      used.add(name);
      out.push(name);
      continue;
    }
    for (let i = 2; i < 99; i++) {
      const suffix = ` ${i}`;
      const truncated = name.length + suffix.length > 31 ? name.slice(0, 31 - suffix.length) + suffix : name + suffix;
      const candidate = sanitizeExcelSheetName(truncated);
      if (!used.has(candidate)) {
        used.add(candidate);
        out.push(candidate);
        break;
      }
    }
  }
  return out;
}

function applyHeaderStyle(cell: { font?: object; fill?: object; border?: object; alignment?: object }): void {
  cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF1E293B" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  cell.border = border;
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
}

function applySummaryDataStyle(cell: { font?: object; fill?: object; border?: object; alignment?: object; numFmt?: string }, colIdx: number, even: boolean): void {
  cell.font = { size: 10, name: "Calibri" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: even ? "FFF8FAFC" : "FFFFFFFF" } };
  cell.border = border;
  cell.alignment = { horizontal: colIdx === 7 ? "right" : "left", vertical: "middle" };
  if (colIdx === 7) cell.numFmt = "#,##0";
}

function applyItemDataStyle(
  cell: { font?: object; fill?: object; border?: object; alignment?: object },
  colIdx: number,
  even: boolean,
): void {
  cell.font = { size: 10, name: "Calibri" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: even ? "FFF8FAFC" : "FFFFFFFF" } };
  cell.border = border;
  const right = colIdx === 5;
  cell.alignment = { horizontal: right ? "right" : "left", vertical: "top", wrapText: colIdx === 10 };
}

function addSummarySheet(wb: { addWorksheet: (name: string) => any }, summaries: ErrorEmailRow[]): void {
  const ws = wb.addWorksheet("Resumo");
  ws.columns = SUMMARY_COL_WIDTHS.map((w) => ({ width: w }));
  const hRow = ws.addRow(SUMMARY_HEADERS);
  hRow.height = 20;
  hRow.eachCell((cell: Parameters<typeof applyHeaderStyle>[0]) => applyHeaderStyle(cell));
  summaries.forEach((s, i) => {
    const row = ws.addRow([
      s.migrador,
      s.dataMigr,
      s.hrExecMig,
      s.empresa,
      s.objeto,
      s.errorId,
      s.errorNumber,
      s.count,
      s.message,
    ]);
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell: Parameters<typeof applySummaryDataStyle>[0], colNumber: number) => {
      applySummaryDataStyle(cell, colNumber - 1, i % 2 === 0);
    });
  });
}

function addItemSheet(wb: { addWorksheet: (name: string) => any }, sheetTitle: string, items: ErrorItemRow[]): void {
  const ws = wb.addWorksheet(sheetTitle);
  ws.columns = ITEM_COL_WIDTHS.map((w) => ({ width: w }));
  const hRow = ws.addRow(ERROR_ITEM_HEADERS);
  hRow.height = 20;
  hRow.eachCell((cell: Parameters<typeof applyHeaderStyle>[0]) => applyHeaderStyle(cell));
  items.forEach((it, i) => {
    const row = ws.addRow([
      it.migrador,
      it.dataMigr,
      it.hrExecMig,
      it.empresa,
      it.objeto,
      it.seq,
      it.infoKey,
      it.status,
      it.errorId,
      it.errorNumber,
      it.message,
      it.filename,
      it.importedAt,
    ]);
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell: Parameters<typeof applyItemDataStyle>[0], colNumber: number) => {
      applyItemDataStyle(cell, colNumber - 1, i % 2 === 0);
    });
  });
}

export function groupItemRowsByErrorType(items: ErrorItemRow[]): Map<string, ErrorItemRow[]> {
  const map = new Map<string, ErrorItemRow[]>();
  for (const it of items) {
    const key = errorTypeKeyFromParts(it.errorNumber, it.errorId);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => {
      const sa = Number(a.seq);
      const sb = Number(b.seq);
      if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sa - sb;
      return String(a.seq).localeCompare(String(b.seq));
    });
  }
  return map;
}

/**
 * Monta workbook: aba Resumo + abas de itens (uma por tipo de erro se &gt;1 tipo; caso contrário uma aba "Itens").
 */
export function buildMultiSheetErrorWorkbook(
  wb: { addWorksheet: (name: string) => any },
  summaries: ErrorEmailRow[],
  itemRows: ErrorItemRow[],
): void {
  addSummarySheet(wb, summaries);

  if (itemRows.length === 0) return;

  const byType = groupItemRowsByErrorType(itemRows);
  const keys = [...byType.keys()].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

  if (keys.length === 1) {
    addItemSheet(wb, "Itens", byType.get(keys[0])!);
    return;
  }

  const titles = uniqueSheetNames(keys.map((k) => `Erro ${k}`));
  keys.forEach((k, idx) => {
    addItemSheet(wb, titles[idx]!, byType.get(k)!);
  });
}
