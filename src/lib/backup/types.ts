export interface BackupMetadata {
  version: string;
  createdAt: string;
  projectId: string;
  collections: string[];
  totalDocs: number;
  checksum: string;
  sizeBytes: number;
  filename: string;
}

export interface SerializedDoc {
  _id: string;
  [key: string]: unknown;
}

export interface BackupPayload {
  metadata: BackupMetadata;
  data: Record<string, SerializedDoc[]>;
}

export interface RestoreOptions {
  /** 'merge' upserts without deleting extra docs. 'overwrite' replaces doc content. */
  mode: 'merge' | 'overwrite';
  /** Root collection names to restore (e.g. ['users', 'projects']). Undefined = all. */
  rootCollections?: string[];
  /** Delete all existing docs in each target collection before writing (full purge). */
  purgeBeforeRestore?: boolean;
}

export interface RestoreResult {
  restoredCollections: string[];
  totalDocs: number;
  errors: string[];
}

export type BackupSource = 'storage' | 'local';

export interface BackupListItem {
  filename: string;
  storagePath: string;
  metadata: BackupMetadata;
  source?: BackupSource;
  localId?: string;
}

export function isValidBackupFilename(filename: string): boolean {
  return (
    filename.endsWith('.json.gz') &&
    !filename.includes('/') &&
    !filename.includes('..') &&
    /^backup-[\w\-]+\.json\.gz$/.test(filename)
  );
}
