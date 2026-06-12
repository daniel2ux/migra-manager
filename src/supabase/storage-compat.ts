'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface StorageRef {
  path: string;
  bucket: string;
  _client: SupabaseClient;
}

export function ref(storage: SupabaseClient, path: string): StorageRef {
  const [bucket, ...rest] = path.split('/');
  return { bucket: bucket!, path: rest.join('/'), _client: storage };
}

export async function uploadBytes(storageRef: StorageRef, file: File) {
  const { error } = await storageRef._client.storage
    .from(storageRef.bucket)
    .upload(storageRef.path, file, { upsert: true });
  if (error) throw error;
  return { ref: storageRef };
}

export async function getDownloadURL(storageRef: StorageRef): Promise<string> {
  const { data } = storageRef._client.storage.from(storageRef.bucket).getPublicUrl(storageRef.path);
  return data.publicUrl;
}
