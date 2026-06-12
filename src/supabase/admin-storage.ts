import { getSupabaseAdmin } from '@/supabase/admin';

type StorageFile = {
  name: string;
  exists(): Promise<[boolean]>;
  download(): Promise<Buffer[]>;
  delete(): Promise<void>;
  save(content: Buffer | string): Promise<void>;
  getMetadata(): Promise<[{ metadata?: Record<string, string>; timeCreated?: string; size?: number }]>;
};

export function getAdminStorageBucket() {
  const admin = getSupabaseAdmin();

  function file(path: string): StorageFile {
    const [bucket, ...rest] = path.split('/');
    const filePath = rest.join('/');

    return {
      name: path,
      async exists() {
        const { data, error } = await admin.storage.from(bucket!).download(filePath).catch(() => ({ data: null, error: true }));
        return [Boolean(data) && !error];
      },
      async download() {
        const { data, error } = await admin.storage.from(bucket!).download(filePath);
        if (error) throw error;
        const buf = await data.arrayBuffer();
        return [Buffer.from(buf)];
      },
      async delete() {
        const { error } = await admin.storage.from(bucket!).remove([filePath]);
        if (error) throw error;
      },
      async save(content: Buffer | string) {
        const { error } = await admin.storage.from(bucket!).upload(filePath, content, { upsert: true });
        if (error) throw error;
      },
      async getMetadata() {
        return [{ metadata: {}, timeCreated: new Date().toISOString(), size: 0 }];
      },
    };
  }

  return {
    file,
    async getFiles(options?: { prefix?: string } | string) {
      const prefix = typeof options === 'string' ? options : options?.prefix ?? '';
      const [bucket, ...rest] = prefix.split('/');
      const folder = rest.join('/').replace(/\/$/, '');
      const { data, error } = await admin.storage.from(bucket!).list(folder || undefined);
      if (error) throw error;
      const files = (data ?? []).map((f) => {
        const fullPath = folder ? `${folder}/${f.name}` : f.name;
        return {
          name: fullPath,
          metadata: { timeCreated: f.created_at },
          async getMetadata() {
            return [{ metadata: {}, timeCreated: f.created_at, size: 0 }] as const;
          },
        };
      });
      return [files, {}] as const;
    },
  };
}
