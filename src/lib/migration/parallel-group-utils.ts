import {
  compareObjectNames,
  formatSequence,
  isValidSequence,
  parseSequence,
} from "@/lib/migration/sequence-utils";

interface ParallelCatalogRow {
  id: string;
  name: string;
  parallelOrder?: string | number | null;
}

function getParallelGroupMemberIds(
  objects: readonly ParallelCatalogRow[],
  objectId: string,
  excludeId?: string,
): string[] {
  const obj = objects.find((o) => o.id === objectId);
  if (!obj?.parallelOrder || !isValidSequence(obj.parallelOrder)) return [];
  const major = parseSequence(obj.parallelOrder).major;
  if (major <= 0) return [];
  return objects
    .filter(
      (o) =>
        o.id !== objectId &&
        o.id !== excludeId &&
        o.parallelOrder &&
        isValidSequence(o.parallelOrder) &&
        parseSequence(o.parallelOrder).major === major,
    )
    .map((o) => o.id);
}

/** Inclui colegas do mesmo grupo paralelo já configurados no catálogo. */
export function expandParallelPeerIds(
  objects: readonly ParallelCatalogRow[],
  peerIds: string[],
  excludeId?: string,
): string[] {
  const expanded = new Set<string>();
  for (const id of peerIds) {
    if (!id || id === excludeId) continue;
    expanded.add(id);
    for (const mateId of getParallelGroupMemberIds(objects, id, excludeId)) {
      expanded.add(mateId);
    }
  }
  return [...expanded];
}

function resolveParallelMajorForPeers(
  objects: readonly ParallelCatalogRow[],
  peerIds: string[],
): number {
  for (const id of peerIds) {
    const obj = objects.find((o) => o.id === id);
    if (!obj?.parallelOrder || !isValidSequence(obj.parallelOrder)) continue;
    const major = parseSequence(obj.parallelOrder).major;
    if (major > 0) return major;
  }
  const withParallel = objects.filter((o) => o.parallelOrder && isValidSequence(o.parallelOrder));
  const maxMajor = withParallel.reduce(
    (max, o) => Math.max(max, parseSequence(o.parallelOrder).major),
    0,
  );
  return maxMajor + 1;
}

interface ParallelGroupPlan {
  parallelMajor: number;
  memberIds: string[];
  removedFromGroupIds: string[];
}

/** Plano simétrico: âncora + pares expandidos compartilham o mesmo grupo paralelo. */
export function buildParallelGroupPlan(
  objects: readonly ParallelCatalogRow[],
  anchorId: string,
  peerIds: string[],
): ParallelGroupPlan | null {
  const expandedPeers = expandParallelPeerIds(objects, peerIds, anchorId);
  if (expandedPeers.length === 0) return null;

  const parallelMajor = resolveParallelMajorForPeers(objects, expandedPeers);
  const sortedPeers = expandedPeers
    .map((id) => objects.find((o) => o.id === id))
    .filter((o): o is ParallelCatalogRow => Boolean(o))
    .sort(compareObjectNames)
    .map((o) => o.id);

  const memberIds = [anchorId, ...sortedPeers];
  const memberSet = new Set(memberIds);
  const removedFromGroupIds = objects
    .filter(
      (o) =>
        o.id !== anchorId &&
        o.parallelOrder &&
        isValidSequence(o.parallelOrder) &&
        parseSequence(o.parallelOrder).major === parallelMajor &&
        !memberSet.has(o.id),
    )
    .map((o) => o.id);

  return { parallelMajor, memberIds, removedFromGroupIds };
}

export function parallelOrderForGroupIndex(parallelMajor: number, index: number): string {
  return formatSequence(parallelMajor, index);
}
