'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { avatarPublicUrl, avatarStoragePath } from '@/lib/storage/avatar-url';

export interface StorageRef {
  path: string;
  bucket: string;
  _client: SupabaseClient;
}

export function ref(storage: SupabaseClient, path: string): StorageRef {
  const [bucket, ...rest] = path.split('/');
  return { bucket: bucket!, path: rest.join('/'), _client: storage };
}

function inferAvatarExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^(jpe?g|png|gif|webp|avif)$/.test(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  const fromType = file.type.split('/')[1]?.toLowerCase();
  if (fromType && fromType !== 'octet-stream') {
    return fromType === 'jpeg' ? 'jpg' : fromType;
  }
  return 'jpg';
}

/** Caminho no bucket avatars para o usuário autenticado. */
export function avatarRef(storage: SupabaseClient, userId: string, file?: File): StorageRef {
  const ext = file ? inferAvatarExtension(file) : 'jpg';
  return ref(storage, `avatars/${avatarStoragePath(userId, ext)}`);
}

export async function uploadBytes(storageRef: StorageRef, file: File) {
  const { error } = await storageRef._client.storage
    .from(storageRef.bucket)
    .upload(storageRef.path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
  if (error) throw error;
  return { ref: storageRef };
}

export async function getDownloadURL(storageRef: StorageRef): Promise<string> {
  const { data } = storageRef._client.storage.from(storageRef.bucket).getPublicUrl(storageRef.path);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (storageRef.bucket === 'avatars' && supabaseUrl) {
    return avatarPublicUrl(supabaseUrl, storageRef.path);
  }
  return data.publicUrl;
}
