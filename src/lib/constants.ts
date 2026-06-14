// ═══════════════════════════════════════════════════════════
// Constantes globais do sistema
// ═══════════════════════════════════════════════════════════

// Operações em lote no banco
export const DB_BATCH_SIZE = 400;
export const DB_IN_QUERY_LIMIT = 30; // limite de cláusula "in"

/** IDs válidos para `where(campo, 'in', ids)` — exige array não vazio (máx. 30). */
export function idsForDbIn(
  ids: readonly string[] | undefined | null,
  max = DB_IN_QUERY_LIMIT,
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

// Superadmin configuration (UUID do auth.users — ver scripts/seed-master-user.mjs)
export const SUPERADMIN_UID =
  process.env.NEXT_PUBLIC_SUPERADMIN_UID ??
  process.env.SUPERADMIN_UID ??
  '';

// LocalStorage keys
export const STORAGE_KEYS = {
  DASHBOARD_PROJECT: 'dashboard_last_project_id',
  DASHBOARD_MOCK: 'dashboard_last_mock_id',
  DASHBOARD_SHOW_PERFORMANCE: 'dashboard_show_performance',
  DASHBOARD_SHOW_INDICATORS: 'dashboard_show_indicators',
  DASHBOARD_SHOW_COMPARISON: 'dashboard_show_comparison',
  MOCKS_SHOW_INACTIVE: 'mocks_show_inactive',
  RELATORIO_COMPARATIVO_PROJECT: 'relatorio-comparativo-project',
  RELATORIO_COMPARATIVO_MOCK_A: 'relatorio-comparativo-mock-a',
  RELATORIO_COMPARATIVO_MOCK_B: 'relatorio-comparativo-mock-b',
} as const;

// SessionStorage keys (por aba — não vazam entre abas)
export const SESSION_KEYS = {
  ACTIVE_PROJECT: 'migra_last_selected_project',
  SEL_PROJECT: 'migra_sel_project',
  SEL_MOCK: 'migra_sel_mock',
  DASHBOARD_MOCK: 'migra_dashboard_mock_id',
  REPORT_MOCK: 'migra_report_mock_id',
  LOGS_PAGE: 'migra_logs_page',
  LOGIN_FLASH: 'migra_login_flash',
  MOCK_OPEN_ADD: 'migra_mock_open_add',
} as const;
