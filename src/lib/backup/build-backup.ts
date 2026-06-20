import { createHash } from 'crypto';
import { gzipSync } from 'zlib';
import type { BackupMetadata, BackupPayload, SerializedDoc } from './types';

export type BackupDestination = 'storage' | 'local';

export function parseBackupDestination(value: unknown): BackupDestination {
  return value === 'local' ? 'local' : 'storage';
}

function buildBackupTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/** Nome seguro para uso em arquivos de backup. */
function slugifyBackupName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'sem-nome'
  );
}

export function buildBackupFilename(params: {
  projectName: string;
  mockName?: string;
  timestamp?: string;
}): string {
  const ts = params.timestamp ?? buildBackupTimestamp();
  const projectSlug = slugifyBackupName(params.projectName);
  if (params.mockName?.trim()) {
    const mockSlug = slugifyBackupName(params.mockName.trim());
    return `backup-${projectSlug}-${mockSlug}-${ts}.json.gz`;
  }
  return `backup-${projectSlug}-${ts}.json.gz`;
}

export function buildCompressedBackup(params: {
  data: Record<string, SerializedDoc[]>;
  projectId: string;
  filename: string;
  collectionPaths: string[];
  totalDocs: number;
}): { metadata: BackupMetadata; buffer: Buffer; createdAt: Date } {
  const createdAt = new Date();
  const dataJson = JSON.stringify({ data: params.data });
  const checksum = `sha256:${createHash('sha256').update(dataJson).digest('hex')}`;

  const metadata: BackupMetadata = {
    version: '1.0',
    createdAt: createdAt.toISOString(),
    projectId: params.projectId,
    collections: params.collectionPaths,
    totalDocs: params.totalDocs,
    checksum,
    sizeBytes: 0,
    filename: params.filename,
  };

  const buffer = gzipSync(
    Buffer.from(JSON.stringify({ metadata, data: params.data } satisfies BackupPayload), 'utf-8'),
    { level: 9 },
  );
  metadata.sizeBytes = buffer.length;

  return { metadata, buffer, createdAt };
}
