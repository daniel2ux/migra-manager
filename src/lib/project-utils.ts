/**
 * Projeto ativo (padrão true quando o campo não existe em registros legados).
 */
function isProjectActive(project: { isActive?: boolean }): boolean {
  return project.isActive !== false;
}

export function isProjectInactive(project: { isActive?: boolean }): boolean {
  return project.isActive === false;
}

export function filterActiveProjects<T extends { isActive?: boolean }>(
  projects: T[] | null | undefined,
): T[] {
  return (projects ?? []).filter(isProjectActive);
}

/** Chave numérica para ordenar projetos por data de criação (legado CompatDb + ISO). */
export function projectCreatedAtSeconds(createdAt?: { seconds?: number } | string): number {
  if (!createdAt) return 0;
  if (typeof createdAt === 'string') {
    const ms = Date.parse(createdAt);
    return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
  }
  return createdAt.seconds ?? 0;
}
