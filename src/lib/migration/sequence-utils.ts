/**
 * Utilities for migration object sequences in XX.XX format.
 * Provides parsing, formatting, and comparison functions.
 */

import type { MigrationObject } from "@/types/migration";
import type { MasterObject } from "@/types/master-object";

export interface Sequence {
  major: number;
  minor: number;
}

/**
 * Parses a sequence string or number into major and minor components.
 */
export function parseSequence(seq: string | number | undefined | null): Sequence {
  if (!seq && seq !== 0) return { major: 0, minor: 0 };
  const str = String(seq).trim();
  if (str.includes('.')) {
    const parts = str.split('.');
    return { major: parseInt(parts[0]) || 0, minor: parseInt(parts[1]) || 0 };
  }
  const val = parseInt(str);
  return { major: isNaN(val) ? 0 : val, minor: 0 };
}

/**
 * Formats major and minor components into a 'XX.XX' string.
 */
export function formatSequence(major: number, minor: number = 0): string {
  return `${String(major).padStart(2, '0')}.${String(minor).padStart(2, '0')}`;
}

/**
 * Checks if a string is in the valid 'XX.XX' format.
 */
export function isValidSequence(val: string | number | undefined | null): boolean {
  if (!val && val !== 0) return false;
  const str = String(val).trim();
  return /^\d{2}\.\d{2}$/.test(str);
}

/**
 * Normalizes a sequence for display, returning '—' if empty or zero.
 */
export function normalizeSeqForDisplay(seq: string | number | undefined | null): string {
  if (!seq && seq !== 0) return '—';
  const { major, minor } = parseSequence(seq);
  if (major === 0 && minor === 0) return '—';
  return formatSequence(major, minor);
}

/**
 * Compares two sequences for sorting.
 * Supports optional group comparison as a primary sort key.
 */
export function compareSequences(
  a: string | number | undefined | null,
  b: string | number | undefined | null,
  groupA?: string,
  groupB?: string
): number {
  if (groupA && groupB && groupA.toUpperCase() !== groupB.toUpperCase()) {
    return groupA.toUpperCase().localeCompare(groupB.toUpperCase());
  }
  const pa = parseSequence(a);
  const pb = parseSequence(b);
  if (pa.major !== pb.major) return pa.major - pb.major;
  return pa.minor - pb.minor;
}

/** Campos mínimos para ordenar cards (dashboard / gestão de objetos). */
export interface ChargeSequenceSortFields {
  chargeOrder?: string | number | null;
  chargeGroup?: string | null;
  parallelOrder?: string | number | null;
  name?: string | null;
}

/** Sequência normalizada para exibição em cards e agregações tipadas. */
export interface ResolvedChargeSequence {
  chargeGroup: string;
  chargeOrder: string | number;
  parallelOrder?: string | number;
}

export function normalizeChargeSequenceFields(
  fields: Pick<ChargeSequenceSortFields, "chargeGroup" | "chargeOrder" | "parallelOrder">,
): ResolvedChargeSequence {
  const parallelOrder = fields.parallelOrder ?? undefined;
  return {
    chargeGroup: String(fields.chargeGroup ?? "").trim(),
    chargeOrder: fields.chargeOrder ?? "",
    ...(parallelOrder != null && parallelOrder !== "" ? { parallelOrder } : {}),
  };
}

/**
 * Ordem de grid alinhada à gestão: **SEQ. CARGA** (principal), em empate **GRUPO**,
 * depois ordem paralela e nome. Objetos sem grupo ficam por último entre empates de sequência.
 */
/** Ordem alfabética por nome de objeto (pt-BR, sem diferenciar maiúsculas). */
export function compareObjectNames(
  a: { name?: string | null },
  b: { name?: string | null },
): number {
  return String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-BR", {
    sensitivity: "base",
  });
}

/** Selecionados no topo (ordem de `selectedIds`); demais itens pelo comparador informado. */
export function sortWithSelectedIdsFirst<T>(
  objects: readonly T[],
  selectedIds: readonly string[],
  compareRest: (a: T, b: T) => number,
  getId: (item: T) => string = (item) => (item as { id: string }).id,
): T[] {
  const rank = new Map(selectedIds.map((id, index) => [id, index]));
  return [...objects].sort((a, b) => {
    const aRank = rank.get(getId(a));
    const bRank = rank.get(getId(b));
    const aSelected = aRank !== undefined;
    const bSelected = bRank !== undefined;
    if (aSelected && bSelected) return aRank - bRank;
    if (aSelected !== bSelected) return aSelected ? -1 : 1;
    return compareRest(a, b);
  });
}

export function compareChargeSequenceGridOrder(a: ChargeSequenceSortFields, b: ChargeSequenceSortFields): number {
  const seqCmp = compareSequences(a.chargeOrder ?? "", b.chargeOrder ?? "");
  if (seqCmp !== 0) return seqCmp;
  const ga = String(a.chargeGroup ?? "").trim().toUpperCase();
  const gb = String(b.chargeGroup ?? "").trim().toUpperCase();
  const aEmpty = !ga;
  const bEmpty = !gb;
  if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
  if (ga !== gb) return ga.localeCompare(gb);
  const parCmp = compareSequences(a.parallelOrder ?? "", b.parallelOrder ?? "");
  if (parCmp !== 0) return parCmp;
  return String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base" });
}

/** Ordem de execução na gestão de objetos (objetos com sequência antes dos sem sequência). */
export function compareGestaoExecutionOrder(a: ChargeSequenceSortFields, b: ChargeSequenceSortFields): number {
  const seqA = parseSequence(a.chargeOrder);
  const seqB = parseSequence(b.chargeOrder);
  if (seqA.major > 0 && seqB.major === 0) return -1;
  if (seqA.major === 0 && seqB.major > 0) return 1;
  return compareChargeSequenceGridOrder(a, b);
}

/** Mapa id → sequência (01.00, 02.00, …) pela posição na lista exibida. */
export function buildListPositionChargeOrderMap(
  objects: readonly { id: string }[],
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  objects.forEach((obj, index) => {
    map.set(obj.id, formatSequence(index + 1, 0));
  });
  return map;
}

export function resolveDisplayChargeOrder(
  objectId: string,
  storedChargeOrder: string | number | undefined | null,
  positionMap?: ReadonlyMap<string, string> | null,
): string | number | undefined | null {
  return positionMap?.get(objectId) ?? storedChargeOrder;
}

/** Sequência/grupo exibidos: mock (objeto) tem prioridade; catálogo mestre é fallback. */
export function resolveChargeSequenceDisplay(
  migration: Pick<MigrationObject, "chargeOrder" | "chargeGroup" | "parallelOrder"> | null | undefined,
  master: Pick<MasterObject, "chargeOrder" | "chargeGroup" | "parallelOrder"> | null | undefined,
): ResolvedChargeSequence {
  return normalizeChargeSequenceFields({
    chargeGroup: migration?.chargeGroup ?? master?.chargeGroup ?? "",
    chargeOrder: migration?.chargeOrder ?? master?.chargeOrder ?? "",
    parallelOrder: migration?.parallelOrder ?? master?.parallelOrder,
  });
}

/**
 * Sequência exibida no card do dashboard: catálogo mestre (gestão de objetos) é a fonte de verdade;
 * mock só entra como fallback quando o mestre não tem valor.
 */
export function resolveDashboardCardChargeSequence(
  master: Pick<MasterObject, "chargeOrder" | "chargeGroup" | "parallelOrder"> | null | undefined,
  migration: Pick<MigrationObject, "chargeOrder" | "chargeGroup" | "parallelOrder"> | null | undefined,
): ResolvedChargeSequence {
  return normalizeChargeSequenceFields({
    chargeGroup: master?.chargeGroup ?? migration?.chargeGroup ?? "",
    chargeOrder: master?.chargeOrder ?? migration?.chargeOrder ?? "",
    parallelOrder: master?.parallelOrder ?? migration?.parallelOrder,
  });
}

/** Paralelismo efetivo: flag explícita ou `parallelOrder` válida com major > 0. */
export function isObjectParallelLoad(
  obj: { isParallel?: boolean | null; parallelOrder?: string | number | null },
): boolean {
  if (obj.isParallel) return true;
  return isValidSequence(obj.parallelOrder) && parseSequence(obj.parallelOrder).major > 0;
}

/** Persistência: garante `isParallel` quando há ordem paralela válida. */
export function resolveParallelPersistFlag(
  isParallel: boolean | undefined | null,
  parallelOrder: string | number | undefined | null,
): boolean {
  return isObjectParallelLoad({ isParallel, parallelOrder });
}
