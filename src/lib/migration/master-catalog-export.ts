import type { MasterObject } from '@/types/master-object';

export const MASTER_CATALOG_EXPORT_VERSION = 1 as const;

/** Extensão e MIME do formato padrão de exportação/importação do catálogo mestre. */
const MASTER_CATALOG_JSON_EXTENSION = '.json';
const MASTER_CATALOG_JSON_MIME = 'application/json;charset=utf-8';
export const MASTER_CATALOG_JSON_ACCEPT = `${MASTER_CATALOG_JSON_EXTENSION},application/json`;

export interface MasterCatalogExportPayload {
  version: typeof MASTER_CATALOG_EXPORT_VERSION;
  exportedAt: string;
  project: {
    id: string;
    name: string;
    company?: string;
  };
  objectCount: number;
  objects: MasterCatalogExportRow[];
}

export type MasterCatalogExportRow = Omit<
  MasterObject,
  '_migrationDocId' | 'updatedAt'
> & {
  updatedAt?: string;
};

function slugifySegment(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'item'
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Padrão: `<projeto>-<mock>-<date>-<time>.json` (date: YYYY-MM-DD, time: HH-mm-ss local). */
export function buildJsonExportFilename(
  projectName: string,
  mockName: string,
  exportedAt: Date = new Date(),
): string {
  const date = `${exportedAt.getFullYear()}-${pad2(exportedAt.getMonth() + 1)}-${pad2(exportedAt.getDate())}`;
  const time = `${pad2(exportedAt.getHours())}-${pad2(exportedAt.getMinutes())}-${pad2(exportedAt.getSeconds())}`;
  return `${slugifySegment(projectName)}-${slugifySegment(mockName)}-${date}-${time}.json`;
}

function serializeUpdatedAt(value: MasterObject['updatedAt']): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.();
    if (maybeDate instanceof Date) return maybeDate.toISOString();
  }
  return String(value);
}

function serializeMasterObjectForExport(
  obj: MasterObject & { __path?: string },
): MasterCatalogExportRow {
  const updatedAt = serializeUpdatedAt(obj.updatedAt);
  return {
    id: obj.id,
    name: obj.name,
    description: obj.description,
    type: obj.type,
    status: obj.status,
    chargeGroup: obj.chargeGroup,
    chargeOrder: obj.chargeOrder,
    parallelOrder: obj.parallelOrder,
    isParallel: obj.isParallel,
    dependencyIds: obj.dependencyIds,
    externalDependencies: obj.externalDependencies,
    ownerId: obj.ownerId,
    projectId: obj.projectId,
    activityGroupIds: obj.activityGroupIds,
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function buildMasterCatalogExportPayload(
  objects: MasterObject[],
  project: { id: string; name: string; company?: string },
): MasterCatalogExportPayload {
  const rows = objects.map((obj) => serializeMasterObjectForExport(obj));
  rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return {
    version: MASTER_CATALOG_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      ...(project.company ? { company: project.company } : {}),
    },
    objectCount: rows.length,
    objects: rows,
  };
}

export function suggestMasterCatalogExportFilename(
  projectName: string,
  mockName = 'catalogo',
  exportedAt?: Date,
): string {
  return buildJsonExportFilename(projectName, mockName, exportedAt);
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: MASTER_CATALOG_JSON_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 500);
}
