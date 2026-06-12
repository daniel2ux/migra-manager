/** Monta href da sidebar preservando `projectId` quando aplicável. */
export function buildSidebarHref(
  href: string,
  projectId: string | null,
  skipParams?: boolean,
): string {
  if (skipParams || !projectId) return href;
  const [path, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  if (!params.has("projectId")) params.set("projectId", projectId);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
