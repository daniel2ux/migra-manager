-- Revoga EXECUTE de RPCs administrativas para roles expostas via PostgREST.
-- REVOKE FROM PUBLIC não remove grants implícitos de anon/authenticated.

REVOKE EXECUTE ON FUNCTION public.audit_orphan_project_records() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_orphan_project_records() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_master_objects_project_id(UUID, BOOLEAN) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.count_mock_related_rows(UUID, UUID[]) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.audit_orphan_project_records() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_project_records() TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_master_objects_project_id(UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_mock_related_rows(UUID, UUID[]) TO service_role;

-- Bucket avatars: público para URL direta, sem listagem ampla via API.
DROP POLICY IF EXISTS storage_avatars_select ON storage.objects;
DROP POLICY IF EXISTS storage_avatars_anon_select ON storage.objects;
DROP POLICY IF EXISTS storage_avatars_authenticated_select ON storage.objects;

-- Leitura autenticada apenas na própria pasta (upsert/list parcial).
CREATE POLICY storage_avatars_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
