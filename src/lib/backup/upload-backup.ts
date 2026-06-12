import { getAdminStorageBucket } from '@/supabase/admin-storage';
import type { BackupMetadata } from './types';

export async function uploadBackupToStorage(
  buffer: Buffer,
  metadata: BackupMetadata,
): Promise<void> {
  const bucket = getAdminStorageBucket();
  const file = bucket.file(`backups/${metadata.filename}`);

  await file.save(buffer);
}
