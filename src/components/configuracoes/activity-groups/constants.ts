export const CARD_TOOLBAR_BTN =
  "fiori-card-toolbar-btn !rounded-[0.25rem] !size-[1.375rem] min-h-0 min-w-0";

export const COLOR_PALETTE = [
  // Blues & Cyans
  "#3B82F6", "#0EA5E9", "#06B6D4", "#2563EB", "#1D4ED8", "#0369A1", "#00AEEF", "#0891B2",
  // Greens & Teals
  "#10B981", "#14B8A6", "#22C55E", "#84CC16", "#28A745", "#059669", "#15803D", "#0D9488",
  // Oranges & Yellows
  "#F59E0B", "#F97316", "#FD7E14", "#EAB308", "#D97706", "#B45309", "#CA8A04", "#92400E",
  // Reds & Pinks
  "#EF4444", "#E11D48", "#DC3545", "#F43F5E", "#BE123C", "#9F1239", "#EC4899", "#881337",
  // Violets & Indigos
  "#8B5CF6", "#6366F1", "#A855F7", "#7C3AED", "#4F46E5", "#6D28D9", "#1E1B4B", "#4338CA"
];

/** Próxima cor da paleta (circular) a partir da cor atual. */
export function nextPaletteColor(current: string): string {
  const idx = COLOR_PALETTE.indexOf(current);
  if (idx === -1) return COLOR_PALETTE[0];
  return COLOR_PALETTE[(idx + 1) % COLOR_PALETTE.length];
}

/** Cor sugerida ao abrir o formulário de criação (após o último grupo cadastrado). */
export function suggestedCreateGroupColor(groups: { color: string; displayOrder?: number }[]): string {
  if (groups.length === 0) return COLOR_PALETTE[0];
  const last = groups.reduce((best, g) =>
    (g.displayOrder ?? 0) >= (best.displayOrder ?? 0) ? g : best,
  );
  return nextPaletteColor(last.color);
}

/** Próxima ordem de exibição disponível (maior ordem existente + 1). */
export function nextAvailableDisplayOrder(groups: { displayOrder?: number }[]): number {
  if (groups.length === 0) return 1;
  const maxOrder = groups.reduce((max, g) => Math.max(max, g.displayOrder ?? 0), 0);
  return maxOrder + 1;
}

export function sortActivityGroupsByDisplayOrder<
  T extends { displayOrder?: number; name: string },
>(groups: T[]): T[] {
  return [...groups].sort(
    (a, b) =>
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
}

/** Renumera ordens de exibição para 1..n após remoção ou reorganização. */
export function reindexActivityGroupDisplayOrders<
  T extends { id: string; displayOrder?: number; name: string },
>(groups: T[]): Array<T & { displayOrder: number }> {
  return sortActivityGroupsByDisplayOrder(groups).map((group, index) => ({
    ...group,
    displayOrder: index + 1,
  }));
}

export const DELETE_GROUP_EFFECTS = [
  "Registro do grupo de atividade",
  "Vínculos de objetos associados a este grupo",
] as const;
