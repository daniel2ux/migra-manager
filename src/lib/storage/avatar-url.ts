const PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/";

/** Caminho padrão do avatar no bucket (compatível com RLS por pasta). */
export function avatarStoragePath(userId: string, ext = "jpg"): string {
  return `${userId}/avatar.${ext}`;
}

/** Garante URL pública do Supabase Storage para uso em <img src>. */
export function normalizeAvatarPublicUrl(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;

  const trimmed = url.trim();

  // URL legada sem segmento /public/ (bucket privado ou getPublicUrl antigo)
  const privateAvatarsMatch = trimmed.match(
    /^(https?:\/\/[^/]+)\/storage\/v1\/object\/avatars\/(.+)$/i,
  );
  if (privateAvatarsMatch) {
    return `${privateAvatarsMatch[1]}${PUBLIC_OBJECT_PREFIX}avatars/${privateAvatarsMatch[2]}`;
  }

  return trimmed;
}

export function avatarPublicUrl(supabaseUrl: string, objectPath: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}${PUBLIC_OBJECT_PREFIX}avatars/${objectPath.replace(/^\//, "")}`;
}
