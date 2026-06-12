import { getSupabaseAdmin } from '@/supabase/admin';
import { deserializeDoc } from './serializer';
import type { SerializedDoc, RestoreOptions, RestoreResult } from './types';

const BATCH_SIZE = 400;

const PATH_TABLE_MAP: Record<string, string> = {
  users: 'profiles',
  projects: 'projects',
  mocks: 'mocks',
  migrationObjects: 'migration_objects',
  comments: 'comments',
  masterObjects: 'master_objects',
  activityGroups: 'activity_groups',
  emailContacts: 'email_contacts',
  emailGroups: 'email_groups',
  accessProfiles: 'access_profiles',
  fileAliases: 'file_aliases',
  editLocks: 'edit_locks',
  sessions: 'sessions',
  audit_logs: 'audit_logs',
  migrationLogs: 'migration_logs',
  appConfig: 'app_config',
};

function pathToTable(path: string): string {
  const root = path.split('/')[0] ?? path;
  return PATH_TABLE_MAP[root] ?? root;
}

async function purgeTable(table: string): Promise<void> {
  const admin = getSupabaseAdmin();
  while (true) {
    const { data } = await admin.from(table).select('id').limit(BATCH_SIZE);
    if (!data?.length) break;
    const ids = data.map((r) => (r as { id: string }).id);
    await admin.from(table).delete().in('id', ids);
    if (ids.length < BATCH_SIZE) break;
  }
}

async function writeDocs(
  table: string,
  docs: SerializedDoc[],
  mode: 'merge' | 'overwrite',
): Promise<number> {
  const admin = getSupabaseAdmin();
  let count = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE).map((doc) => {
      const { _id, ...fields } = doc;
      const deserialized = deserializeDoc(fields as Record<string, unknown>);
      if (table === 'app_config') {
        return { key: _id, value: deserialized };
      }
      return { id: _id, ...deserialized };
    });

    const { error } = mode === 'merge'
      ? await admin.from(table).upsert(chunk)
      : await admin.from(table).upsert(chunk);
    if (error) throw error;
    count += chunk.length;
  }

  return count;
}

export async function restoreCollections(
  data: Record<string, SerializedDoc[]>,
  options: RestoreOptions,
): Promise<RestoreResult> {
  const { mode, rootCollections, purgeBeforeRestore } = options;
  const restoredCollections: string[] = [];
  const errors: string[] = [];
  let totalDocs = 0;

  const allPaths = Object.keys(data);
  const paths = rootCollections?.length
    ? allPaths.filter((p) =>
        rootCollections.some((root) => p === root || p.startsWith(root + '/')),
      )
    : allPaths;

  for (const path of paths) {
    const docs = data[path] ?? [];
    const table = pathToTable(path);

    try {
      if (purgeBeforeRestore && docs.length > 0) {
        await purgeTable(table);
      }

      if (docs.length > 0) {
        const count = await writeDocs(table, docs, mode);
        totalDocs += count;
      }

      restoredCollections.push(path);
    } catch (err) {
      errors.push(`${path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { restoredCollections, totalDocs, errors };
}
