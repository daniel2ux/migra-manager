import type { BackupListItem } from './types';

const STORAGE_KEY = 'migra-local-backup-registry';

export interface LocalBackupRecord {
  id: string;
  filename: string;
  createdAt: string;
  projectId: string;
  projectName: string;
  mockId?: string;
  mockName?: string;
  backupType: 'full' | 'mock';
  totalDocs: number;
  sizeBytes: number;
  checksum: string;
}

function readAll(): LocalBackupRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalBackupRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: LocalBackupRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function listLocalBackups(projectId?: string | null): LocalBackupRecord[] {
  const records = readAll();
  if (!projectId) return records;
  return records.filter((record) => record.projectId === projectId);
}

export function addLocalBackup(
  record: Omit<LocalBackupRecord, 'id'> & { id?: string },
): LocalBackupRecord {
  const entry: LocalBackupRecord = {
    ...record,
    id: record.id ?? crypto.randomUUID(),
  };
  const records = readAll();
  records.unshift(entry);
  writeAll(records);
  return entry;
}

export function removeLocalBackup(id: string): void {
  writeAll(readAll().filter((record) => record.id !== id));
}

export function localBackupToListItem(record: LocalBackupRecord): BackupListItem {
  return {
    filename: record.filename,
    storagePath: `local://${record.id}`,
    source: 'local',
    localId: record.id,
    metadata: {
      version: '1.0',
      createdAt: record.createdAt,
      projectId: record.projectId,
      collections: [],
      totalDocs: record.totalDocs,
      checksum: record.checksum,
      sizeBytes: record.sizeBytes,
      filename: record.filename,
    },
  };
}

export function mergeBackupLists(
  storageBackups: BackupListItem[],
  projectId?: string | null,
): BackupListItem[] {
  const localItems = listLocalBackups(projectId).map(localBackupToListItem);
  const merged = [
    ...localItems.map((item) => ({ ...item, source: 'local' as const })),
    ...storageBackups.map((item) => ({ ...item, source: item.source ?? ('storage' as const) })),
  ];

  merged.sort(
    (a, b) =>
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime(),
  );

  return merged;
}
