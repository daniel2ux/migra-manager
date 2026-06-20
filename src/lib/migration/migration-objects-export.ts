import { buildJsonExportFilename, downloadJsonFile } from '@/lib/migration/master-catalog-export';

export { downloadJsonFile };

export const MIGRATION_OBJECTS_EXPORT_VERSION = 1 as const;

export interface MigrationObjectExportRow {
  name: string;
  chargeStartTime?: string;
  chargeEndTime?: string;
  targetRecordsCount?: number;
  processedRecordsCount?: number;
  errorRecordsCount?: number;
  successfulRecordsCount?: number;
  status?: string;
  comment?: string;
  logStatus?: string;
}

export interface MigrationObjectsExportPayload {
  version: typeof MIGRATION_OBJECTS_EXPORT_VERSION;
  exportedAt: string;
  projectId: string;
  mock: { id: string; name: string };
  objectCount: number;
  objects: MigrationObjectExportRow[];
}

export interface MigrationObjectImportRow {
  objectName: string;
  startRaw: string;
  endRaw: string;
  targetCount: number;
  errorCount: number;
  processedCount: number;
  successCount: number;
  comment: string;
  logStatus: string;
  hasMetrics: boolean;
}

export function suggestMigrationObjectsExportFilename(
  projectName: string,
  mockName: string,
  exportedAt?: Date,
): string {
  return buildJsonExportFilename(projectName, mockName, exportedAt);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toIsoOrEmpty(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function buildMigrationObjectsExportPayload(
  objects: Array<{
    name: string;
    chargeStartTime?: string;
    chargeEndTime?: string;
    targetRecordsCount?: number;
    processedRecordsCount?: number;
    errorRecordsCount?: number;
    successfulRecordsCount?: number;
    status?: string;
  }>,
  projectId: string,
  mock: { id: string; name: string },
): MigrationObjectsExportPayload {
  const rows: MigrationObjectExportRow[] = objects.map((obj) => {
    const processed = Number(obj.processedRecordsCount) || 0;
    const error = Number(obj.errorRecordsCount) || 0;
    const success = Number(obj.successfulRecordsCount) || Math.max(0, processed - error);
    return {
      name: obj.name.toUpperCase(),
      ...(obj.chargeStartTime ? { chargeStartTime: toIsoOrEmpty(obj.chargeStartTime) } : {}),
      ...(obj.chargeEndTime ? { chargeEndTime: toIsoOrEmpty(obj.chargeEndTime) } : {}),
      targetRecordsCount: Number(obj.targetRecordsCount) || 0,
      processedRecordsCount: processed,
      errorRecordsCount: error,
      successfulRecordsCount: success,
      status:
        obj.status ||
        (obj.chargeStartTime && !obj.chargeEndTime ? 'CARGA_EM_ANDAMENTO' : 'PENDENTE'),
    };
  });

  return {
    version: MIGRATION_OBJECTS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    projectId,
    mock: { id: mock.id, name: mock.name },
    objectCount: rows.length,
    objects: rows,
  };
}

function parseExportRow(value: unknown): MigrationObjectExportRow | null {
  if (!isRecord(value) || typeof value.name !== 'string') return null;
  const name = value.name.trim();
  if (!name) return null;

  const row: MigrationObjectExportRow = { name: name.toUpperCase() };
  if (typeof value.chargeStartTime === 'string') row.chargeStartTime = value.chargeStartTime;
  if (typeof value.chargeEndTime === 'string') row.chargeEndTime = value.chargeEndTime;
  if (value.targetRecordsCount !== undefined) row.targetRecordsCount = Number(value.targetRecordsCount) || 0;
  if (value.processedRecordsCount !== undefined) {
    row.processedRecordsCount = Number(value.processedRecordsCount) || 0;
  }
  if (value.errorRecordsCount !== undefined) row.errorRecordsCount = Number(value.errorRecordsCount) || 0;
  if (value.successfulRecordsCount !== undefined) {
    row.successfulRecordsCount = Number(value.successfulRecordsCount) || 0;
  }
  if (typeof value.status === 'string') row.status = value.status;
  if (typeof value.comment === 'string') row.comment = value.comment;
  if (typeof value.logStatus === 'string') row.logStatus = value.logStatus;
  return row;
}

export function parseMigrationObjectsExportJson(text: string): MigrationObjectsExportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Arquivo JSON inválido.');
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.objects)) {
    throw new Error('Formato inválido: campo "objects" ausente.');
  }

  if (parsed.version !== MIGRATION_OBJECTS_EXPORT_VERSION) {
    throw new Error(`Versão de exportação não suportada: ${String(parsed.version)}.`);
  }

  const mockRaw = parsed.mock;
  if (!isRecord(mockRaw) || typeof mockRaw.id !== 'string' || typeof mockRaw.name !== 'string') {
    throw new Error('Formato inválido: metadados da mock ausentes.');
  }

  if (typeof parsed.projectId !== 'string') {
    throw new Error('Formato inválido: projectId ausente.');
  }

  const objects = parsed.objects
    .map(parseExportRow)
    .filter((row): row is MigrationObjectExportRow => row !== null);

  if (!objects.length) {
    throw new Error('Nenhum objeto válido encontrado no JSON.');
  }

  return {
    version: MIGRATION_OBJECTS_EXPORT_VERSION,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    projectId: parsed.projectId,
    mock: { id: mockRaw.id, name: mockRaw.name },
    objectCount: typeof parsed.objectCount === 'number' ? parsed.objectCount : objects.length,
    objects,
  };
}

export function migrationImportRowsFromJson(
  payload: MigrationObjectsExportPayload,
): MigrationObjectImportRow[] {
  return payload.objects.map((obj) => {
    const processed = Number(obj.processedRecordsCount) || 0;
    const error = Number(obj.errorRecordsCount) || 0;
    const success = Number(obj.successfulRecordsCount) || Math.max(0, processed - error);
    const logStatus = ['aberta', 'andamento', 'resolvida', 'bloqueada'].includes(
      (obj.logStatus ?? '').toLowerCase(),
    )
      ? (obj.logStatus as string).toLowerCase()
      : 'aberta';

    return {
      objectName: obj.name.toUpperCase(),
      startRaw: obj.chargeStartTime ?? '',
      endRaw: obj.chargeEndTime ?? '',
      targetCount: Number(obj.targetRecordsCount) || 0,
      errorCount: error,
      processedCount: processed,
      successCount: success,
      comment: obj.comment ?? '',
      logStatus,
      hasMetrics: Boolean(
        obj.chargeStartTime ||
          obj.chargeEndTime ||
          obj.targetRecordsCount !== undefined ||
          obj.processedRecordsCount !== undefined,
      ),
    };
  });
}

export function isJsonMigrationObjectsFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.json') || file.type === 'application/json';
}
