import type { AggregatedObject } from '@/types/migration';
import type { ErrorEmailRow } from '@/components/email/email-compose-dialog';
import { buildMultiSheetErrorWorkbook, type ErrorItemRow } from '@/lib/export/error-excel-sheets';
import { formatStatDate, formatStatTime, formatStatDuration } from './stat-formatters';

// ── Excel constants ───────────────────────────────────────────────────────

const HEADERS = ['Migrador', 'Data Migr.', 'HrExecMig', 'Empresa', 'Obj.Migr.', 'Curso', 'Ok', 'Erro', 'Processados', '% Ok', '% Erro', 'Modificado', 'Hora mod.', 'Temp.Trab.'];
const COL_WIDTHS = [20, 12, 11, 20, 20, 10, 14, 14, 14, 8, 8, 12, 11, 12];
const NUM_COLS = new Set([6, 7, 8]);
const PCT_COLS = new Set([9, 10]);
const CTR_COLS = new Set([1, 2, 5, 11, 12, 13]);
const thin = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
const border = { top: thin, bottom: thin, left: thin, right: thin };

// ── Style helpers ─────────────────────────────────────────────────────────

function applyHeaderStyle(cell: any): void {
  cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF1E293B' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  cell.border = border;
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
}

function applyDataStyle(cell: any, colIdx: number): void {
  cell.font = { size: 10, name: 'Calibri' };
  cell.border = border;
  cell.alignment = {
    horizontal: NUM_COLS.has(colIdx) || PCT_COLS.has(colIdx) ? 'right' : CTR_COLS.has(colIdx) ? 'center' : 'left',
    vertical: 'middle',
  };
  if (NUM_COLS.has(colIdx)) cell.numFmt = '#,##0';
  if (PCT_COLS.has(colIdx)) cell.numFmt = '0.00';
}

// ── Row builders ──────────────────────────────────────────────────────────

export function buildDataRow(obj: AggregatedObject, migradorName: string, getEmpresa: (obj: AggregatedObject) => string): (string | number)[] {
  const total = obj.processedRecordsCount || 0;
  const erro = obj.errorRecordsCount || 0;
  const ok = total - erro;
  return [
    migradorName || '',
    formatStatDate(obj.chargeStartTime || undefined),
    formatStatTime(obj.chargeStartTime || undefined),
    getEmpresa(obj),
    obj.name,
    obj.isInProgress ? 'SIM' : 'NÃO',
    ok,
    erro > 0 ? erro : '-',
    total,
    total > 0 ? Number(((ok / total) * 100).toFixed(2)) : '',
    total > 0 ? Number(((erro / total) * 100).toFixed(2)) : '',
    formatStatDate(obj.chargeEndTime || undefined),
    formatStatTime(obj.chargeEndTime || undefined),
    formatStatDuration(obj.currentChargeDurationMs),
  ];
}

export function buildSheet(wb: any, sheetName: string, dataRows: (string | number)[][]): void {
  const ws = wb.addWorksheet(sheetName);
  ws.columns = COL_WIDTHS.map(w => ({ width: w }));
  const hRow = ws.addRow(HEADERS);
  hRow.height = 20;
  hRow.eachCell((cell: any) => applyHeaderStyle(cell));
  dataRows.forEach(rowData => {
    const row = ws.addRow(rowData);
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => applyDataStyle(cell, colNumber - 1));
  });
}

export function buildErrorSheet(wb: any, errorSummaries: ErrorEmailRow[], itemRows: ErrorItemRow[] = []): void {
  if (errorSummaries.length === 0 && itemRows.length === 0) return;
  buildMultiSheetErrorWorkbook(wb, errorSummaries, itemRows);
}

export async function downloadExcel(wb: any, fileName: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
