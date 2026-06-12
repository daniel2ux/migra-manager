import type { MasterObject } from "@/types/master-object";
import { compareSequences } from "./sequence-utils";

export function getPrecedenceChain(
    obj: MasterObject,
    allObjects: MasterObject[]
): { chain: MasterObject[]; isCircular: boolean } {
    const chain: MasterObject[] = [];
    const visited = new Set<string>();
    const path = new Set<string>();
    let isCircular = false;

    const traverse = (currentId: string) => {
        if (path.has(currentId)) {
            isCircular = true;
            return;
        }
        if (visited.has(currentId)) return;

        visited.add(currentId);
        path.add(currentId);

        const current = allObjects.find((o) => o.id === currentId);
        if (current?.dependencyIds?.length) {
            current.dependencyIds.forEach((depId) => traverse(depId));
            allObjects
                .filter((o) => current.dependencyIds!.includes(o.id))
                .forEach((dep) => {
                    if (!chain.some((c) => c.id === dep.id)) chain.push(dep);
                });
        }

        path.delete(currentId);
    };

    traverse(obj.id);

    chain.sort((a, b) => {
        const cmp = compareSequences(a.chargeOrder, b.chargeOrder, a.chargeGroup, b.chargeGroup);
        return cmp !== 0 ? cmp : compareSequences(a.parallelOrder ?? "", b.parallelOrder ?? "");
    });

    return { chain, isCircular };
}

/**
 * Pre-computes a Map<id, chain> for all objects — call once when objects change.
 */
export function buildPrecedenceMap(
    allObjects: MasterObject[]
): Map<string, { chain: MasterObject[]; isCircular: boolean }> {
    const map = new Map<string, { chain: MasterObject[]; isCircular: boolean }>();
    for (const obj of allObjects) {
        map.set(obj.id, getPrecedenceChain(obj, allObjects));
    }
    return map;
}
