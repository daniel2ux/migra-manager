-- Catálogo de referência para relatórios + buckets Storage

CREATE TABLE public.catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  charge_group TEXT,
  charge_order TEXT,
  is_parallel BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT catalogo_name_unique UNIQUE (name)
);

CREATE INDEX idx_catalogo_name ON public.catalogo (name);

CREATE TRIGGER catalogo_updated_at
  BEFORE UPDATE ON public.catalogo
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalogo_select ON public.catalogo
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY catalogo_write ON public.catalogo
  FOR ALL TO authenticated
  USING (private.is_admin_or_master())
  WITH CHECK (private.is_admin_or_master());

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('avatars', 'avatars', true, 5242880),
  ('signatures', 'signatures', false, 10485760),
  ('backups', 'backups', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Avatars: leitura pública; upload/update/delete só na própria pasta
CREATE POLICY storage_avatars_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY storage_avatars_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY storage_avatars_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY storage_avatars_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Assinaturas de e-mail: pasta por usuário
CREATE POLICY storage_signatures_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY storage_signatures_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY storage_signatures_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY storage_signatures_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Backups: apenas service role (API routes server-side)
