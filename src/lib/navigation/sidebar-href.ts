/** Monta href da sidebar — navegação sem parâmetros de estado na URL. */
export function buildSidebarHref(href: string, _projectId?: string | null, _skipParams?: boolean): string {
  return href.split("?")[0] ?? href;
}
