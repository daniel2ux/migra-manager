import type { AggregatedObject } from "@/types/migration";

export function getDashboardCardKey(
  obj: Pick<AggregatedObject, "projectId" | "mockId" | "id">,
): string {
  return `${obj.projectId ?? "p"}:${obj.mockId ?? "m"}:${obj.id}`;
}

export function getDashboardCardDomId(cardKey: string): string {
  return `dashboard-card-${cardKey}`;
}
