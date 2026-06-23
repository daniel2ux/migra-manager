import type { SupabaseClient } from '@supabase/supabase-js';

const BATCH_SIZE = 400;
const SAMPLE_LIMIT = 50;

export type InactiveMockPreviewRow = {
  id: string;
  name: string;
  objectCount: number;
  logCount: number;
};

export type PurgeInactiveMocksResult = {
  dryRun: boolean;
  scanned: number;
  wouldDelete: number;
  totalObjects: number;
  totalLogs: number;
  sample: InactiveMockPreviewRow[];
  deletedMocks?: number;
  deletedLogs?: number;
  deletedLocks?: number;
  durationMs?: number;
};

type MockRow = { id: string; name: string };

type MockRelatedCountRow = {
  mock_id: string;
  object_count: number;
  log_count: number;
};

type MockRelatedCounts = {
  objectCounts: Map<string, number>;
  logCounts: Map<string, number>;
  totalObjects: number;
  totalLogs: number;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function initCountMaps(mockIds: string[]): Pick<MockRelatedCounts, 'objectCounts' | 'logCounts'> {
  const objectCounts = new Map<string, number>();
  const logCounts = new Map<string, number>();
  for (const mockId of mockIds) {
    objectCounts.set(mockId, 0);
    logCounts.set(mockId, 0);
  }
  return { objectCounts, logCounts };
}

async function deleteByIds(
  admin: SupabaseClient,
  table: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;

  let deleted = 0;
  for (const chunk of chunkArray(ids, BATCH_SIZE)) {
    const { error } = await admin.from(table).delete().in('id', chunk);
    if (error) throw error;
    deleted += chunk.length;
  }
  return deleted;
}

async function countMockRelatedRowsViaRpc(
  admin: SupabaseClient,
  projectId: string,
  mockIds: string[],
): Promise<MockRelatedCounts> {
  const { objectCounts, logCounts } = initCountMaps(mockIds);
  if (mockIds.length === 0) {
    return { objectCounts, logCounts, totalObjects: 0, totalLogs: 0 };
  }

  let totalObjects = 0;
  let totalLogs = 0;

  for (const chunk of chunkArray(mockIds, BATCH_SIZE)) {
    const { data, error } = await admin.rpc('count_mock_related_rows', {
      p_project_id: projectId,
      p_mock_ids: chunk,
    });
    if (error) throw error;

    for (const row of (data ?? []) as MockRelatedCountRow[]) {
      const mockId = String(row.mock_id);
      const objectCount = Number(row.object_count) || 0;
      const logCount = Number(row.log_count) || 0;
      objectCounts.set(mockId, objectCount);
      logCounts.set(mockId, logCount);
      totalObjects += objectCount;
      totalLogs += logCount;
    }
  }

  return { objectCounts, logCounts, totalObjects, totalLogs };
}

async function countTotalForMocks(
  admin: SupabaseClient,
  table: 'migration_objects' | 'migration_logs',
  projectId: string,
  mockIds: string[],
  mockColumn: 'mock_id' | 'mock',
): Promise<number> {
  if (mockIds.length === 0) return 0;

  let total = 0;
  for (const chunk of chunkArray(mockIds, BATCH_SIZE)) {
    const { count, error } = await admin
      .from(table)
      .select(mockColumn, { count: 'exact', head: true })
      .eq('project_id', projectId)
      .in(mockColumn, chunk);
    if (error) throw error;
    total += count ?? 0;
  }
  return total;
}

async function countByMockIdsForSample(
  admin: SupabaseClient,
  table: 'migration_objects' | 'migration_logs',
  projectId: string,
  mockIds: string[],
  mockColumn: 'mock_id' | 'mock',
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const mockId of mockIds) counts.set(mockId, 0);
  if (mockIds.length === 0) return counts;

  for (const chunk of chunkArray(mockIds, BATCH_SIZE)) {
    const { data, error } = await admin
      .from(table)
      .select(mockColumn)
      .eq('project_id', projectId)
      .in(mockColumn, chunk);
    if (error) throw error;

    for (const row of data ?? []) {
      const mockId = String((row as Record<string, unknown>)[mockColumn]);
      counts.set(mockId, (counts.get(mockId) ?? 0) + 1);
    }
  }

  return counts;
}

async function loadMockRelatedCounts(
  admin: SupabaseClient,
  projectId: string,
  mockIds: string[],
): Promise<MockRelatedCounts> {
  try {
    return await countMockRelatedRowsViaRpc(admin, projectId, mockIds);
  } catch (rpcError) {
    console.warn(
      '[purge-inactive-mocks] RPC indisponível, usando fallback:',
      rpcError instanceof Error ? rpcError.message : rpcError,
    );

    const [totalObjects, totalLogs, objectCounts, logCounts] = await Promise.all([
      countTotalForMocks(admin, 'migration_objects', projectId, mockIds, 'mock_id'),
      countTotalForMocks(admin, 'migration_logs', projectId, mockIds, 'mock_id'),
      countByMockIdsForSample(admin, 'migration_objects', projectId, mockIds, 'mock_id'),
      countByMockIdsForSample(admin, 'migration_logs', projectId, mockIds, 'mock_id'),
    ]);

    return { objectCounts, logCounts, totalObjects, totalLogs };
  }
}

async function deleteLogsForMocks(
  admin: SupabaseClient,
  projectId: string,
  mockIds: string[],
): Promise<number> {
  if (mockIds.length === 0) return 0;

  let deleted = 0;
  for (const chunk of chunkArray(mockIds, BATCH_SIZE)) {
    const { count, error } = await admin
      .from('migration_logs')
      .delete({ count: 'exact' })
      .eq('project_id', projectId)
      .in('mock_id', chunk);
    if (error) throw error;
    deleted += count ?? 0;
  }
  return deleted;
}

function extractMockIdFromLockResource(resourceId: string, projectId: string): string | null {
  const prefix = `projects/${projectId}/mocks/`;
  if (!resourceId.startsWith(prefix)) return null;
  const rest = resourceId.slice(prefix.length);
  const mockId = rest.split('/')[0];
  return mockId || null;
}

async function deleteLocksForMocks(
  admin: SupabaseClient,
  projectId: string,
  inactiveIdSet: Set<string>,
): Promise<number> {
  if (inactiveIdSet.size === 0) return 0;

  const { data, error } = await admin
    .from('edit_locks')
    .select('id, resource_id')
    .like('resource_id', `projects/${projectId}/mocks/%`);
  if (error) throw error;

  const lockIds: string[] = [];
  for (const row of data ?? []) {
    const resourceId = String((row as { resource_id: string }).resource_id);
    const mockId = extractMockIdFromLockResource(resourceId, projectId);
    if (mockId && inactiveIdSet.has(mockId)) {
      lockIds.push(String((row as { id: string }).id));
    }
  }

  return deleteByIds(admin, 'edit_locks', lockIds);
}

function buildPreview(
  scanned: number,
  inactiveMocks: MockRow[],
  objectCounts: Map<string, number>,
  logCounts: Map<string, number>,
  totalObjects: number,
  totalLogs: number,
): PurgeInactiveMocksResult {
  const sample = inactiveMocks.slice(0, SAMPLE_LIMIT).map((mock) => ({
    id: mock.id,
    name: mock.name || '(sem nome)',
    objectCount: objectCounts.get(mock.id) ?? 0,
    logCount: logCounts.get(mock.id) ?? 0,
  }));

  return {
    dryRun: true,
    scanned,
    wouldDelete: inactiveMocks.length,
    totalObjects,
    totalLogs,
    sample,
  };
}

export async function purgeInactiveMocks(
  admin: SupabaseClient,
  projectId: string,
  dryRun: boolean,
): Promise<PurgeInactiveMocksResult> {
  const startedAt = Date.now();

  const [scannedResult, inactiveResult] = await Promise.all([
    admin.from('mocks').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    admin.from('mocks').select('id, name').eq('project_id', projectId).eq('is_active', false),
  ]);

  if (scannedResult.error) throw scannedResult.error;
  if (inactiveResult.error) throw inactiveResult.error;

  const scanned = scannedResult.count ?? 0;
  const inactiveMocks = (inactiveResult.data ?? []) as MockRow[];
  const inactiveIds = inactiveMocks.map((mock) => mock.id);
  const inactiveIdSet = new Set(inactiveIds);

  if (inactiveIds.length === 0) {
    return {
      ...buildPreview(scanned, inactiveMocks, new Map(), new Map(), 0, 0),
      durationMs: Date.now() - startedAt,
    };
  }

  const { objectCounts, logCounts, totalObjects, totalLogs } = await loadMockRelatedCounts(
    admin,
    projectId,
    inactiveIds,
  );

  const preview = buildPreview(
    scanned,
    inactiveMocks,
    objectCounts,
    logCounts,
    totalObjects,
    totalLogs,
  );

  if (dryRun) {
    return { ...preview, durationMs: Date.now() - startedAt };
  }

  const [deletedLogs, deletedLocks] = await Promise.all([
    deleteLogsForMocks(admin, projectId, inactiveIds),
    deleteLocksForMocks(admin, projectId, inactiveIdSet),
  ]);
  const deletedMocks = await deleteByIds(admin, 'mocks', inactiveIds);

  return {
    ...preview,
    dryRun: false,
    deletedMocks,
    deletedLogs,
    deletedLocks,
    durationMs: Date.now() - startedAt,
  };
}
