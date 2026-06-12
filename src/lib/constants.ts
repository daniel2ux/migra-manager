// ═══════════════════════════════════════════════════════════
// Constantes globais do sistema
// ═══════════════════════════════════════════════════════════

// Firebase batch operations
export const FIRESTORE_BATCH_SIZE = 400;
export const FIRESTORE_BATCH_SAFE_LIMIT = 30; // "in" query limit

/** IDs válidos para `where(campo, 'in', ids)` — Firestore exige array não vazio (máx. 30). */
export function idsForFirestoreIn(
  ids: readonly string[] | undefined | null,
  max = FIRESTORE_BATCH_SAFE_LIMIT,
): string[] | null {
  if (!ids?.length) return null;
  const sliced = [...ids].slice(0, max);
  return sliced.length > 0 ? sliced : null;
}

// Excel export configuration
export const EXCEL_EXPORT_CHUNK_SIZE = 500;

// UI delays
export const DEBOUNCE_DELAY = 200;
export const FOCUS_RETURN_DELAY = 150;
export const ZIP_DOWNLOAD_DELAY = 1200;
export const LOCK_KEEPALIVE_INTERVAL = 300_000; // 5 minutes in ms
export const DIALOG_CLOSE_FOCUS_DELAY = 100;

// File upload limits
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_FILE_SIZE_MB = 2;

// Superadmin configuration
export const SUPERADMIN_UID = '9sTbj0ERgMMVfaqDEZGluQ75EmG2';

// Status colors (Tailwind equivalents)
export const STATUS_COLORS = {
  running: '#f97316',   // orange-500
  done: '#10b981',      // emerald-500
  locked: '#f59e0b',    // amber-500
  pending: '#94a3b8',   // slate-400
} as const;

// Mock status constants
export const MOCK_STATUS = {
  PENDENTE: 'PENDENTE',
  CARGA_EM_ANDAMENTO: 'CARGA_EM_ANDAMENTO',
  CARGA_CONCLUIDA: 'CARGA_CONCLUIDA',
  FINALIZADA: 'FINALIZADA',
  BLOQUEADO: 'BLOQUEADO',
} as const;

// LocalStorage keys
export const STORAGE_KEYS = {
  DASHBOARD_PROJECT: 'dashboard_last_project_id',
  DASHBOARD_MOCK: 'dashboard_last_mock_id',
  DASHBOARD_SHOW_PERFORMANCE: 'dashboard_show_performance',
  DASHBOARD_SHOW_INDICATORS: 'dashboard_show_indicators',
  DASHBOARD_SHOW_COMPARISON: 'dashboard_show_comparison',
  RELATORIO_COMPARATIVO_PROJECT: 'relatorio-comparativo-project',
  RELATORIO_COMPARATIVO_MOCK_A: 'relatorio-comparativo-mock-a',
  RELATORIO_COMPARATIVO_MOCK_B: 'relatorio-comparativo-mock-b',
} as const;

// Duration constants
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MIN_VISIBLE_DURATION_MS = 60_000; // 1 minute minimum

// Log processing
export const LOG_PROGRESS_EVERY_LINES = 500;
