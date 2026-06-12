import type { Project } from "@/types/migration";

/** Nome da empresa-cliente (`company` no Firestore; `empresa` legado). */
export function getProjectCompanyName(
    project?: Pick<Project, "name" | "company" | "empresa"> | null
): string | null {
    const value = project?.company?.trim() || project?.empresa?.trim();
    return value || null;
}

/** Empresa com fallback para o nome do projeto. */
export function getProjectCompanyDisplay(
    project?: Pick<Project, "name" | "company" | "empresa"> | null
): string {
    return getProjectCompanyName(project) || project?.name?.trim() || "—";
}

/** Nome do projeto no header quando empresa e projeto são exibidos separados. */
export function getProjectNameForContext(
    project?: Pick<Project, "name" | "company" | "empresa"> | null,
): string | undefined {
    if (!project) return undefined;
    if (!getProjectCompanyName(project)) return undefined;
    const name = project.name?.trim();
    return name || undefined;
}
