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

// UI delays
export const FOCUS_RETURN_DELAY = 150;

// File upload limits
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_FILE_SIZE_MB = 2;

// Superadmin configuration
export const SUPERADMIN_UID = '9sTbj0ERgMMVfaqDEZGluQ75EmG2';

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
