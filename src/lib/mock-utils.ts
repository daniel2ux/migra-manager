// ═══════════════════════════════════════════════════════════
// Utilitários para cálculo de métricas de Mock
// ═══════════════════════════════════════════════════════════

import { differenceInMilliseconds } from 'date-fns';
import type { Mock, MigrationObject } from '@/types/migration';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function asUuidOrNull(value: unknown): string | null {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

export function sanitizeUuidList(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === 'string' && UUID_RE.test(id));
}

export function remapDependencyIds(
  ids: string[],
  idMap: ReadonlyMap<string, string>,
): string[] {
  return ids
    .map((id) => idMap.get(id) ?? null)
    .filter((id): id is string => id !== null);
}

/**
 * Calcula a duração total de uma mock com fallbacks em cascata.
 * Prioriza soma das durações individuais dos objetos (mais preciso).
 */
export function calculateMockTotalDuration(
  mock: Mock,
  objects?: MigrationObject[]
): number {
  // 1. Soma das durações por objeto da mock (regra de negócio).
  // Prioriza intervalo start/end do próprio objeto; usa currentChargeDurationMs só como fallback.
  if (objects && objects.length > 0) {
    return objects.reduce((sum, obj) => {
      let durationMs = 0;

      if (obj.chargeStartTime && obj.chargeEndTime) {
        const start = new Date(obj.chargeStartTime).getTime();
        const end = new Date(obj.chargeEndTime).getTime();
        if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
          durationMs = end - start;
        }
      }

      if (durationMs <= 0) {
        durationMs = Number(obj.currentChargeDurationMs) || 0;
      }

      return sum + (durationMs > 0 ? durationMs : 0);
    }, 0);
  }

  // 2. Fallback: loadHistory
  const lastHistory = mock.loadHistory?.[mock.loadHistory.length - 1];
  if (lastHistory) {
    return lastHistory.durationMs || 0;
  }

  // 3. Fallback: data_inicio_carga / data_fim_carga
  if (mock.data_inicio_carga && mock.data_fim_carga) {
    return differenceInMilliseconds(new Date(mock.data_fim_carga), new Date(mock.data_inicio_carga));
  }

  return 0;
}

/**
 * Mock ativa (padrão true quando o campo não existe em registros legados).
 */
export function isMockActive(mock: { isActive?: boolean }): boolean {
  return mock.isActive !== false;
}

export function isMockInactive(mock: { isActive?: boolean }): boolean {
  return mock.isActive === false;
}

export function filterActiveMocks<T extends { isActive?: boolean }>(
  mocks: T[] | null | undefined,
): T[] {
  return (mocks ?? []).filter(isMockActive);
}

/**
 * Verifica se a mock está bloqueada (por flag ou status)
 */
export function isMockLocked(mock: Mock): boolean {
  if (isMockInactive(mock)) return true;
  return (mock.isLocked ?? false) || mock.status === 'BLOQUEADO';
}

/**
 * Verifica se a carga da mock está em andamento
 */
export function isMockCargaInProgress(mock: Mock): boolean {
  return mock.status === 'CARGA_EM_ANDAMENTO' || mock.isRunning === true;
}

/**
 * Verifica se a mock foi concluída
 */
export function isMockConcluida(mock: Mock): boolean {
  return mock.status === 'CARGA_CONCLUIDA' || mock.status === 'FINALIZADA';
}

/**
 * Verifica se o lock efetivo está ativo (mock OU projeto)
 */
export function isEffectiveLocked(mock: Mock, projectIsLocked: boolean): boolean {
  return isMockLocked(mock) || projectIsLocked;
}

/**
 * Extrai número da sequência de nome (ex: "MOCK-10" -> 10)
 */
export function extractMockSequence(name: string): number {
  const match = name.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Prefixo antes do sufixo numérico (ex: "MOCK-01" → "MOCK"). */
export function extractMockPrefix(name: string): string {
  const parts = name.split("-");
  return parts.length > 1 ? parts.slice(0, -1).join("-") : name;
}

/**
 * Sugere a próxima parte numérica para um prefixo, com base nas mocks existentes.
 * Ex.: MOCK-01 e MOCK-02 existentes → "03".
 */
export function suggestNextMockSequence(
  prefix: string,
  mocks: Array<Pick<Mock, "name"> & { isActive?: boolean }> | null | undefined,
): string {
  const baseUpper = prefix.trim().toUpperCase();
  if (!baseUpper) return "01";

  const maxSeq = filterActiveMocks(mocks).reduce((max, mock) => {
    const mockBase = extractMockPrefix(mock.name);
    if (mockBase.toUpperCase() !== baseUpper) return max;
    return Math.max(max, extractMockSequence(mock.name));
  }, 0);

  return String(maxSeq + 1).padStart(2, "0");
}

/**
 * Próxima sequência ao clonar uma mock (mesmo prefixo da origem).
 */
export function suggestNextMockSequenceFromSource(
  sourceMock: Pick<Mock, "name"> & { isActive?: boolean },
  mocks: Array<Pick<Mock, "name"> & { isActive?: boolean }> | null | undefined,
): string {
  return suggestNextMockSequence(extractMockPrefix(sourceMock.name), mocks);
}

/** Campos permitidos ao clonar documento de mock (evita __path, uid, etc.). */
export function buildClonedMockRecord(
  source: Mock,
  params: {
    id: string;
    projectId: string;
    name: string;
    slug: string;
    explanatoryText: string;
  },
): Record<string, unknown> {
  return {
    id: params.id,
    projectId: params.projectId,
    name: params.name,
    slug: params.slug,
    explanatoryText: params.explanatoryText,
    startDate: source.startDate ?? "",
    endDate: source.endDate ?? "",
    isLocked: false,
    isLoaded: false,
    lockedByMaster: false,
    lockedByUid: null,
    lockedByName: null,
    isRunning: false,
    isActive: true,
    quantityExistingObjects: source.quantityExistingObjects ?? 0,
    status: "PENDENTE",
    data_inicio_carga: null,
    data_fim_carga: null,
    loadHistory: [],
  };
}

/** Campos permitidos ao clonar migration object (reset de carga). */
export function buildClonedMigrationObjectRecord(
  source: MigrationObject & Record<string, unknown>,
  params: {
    id: string;
    mockId: string;
    projectId: string;
    ownerId?: string | null;
    dependencyIds?: string[];
  },
): Record<string, unknown> {
  const previousTarget = Number(source.targetRecordsCount) || 0;
  const previousDuration = Number(source.currentChargeDurationMs) || 0;

  return {
    id: params.id,
    mockId: params.mockId,
    projectId: params.projectId,
    masterObjectId: asUuidOrNull(source.masterObjectId),
    name: String(source.name ?? "").trim() || "OBJETO",
    description: source.description ?? "",
    chargeGroup: source.chargeGroup != null ? String(source.chargeGroup) : "",
    chargeOrder: source.chargeOrder != null ? String(source.chargeOrder) : "",
    parallelOrder: source.parallelOrder != null ? String(source.parallelOrder) : null,
    isParallel: source.isParallel ?? false,
    initialChargeStartTime: source.initialChargeStartTime ?? "",
    initialChargeEndTime: source.initialChargeEndTime ?? "",
    chargeStartTime: "",
    chargeEndTime: "",
    targetRecordsCount: 0,
    processedRecordsCount: 0,
    migratedRecordsCount: 0,
    successfulRecordsCount: 0,
    errorRecordsCount: 0,
    currentChargeDurationMs: 0,
    previousMigratedRecordsCount: previousTarget,
    previousChargeDurationMs: previousDuration,
    dependencyIds: params.dependencyIds ?? sanitizeUuidList(source.dependencyIds),
    ownerId: asUuidOrNull(params.ownerId) ?? asUuidOrNull(source.ownerId),
    status: "PENDENTE",
    hasTechLogs: false,
    loadHistory: [],
  };
}
