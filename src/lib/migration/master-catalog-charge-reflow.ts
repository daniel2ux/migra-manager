import type { MasterObject } from "@/types/master-object";
import {
  compareGestaoExecutionOrder,
  compareSequences,
  formatSequence,
  isValidSequence,
  parseSequence,
} from "@/lib/migration/sequence-utils";

export type MasterCatalogChargeReflowRow = {
  id: string;
  data: { chargeOrder: string; chargeGroup: string };
};

/**
 * Recalcula `chargeOrder` (01.00, 02.00, …) dentro de um grupo de carga:
 * mantém a ordem relativa atual (seq. + paralelismo + nome) e coloca todos
 * com `status === 'INATIVO'` ao final do grupo.
 */
export function computeMasterCatalogGroupReflowUpdates(
  allObjects: MasterObject[],
  groupUpper: string,
  opts: { excludeId?: string; patched?: MasterObject },
): MasterCatalogChargeReflowRow[] {
  const g = (groupUpper || "G").toUpperCase();
  let members = allObjects.filter((o) => (o.chargeGroup || "").toUpperCase() === g);
  if (opts.excludeId) {
    members = members.filter((o) => o.id !== opts.excludeId);
  }
  if (opts.patched && (opts.patched.chargeGroup || "").toUpperCase() === g) {
    members = members.filter((o) => o.id !== opts.patched!.id);
    members.push(opts.patched);
  }

  const cmp = (a: MasterObject, b: MasterObject) => {
    const c1 = compareSequences(a.chargeOrder, b.chargeOrder, a.chargeGroup, b.chargeGroup);
    if (c1 !== 0) return c1;
    const c2 = compareSequences(a.parallelOrder, b.parallelOrder);
    if (c2 !== 0) return c2;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  };

  const sorted = [...members].sort(cmp);
  const active = sorted.filter((o) => o.status !== "INATIVO");
  const inactive = sorted.filter((o) => o.status === "INATIVO");
  const finalOrder = [...active, ...inactive];

  return finalOrder.map((o, i) => ({
    id: o.id,
    data: { chargeOrder: formatSequence(i + 1, 0), chargeGroup: g },
  }));
}

/** Próxima sequência de carga sugerida para cadastro/edição no catálogo mestre. */
export function computeSuggestedNextChargeOrder(
  allObjects: MasterObject[],
  currentGroup?: string | null,
): { nextSeq: string; scopeLabel: string } {
  const groupUpper = (currentGroup?.trim() || "G").toUpperCase();
  const inGroup = allObjects.filter(
    (o) => (o.chargeGroup || "G").toUpperCase() === groupUpper,
  );
  const targetList = inGroup.length > 0 ? inGroup : allObjects;
  const activeOnly = targetList.filter((o) => o.status !== "INATIVO");
  const basis = activeOnly.length > 0 ? activeOnly : targetList;
  const sorted = [...basis].sort(compareGestaoExecutionOrder);

  let maxMajor = sorted.reduce((max, obj) => {
    const major = parseSequence(obj.chargeOrder).major;
    if (major > 0 || (obj.chargeOrder != null && obj.chargeOrder !== "" && isValidSequence(obj.chargeOrder))) {
      return Math.max(max, major);
    }
    return max;
  }, 0);

  if (maxMajor === 0 && sorted.length > 0) {
    maxMajor = sorted.length;
  }

  const nextSeq = formatSequence(maxMajor + 1, 0);
  const scopeLabel =
    inGroup.length > 0 ? `GRUPO: ${groupUpper}` : "GLOBAL";
  return { nextSeq, scopeLabel };
}

/** Próxima sequência pela posição do último card na ordem de execução do catálogo (+1). */
export function computeNextChargeOrderAfterLastCard(
  allObjects: MasterObject[],
): string {
  const active = allObjects.filter((o) => o.status !== "INATIVO");
  const basis = active.length > 0 ? active : allObjects;
  const sorted = [...basis].sort(compareGestaoExecutionOrder);
  return formatSequence(sorted.length + 1, 0);
}

/** Grupo de carga do último card ativo na ordem de execução (padrão G). */
export function computeChargeGroupFromLastCard(allObjects: MasterObject[]): string {
  const active = allObjects.filter((o) => o.status !== "INATIVO");
  const basis = active.length > 0 ? active : allObjects;
  if (!basis.length) return "G";
  const sorted = [...basis].sort(compareGestaoExecutionOrder);
  const last = sorted[sorted.length - 1];
  return (last.chargeGroup || "G").trim().toUpperCase() || "G";
}
