import { getSupabaseAdmin } from '@/supabase/admin';
import { serializeDoc } from './serializer';
import type { SerializedDoc } from './types';

export async function exportMockData(
  projectId: string,
  mockId: string,
): Promise<{
  data: Record<string, SerializedDoc[]>;
  totalDocs: number;
  collectionPaths: string[];
  mockName: string;
}> {
  const admin = getSupabaseAdmin();
  const data: Record<string, SerializedDoc[]> = {};
  let totalDocs = 0;

  const { data: mock, error: mockError } = await admin
    .from('mocks')
    .select('*')
    .eq('id', mockId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (mockError) throw mockError;
  if (!mock) throw new Error(`Mock não encontrado: projects/${projectId}/mocks/${mockId}`);

  const mockPath = `projects/${projectId}/mocks/${mockId}`;
  data[mockPath] = [{ _id: mockId, ...serializeDoc(mock as Record<string, unknown>) }];
  totalDocs++;

  const { data: objects } = await admin
    .from('migration_objects')
    .select('*')
    .eq('mock_id', mockId)
    .eq('project_id', projectId);

  const objectsPath = `${mockPath}/migrationObjects`;
  data[objectsPath] = (objects ?? []).map((row) => ({
    _id: String((row as Record<string, unknown>).id),
    ...serializeDoc(row as Record<string, unknown>),
  }));
  totalDocs += data[objectsPath].length;

  const { data: logs } = await admin
    .from('migration_logs')
    .select('*')
    .eq('mock', mockId)
    .eq('project_id', projectId);

  data.migrationLogs = (logs ?? []).map((row) => ({
    _id: String((row as Record<string, unknown>).id),
    ...serializeDoc(row as Record<string, unknown>),
  }));
  totalDocs += data.migrationLogs.length;

  return {
    data,
    totalDocs,
    collectionPaths: Object.keys(data),
    mockName: String((mock as Record<string, unknown>).name ?? mockId),
  };
}
