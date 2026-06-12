import type { MasterObject } from "@/types/master-object";
import type { MigrationObject } from "@/types/migration";

/**
 * Sobrepõe sequência de carga/paralelismo da mock sobre o catálogo mestre.
 * Necessário para o grafo de precedência refletir o mesmo paralelismo do dashboard.
 */
export function mergeMigrationSequencesOntoMasters(
  masters: MasterObject[],
  migrations: MigrationObject[] | undefined,
  mockId?: string | null,
): MasterObject[] {
  if (!masters.length || !migrations?.length) return masters;

  const pool =
    mockId && mockId !== "all"
      ? migrations.filter((m) => m.mockId === mockId)
      : migrations;

  if (!pool.length) return masters;

  const byMasterKey = new Map<string, MigrationObject>();
  for (const mig of pool) {
    const keys = [mig.masterObjectId, mig.name].filter(Boolean) as string[];
    for (const key of keys) {
      const existing = byMasterKey.get(key);
      const migHasParallel = Boolean(mig.isParallel || mig.parallelOrder);
      const existingHasParallel = Boolean(existing?.isParallel || existing?.parallelOrder);
      if (!existing || (migHasParallel && !existingHasParallel)) {
        byMasterKey.set(key, mig);
      }
    }
  }

  return masters.map((master) => {
    const mig = byMasterKey.get(master.id) ?? byMasterKey.get(master.name);
    if (!mig) return master;

    return {
      ...master,
      chargeGroup: mig.chargeGroup ?? master.chargeGroup,
      chargeOrder: mig.chargeOrder ?? master.chargeOrder,
      parallelOrder: mig.parallelOrder ?? master.parallelOrder,
      isParallel: mig.isParallel ?? master.isParallel,
      dependencyIds: mig.dependencyIds ?? master.dependencyIds,
    };
  });
}
