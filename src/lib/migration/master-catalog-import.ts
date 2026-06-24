import type { MasterObject } from '@/types/master-object';
import {
  MASTER_CATALOG_EXPORT_VERSION,
  type MasterCatalogExportPayload,
  type MasterCatalogExportRow,
} from '@/lib/migration/master-catalog-export';
import { normalizeMasterCatalogName } from '@/lib/migration/master-catalog';
import { isMasterObjectType } from '@/lib/migration/master-object-type';

export type CatalogImportLogType = 'info' | 'success' | 'warning' | 'error';

export interface CatalogImportLog {
  msg: string;
  type: CatalogImportLogType;
}

export interface CatalogImportRecord {
  id: string;
  data: Record<string, unknown>;
}

export interface CatalogImportPlanResult {
  records: CatalogImportRecord[];
  logs: CatalogImportLog[];
  created: number;
  skipped: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseExportRow(value: unknown): MasterCatalogExportRow | null {
  if (!isRecord(value) || typeof value.name !== 'string') return null;
  const name = value.name.trim();
  if (!name) return null;

  const row: MasterCatalogExportRow = {
    id: typeof value.id === 'string' ? value.id : crypto.randomUUID(),
    name,
  };

  if (typeof value.description === 'string') row.description = value.description;
  if (typeof value.type === 'string' && isMasterObjectType(value.type)) {
    row.type = value.type;
  }
  if (value.status === 'ATIVO' || value.status === 'INATIVO' || value.status === 'LEGACY') {
    row.status = value.status;
  }
  if (typeof value.chargeGroup === 'string') row.chargeGroup = value.chargeGroup;
  if (value.chargeOrder !== undefined && value.chargeOrder !== null) {
    row.chargeOrder = value.chargeOrder as string | number;
  }
  if (value.parallelOrder !== undefined && value.parallelOrder !== null) {
    row.parallelOrder = value.parallelOrder as string | number;
  }
  if (typeof value.isParallel === 'boolean') row.isParallel = value.isParallel;
  if (Array.isArray(value.dependencyIds)) {
    row.dependencyIds = value.dependencyIds.filter((id): id is string => typeof id === 'string');
  }
  if (Array.isArray(value.externalDependencies)) {
    row.externalDependencies = value.externalDependencies.filter(
      (dep): dep is string => typeof dep === 'string',
    );
  }
  if (Array.isArray(value.activityGroupIds)) {
    row.activityGroupIds = value.activityGroupIds.filter((id): id is string => typeof id === 'string');
  }

  return row;
}

export function parseMasterCatalogExportJson(text: string): MasterCatalogExportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Arquivo JSON inválido.');
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.objects)) {
    throw new Error('Formato de catálogo inválido: campo "objects" ausente.');
  }

  const version = parsed.version;
  if (version !== MASTER_CATALOG_EXPORT_VERSION) {
    throw new Error(`Versão de exportação não suportada: ${String(version)}.`);
  }

  const projectRaw = parsed.project;
  if (!isRecord(projectRaw) || typeof projectRaw.id !== 'string' || typeof projectRaw.name !== 'string') {
    throw new Error('Formato de catálogo inválido: metadados do projeto ausentes.');
  }

  const objects = parsed.objects
    .map(parseExportRow)
    .filter((row): row is MasterCatalogExportRow => row !== null);

  if (!objects.length) {
    throw new Error('Nenhum objeto válido encontrado no arquivo JSON.');
  }

  return {
    version: MASTER_CATALOG_EXPORT_VERSION,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    project: {
      id: projectRaw.id,
      name: projectRaw.name,
      ...(typeof projectRaw.company === 'string' ? { company: projectRaw.company } : {}),
    },
    objectCount: typeof parsed.objectCount === 'number' ? parsed.objectCount : objects.length,
    objects,
  };
}

function remapDependencyIds(
  dependencyIds: string[] | undefined,
  idMap: Map<string, string>,
): string[] {
  if (!dependencyIds?.length) return [];
  const remapped: string[] = [];
  for (const depId of dependencyIds) {
    const mapped = idMap.get(depId);
    if (mapped) remapped.push(mapped);
  }
  return remapped;
}

export function planMasterCatalogJsonImport(
  payload: MasterCatalogExportPayload,
  existingObjects: MasterObject[] | null | undefined,
  projectId: string,
  ownerId: string,
): CatalogImportPlanResult {
  const logs: CatalogImportLog[] = [];
  const records: CatalogImportRecord[] = [];
  const idMap = new Map<string, string>();
  const existingByName = new Map<string, string>();

  for (const obj of existingObjects ?? []) {
    existingByName.set(normalizeMasterCatalogName(obj.name), obj.id);
  }

  logs.push({
    msg: `> CATÁLOGO JSON: ${payload.objectCount} registro(s) — origem "${payload.project.name}"`,
    type: 'info',
  });

  type PlannedCreate = { row: MasterCatalogExportRow; newId: string };
  const toCreate: PlannedCreate[] = [];
  let skipped = 0;

  for (const row of payload.objects) {
    const nameKey = normalizeMasterCatalogName(row.name);
    if (!nameKey) {
      logs.push({ msg: `[ERRO] Objeto sem nome válido (id=${row.id}).`, type: 'error' });
      skipped++;
      continue;
    }

    const existingId = existingByName.get(nameKey);
    if (existingId) {
      idMap.set(row.id, existingId);
      logs.push({ msg: `[SALTADO] ${nameKey}: OBJETO JÁ EXISTE NO CATÁLOGO.`, type: 'warning' });
      skipped++;
      continue;
    }

    const newId = crypto.randomUUID();
    idMap.set(row.id, newId);
    existingByName.set(nameKey, newId);
    toCreate.push({ row, newId });
  }

  for (const { row, newId } of toCreate) {
    const nameKey = normalizeMasterCatalogName(row.name);
    records.push({
      id: newId,
      data: {
        id: newId,
        name: nameKey,
        description: row.description?.trim().toUpperCase() || nameKey,
        type: row.type ?? 'MASTER',
        status: row.status ?? 'ATIVO',
        chargeGroup: row.chargeGroup ?? 'G',
        chargeOrder: row.chargeOrder ?? 0,
        ...(row.parallelOrder !== undefined ? { parallelOrder: row.parallelOrder } : {}),
        ...(row.isParallel !== undefined ? { isParallel: row.isParallel } : {}),
        dependencyIds: remapDependencyIds(row.dependencyIds, idMap),
        ...(row.externalDependencies?.length ? { externalDependencies: row.externalDependencies } : {}),
        ...(row.activityGroupIds?.length ? { activityGroupIds: row.activityGroupIds } : {}),
        projectId,
        ownerId,
      },
    });
    logs.push({
      msg: `[NOVO] ${nameKey}: OBJETO IMPORTADO DO JSON.`,
      type: 'success',
    });
  }

  return { records, logs, created: toCreate.length, skipped };
}

export function isJsonCatalogFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.json') || file.type === 'application/json';
}
