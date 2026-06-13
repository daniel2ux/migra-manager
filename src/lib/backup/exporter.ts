import { getSupabaseAdmin } from '@/supabase/admin';
import { serializeDoc } from './serializer';
import type { SerializedDoc } from './types';

const TABLE_PATH_MAP: Record<string, string> = {
  profiles: 'users',
  projects: 'projects',
  mocks: 'mocks',
  migration_objects: 'migrationObjects',
  comments: 'comments',
  master_objects: 'masterObjects',
  activity_groups: 'activityGroups',
  charge_groups: 'chargeGroups',
  email_contacts: 'emailContacts',
  email_groups: 'emailGroups',
  access_profiles: 'accessProfiles',
  file_aliases: 'fileAliases',
  edit_locks: 'editLocks',
  sessions: 'sessions',
  audit_logs: 'audit_logs',
  migration_logs: 'migrationLogs',
  app_config: 'appConfig',
};

const EXPORT_TABLES = Object.keys(TABLE_PATH_MAP);

export async function exportAllCollections(): Promise<{
  data: Record<string, SerializedDoc[]>;
  totalDocs: number;
  collectionPaths: string[];
}> {
  const admin = getSupabaseAdmin();
  const data: Record<string, SerializedDoc[]> = {};
  let totalDocs = 0;

  for (const table of EXPORT_TABLES) {
    const path = TABLE_PATH_MAP[table]!;
    const { data: rows, error } = await admin.from(table).select('*');
    if (error) {
      console.error(`[exporter] ${table}:`, error.message);
      continue;
    }
    data[path] = (rows ?? []).map((row) => ({
      _id: String((row as Record<string, unknown>).id ?? (row as Record<string, unknown>).key ?? ''),
      ...serializeDoc(row as Record<string, unknown>),
    }));
    totalDocs += data[path].length;
  }

  return { data, totalDocs, collectionPaths: Object.keys(data) };
}
