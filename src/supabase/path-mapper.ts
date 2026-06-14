export interface TableTarget {
  table: string;
  id?: string;
  key?: string;
  filters: PathFilter[];
}

export interface PathFilter {
  column: string;
  op: 'eq' | 'contains';
  value: string;
}

const SEGMENT_TABLE: Record<string, string> = {
  users: 'profiles',
  projects: 'projects',
  mocks: 'mocks',
  migrationObjects: 'migration_objects',
  comments: 'comments',
  masterObjects: 'master_objects',
  activityGroups: 'activity_groups',
  chargeGroups: 'charge_groups',
  emailContacts: 'email_contacts',
  emailGroups: 'email_groups',
  accessProfiles: 'access_profiles',
  fileAliases: 'file_aliases',
  companies: 'companies',
  editLocks: 'edit_locks',
  sessions: 'sessions',
  audit_logs: 'audit_logs',
  migrationLogs: 'migration_logs',
  appConfig: 'app_config',
};

export function parseCompatDbPath(path: string): TableTarget {
  const parts = path.split('/').filter(Boolean);
  const filters: PathFilter[] = [];

  if (parts.length === 0) {
    throw new Error(`Invalid path: ${path}`);
  }

  const root = parts[0];
  const table = SEGMENT_TABLE[root] ?? root;

  if (root === 'appConfig' && parts.length === 2) {
    return { table: 'app_config', key: parts[1], filters };
  }

  if (root === 'sessions' && parts.length === 2) {
    return { table: 'sessions', filters: [{ column: 'user_id', op: 'eq', value: parts[1] }] };
  }

  if (parts.length === 2) {
    return { table, id: parts[1], filters };
  }

  if (root === 'projects' && parts.length >= 3 && parts[2] === 'mocks') {
    const projectId = parts[1];
    filters.push({ column: 'project_id', op: 'eq', value: projectId });

    if (parts.length === 3) {
      return { table: 'mocks', filters };
    }

    const mockId = parts[3];
    if (parts.length === 4) {
      return { table: 'mocks', id: mockId, filters };
    }

    if (parts[4] === 'migrationObjects') {
      filters.push({ column: 'mock_id', op: 'eq', value: mockId });
      if (parts.length === 5) {
        return { table: 'migration_objects', filters };
      }
      const objectId = parts[5];
      if (parts.length === 6) {
        return { table: 'migration_objects', id: objectId, filters };
      }
      if (parts[6] === 'comments') {
        filters.push({ column: 'object_id', op: 'eq', value: objectId });
        if (parts.length === 7) {
          return { table: 'comments', filters };
        }
        return { table: 'comments', id: parts[7], filters };
      }
    }
  }

  if (parts.length === 1) {
    return { table, filters };
  }

  return { table, id: parts[parts.length - 1], filters };
}

export function collectionPathToTarget(segments: string[]): TableTarget {
  return parseCompatDbPath(segments.join('/'));
}
