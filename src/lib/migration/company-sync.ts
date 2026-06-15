/** Projeto apto para cadastro de objetos mestre. */
export function projectAllowsMasterObjectRegistration(
  project?: { companyId?: string | null; company?: string | null; empresa?: string | null } | null,
): boolean {
  if (!project) return false;
  if (project.companyId) return true;
  const legacy = project.company?.trim() || project.empresa?.trim();
  return Boolean(legacy);
}
