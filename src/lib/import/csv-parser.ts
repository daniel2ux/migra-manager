/**
 * Utilitários para parsing de CSV/TSV usados na importação de objetos
 */

export interface CsvColumnMap {
  name: number;
  start: number;
  end: number;
  target: number;
  error: number;
  success: number;
  processed: number;
  comment: number;
  status: number;
}

const COLUMN_SYNONYMS = {
  name: ['OBJETO', 'OBJECT', 'NOME', 'NAME', 'OBJ', 'ZROUTE'],
  start: ['DATA_INICIO', 'INICIO', 'START', 'DE', 'FROM', 'HORA_INICIO'],
  end: ['DATA_FIM', 'FIM', 'END', 'ATE', 'TO', 'HORA_FIM'],
  target: ['TARGET', 'TOTAL', 'VOLUME', 'CONTATOS', 'PLAN', 'PREVISTO'],
  processed: ['PROCESSADO', 'PROCESSED', 'CARREGADO', 'MIGRADO', 'DONE', 'EXECUTADO'],
  error: ['ERRO', 'ERROS', 'ERROR', 'ERRORS', 'FAIL', 'FALHA'],
  success: ['SUCESSO', 'SUCCESS', 'OK'],
  comment: ['COMENTARIO', 'COMMENT', 'LOG', 'MESSAGE', 'MSG', 'TEXTO', 'LOG_TECNICO', 'TECNICO'],
  status: ['STATUS', 'TYPE', 'NIVEL', 'LEVEL', 'SITUACAO'],
} as const;

/**
 * Detecta o separador de uma linha CSV
 */
export function detectSeparator(line: string): string {
  if (line.includes('\t')) return '\t';
  const semicolonCount = (line.match(/;/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  return semicolonCount >= commaCount ? ';' : ',';
}

/**
 * Analisa a primeira linha e retorna o mapeamento de colunas
 */
export function parseCsvHeader(firstLine: string): { colMap: CsvColumnMap; isHeader: boolean; dataLines: boolean } {
  const sep = detectSeparator(firstLine);
  const cols = firstLine.split(sep).map(c => c.trim().toUpperCase());

  const colMap: CsvColumnMap = {
    name: 0, start: 1, end: 2, target: 3,
    error: 4, success: 5, processed: -1, comment: -1, status: -1,
  };

  const isHeader = COLUMN_SYNONYMS.name.some(h => cols[0]?.includes(h)) ||
    cols.some(c => COLUMN_SYNONYMS.comment.some(h => c.includes(h)));

  if (isHeader) {
    cols.forEach((col, idx) => {
      for (const [key, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
        if (synonyms.some(s => col === s || col.includes(s))) {
          (colMap as any)[key] = idx;
        }
      }
    });
  }

  return { colMap, isHeader, dataLines: !isHeader };
}

/**
 * Parse de uma linha de dados CSV usando o columnMap
 */
export function parseCsvLine(line: string, colMap: CsvColumnMap): {
  objectName: string;
  startRaw: string;
  endRaw: string;
  targetCount: number;
  errorCount: number;
  processedCount: number;
  successCount: number;
  comment: string;
  logStatus: string;
  hasMetrics: boolean;
} {
  const sep = detectSeparator(line);
  const cols = line.split(sep).map(c => c.trim());

  const objectName = cols[colMap.name]?.toUpperCase() || '';
  const startRaw = colMap.start !== -1 ? cols[colMap.start] : '';
  const endRaw = colMap.end !== -1 ? cols[colMap.end] : '';
  const targetCount = colMap.target !== -1 ? _parseNum(cols[colMap.target]) : 0;
  const errorCount = colMap.error !== -1 ? _parseNum(cols[colMap.error]) : 0;
  const processedCount = colMap.processed !== -1 ? _parseNum(cols[colMap.processed]) : targetCount;
  const successCount = colMap.success !== -1 ? _parseNum(cols[colMap.success]) : Math.max(0, processedCount - errorCount);
  const comment = colMap.comment !== -1 ? cols[colMap.comment] || '' : '';
  const logStatus = colMap.status !== -1 ? (cols[colMap.status]?.toLowerCase() || 'aberta') : 'aberta';

  const hasMetrics = colMap.start !== -1 || colMap.target !== -1 || colMap.processed !== -1;
  const validStatus = ['aberta', 'andamento', 'resolvida', 'bloqueada'].includes(logStatus) ? logStatus : 'aberta';

  return { objectName, startRaw, endRaw, targetCount, errorCount, processedCount, successCount, comment, logStatus: validStatus, hasMetrics };
}

function _parseNum(val: string): number {
  return parseInt(val.replace(/\D/g, ''), 10) || 0;
}
