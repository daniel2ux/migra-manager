export const CARD_TOOLBAR_BTN =
  "fiori-card-toolbar-btn !rounded-[0.25rem] !size-[1.375rem] min-h-0 min-w-0";

/** Próxima ordem de exibição disponível (maior ordem existente + 1). */
export function nextAvailableDisplayOrder(groups: { displayOrder?: number }[]): number {
  if (groups.length === 0) return 1;
  const maxOrder = groups.reduce((max, g) => Math.max(max, g.displayOrder ?? 0), 0);
  return maxOrder + 1;
}

export function sortChargeGroupsByDisplayOrder<
  T extends { displayOrder?: number; name: string },
>(groups: T[]): T[] {
  return [...groups].sort(
    (a, b) =>
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
}

/** Renumera ordens de exibição para 1..n após remoção ou reorganização. */
export function reindexChargeGroupDisplayOrders<
  T extends { id: string; displayOrder?: number; name: string },
>(groups: T[]): Array<T & { displayOrder: number }> {
  return sortChargeGroupsByDisplayOrder(groups).map((group, index) => ({
    ...group,
    displayOrder: index + 1,
  }));
}

/** Sugere o próximo nome de grupo de carga (G1, G2, G3…). */
export function suggestedChargeGroupName(groups: { name: string }[]): string {
  let max = 0;
  for (const g of groups) {
    const match = /^G(\d+)$/i.exec((g.name || "").trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `G${max + 1}`;
}

export const DELETE_CHARGE_GROUP_EFFECTS = [
  "Registro do grupo de objetos",
  "Campo Grupo de carga nos objetos associados",
] as const;
