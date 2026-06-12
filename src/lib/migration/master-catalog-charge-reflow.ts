import type { MasterObject } from "@/types/master-object";
import { compareSequences, formatSequence } from "@/lib/migration/sequence-utils";

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
