// ═══════════════════════════════════════════════════════════
// Utilitários para cálculo de métricas de Mock
// ═══════════════════════════════════════════════════════════

import { differenceInMilliseconds } from 'date-fns';
import type { Mock, MigrationObject } from '@/types/migration';

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
 * Verifica se a mock está bloqueada (por flag ou status)
 */
export function isMockLocked(mock: Mock): boolean {
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
