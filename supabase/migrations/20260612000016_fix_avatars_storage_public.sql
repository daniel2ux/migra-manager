-- Avatars: bucket público para exibição em <img> (URLs /object/public/...).
-- INSERT/UPDATE/DELETE permanecem restritos à pasta do próprio usuário via RLS.

UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';

-- Upsert exige SELECT + UPDATE além de INSERT (checklist Supabase Storage).
DROP POLICY IF EXISTS storage_avatars_authenticated_select ON storage.objects;
CREATE POLICY storage_avatars_authenticated_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
