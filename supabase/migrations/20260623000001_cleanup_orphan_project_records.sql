-- Auditoria e limpeza de registros sem vínculo com projeto cadastrado.
-- Idempotente: segunda execução não remove linhas já válidas.

CREATE OR REPLACE FUNCTION public.audit_orphan_project_records()
RETURNS TABLE(check_name TEXT, row_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'master_objects_null_project'::text, COUNT(*)::bigint
  FROM public.master_objects mo WHERE mo.project_id IS NULL
  UNION ALL
  SELECT 'master_objects_invalid_project', COUNT(*)::bigint
  FROM public.master_objects mo
  WHERE mo.project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = mo.project_id)
  UNION ALL
  SELECT 'mocks_invalid_project', COUNT(*)::bigint
  FROM public.mocks m
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = m.project_id)
  UNION ALL
  SELECT 'migration_objects_invalid_project', COUNT(*)::bigint
  FROM public.migration_objects mo
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = mo.project_id)
  UNION ALL
  SELECT 'migration_objects_invalid_mock', COUNT(*)::bigint
  FROM public.migration_objects mo
  WHERE NOT EXISTS (SELECT 1 FROM public.mocks m WHERE m.id = mo.mock_id)
  UNION ALL
  SELECT 'migration_objects_project_mock_mismatch', COUNT(*)::bigint
  FROM public.migration_objects mo
  JOIN public.mocks m ON m.id = mo.mock_id
  WHERE mo.project_id IS DISTINCT FROM m.project_id
  UNION ALL
  SELECT 'migration_objects_master_other_project', COUNT(*)::bigint
  FROM public.migration_objects mo
  JOIN public.master_objects mast ON mast.id = mo.master_object_id
  WHERE mo.project_id IS DISTINCT FROM mast.project_id
  UNION ALL
  SELECT 'migration_objects_dangling_master', COUNT(*)::bigint
  FROM public.migration_objects mo
  WHERE mo.master_object_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.master_objects mast WHERE mast.id = mo.master_object_id)
  UNION ALL
  SELECT 'comments_invalid_project', COUNT(*)::bigint
  FROM public.comments c
  WHERE c.project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = c.project_id)
  UNION ALL
  SELECT 'comments_orphan_object', COUNT(*)::bigint
  FROM public.comments c
  WHERE c.object_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.migration_objects mo WHERE mo.id = c.object_id)
  UNION ALL
  SELECT 'migration_logs_invalid_or_null_project', COUNT(*)::bigint
  FROM public.migration_logs ml
  WHERE ml.project_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = ml.project_id)
  UNION ALL
  SELECT 'companies_without_project', COUNT(*)::bigint
  FROM public.companies c
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.company_id = c.id)
  UNION ALL
  SELECT 'profiles_stale_project_ids', COUNT(*)::bigint
  FROM public.profiles pr
  WHERE EXISTS (
    SELECT 1 FROM unnest(pr.project_ids) AS pid
    WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pid)
  )
  UNION ALL
  SELECT 'activity_groups_stale_object_ids', COUNT(*)::bigint
  FROM public.activity_groups ag
  WHERE EXISTS (
    SELECT 1 FROM unnest(ag.object_ids) AS oid
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.master_objects mo
      JOIN public.projects p ON p.id = mo.project_id
      WHERE mo.id = oid
    )
  )
  UNION ALL
  SELECT 'charge_groups_stale_object_ids', COUNT(*)::bigint
  FROM public.charge_groups cg
  WHERE EXISTS (
    SELECT 1 FROM unnest(cg.object_ids) AS oid
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.master_objects mo
      JOIN public.projects p ON p.id = mo.project_id
      WHERE mo.id = oid
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.cleanup_orphan_project_records()
RETURNS TABLE(action TEXT, affected_rows BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  DELETE FROM public.comments c
  WHERE (c.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = c.project_id))
     OR (c.object_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.migration_objects mo WHERE mo.id = c.object_id));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  action := 'delete_comments_orphans'; affected_rows := v_count; RETURN NEXT;

  DELETE FROM public.migration_logs ml
  WHERE ml.project_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = ml.project_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  action := 'delete_migration_logs_orphans'; affected_rows := v_count; RETURN NEXT;

  DELETE FROM public.migration_objects mo
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = mo.project_id)
     OR NOT EXISTS (SELECT 1 FROM public.mocks m WHERE m.id = mo.mock_id)
     OR EXISTS (
       SELECT 1 FROM public.mocks m
       WHERE m.id = mo.mock_id AND m.project_id IS DISTINCT FROM mo.project_id
     )
     OR EXISTS (
       SELECT 1 FROM public.master_objects mast
       WHERE mast.id = mo.master_object_id
         AND (mast.project_id IS NULL OR mast.project_id IS DISTINCT FROM mo.project_id)
     )
     OR (
       mo.master_object_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.master_objects mast WHERE mast.id = mo.master_object_id)
     );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  action := 'delete_migration_objects_orphans'; affected_rows := v_count; RETURN NEXT;

  DELETE FROM public.mocks m
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = m.project_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  action := 'delete_mocks_orphans'; affected_rows := v_count; RETURN NEXT;

  DELETE FROM public.master_objects mo
  WHERE mo.project_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = mo.project_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  action := 'delete_master_objects_orphans'; affected_rows := v_count; RETURN NEXT;

  UPDATE public.activity_groups ag
  SET object_ids = COALESCE((
    SELECT array_agg(mid ORDER BY ord)
    FROM unnest(ag.object_ids) WITH ORDINALITY AS t(mid, ord)
    WHERE EXISTS (
      SELECT 1
      FROM public.master_objects mo
      JOIN public.projects p ON p.id = mo.project_id
      WHERE mo.id = mid
    )
  ), '{}'::uuid[]),
  updated_at = now()
  WHERE EXISTS (
    SELECT 1 FROM unnest(ag.object_ids) AS oid
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.master_objects mo
      JOIN public.projects p ON p.id = mo.project_id
      WHERE mo.id = oid
    )
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  action := 'sanitize_activity_groups_object_ids'; affected_rows := v_count; RETURN NEXT;

  UPDATE public.charge_groups cg
  SET object_ids = COALESCE((
    SELECT array_agg(mid ORDER BY ord)
    FROM unnest(cg.object_ids) WITH ORDINALITY AS t(mid, ord)
    WHERE EXISTS (
      SELECT 1
      FROM public.master_objects mo
      JOIN public.projects p ON p.id = mo.project_id
      WHERE mo.id = mid
    )
  ), '{}'::uuid[]),
  updated_at = now()
  WHERE EXISTS (
    SELECT 1 FROM unnest(cg.object_ids) AS oid
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.master_objects mo
      JOIN public.projects p ON p.id = mo.project_id
      WHERE mo.id = oid
    )
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  action := 'sanitize_charge_groups_object_ids'; affected_rows := v_count; RETURN NEXT;

  UPDATE public.profiles pr
  SET
    project_ids = COALESCE((
      SELECT array_agg(pid ORDER BY ord)
      FROM unnest(pr.project_ids) WITH ORDINALITY AS t(pid, ord)
      WHERE EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pid)
    ), '{}'::uuid[]),
    project_order = COALESCE((
      SELECT array_agg(pid ORDER BY ord)
      FROM unnest(pr.project_order) WITH ORDINALITY AS t(pid, ord)
      WHERE EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pid)
    ), '{}'::uuid[])
  WHERE EXISTS (
    SELECT 1 FROM unnest(pr.project_ids) AS pid
    WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pid)
  )
  OR EXISTS (
    SELECT 1 FROM unnest(pr.project_order) AS pid
    WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pid)
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  action := 'sanitize_profiles_project_arrays'; affected_rows := v_count; RETURN NEXT;

  UPDATE public.projects p
  SET company_id = NULL
  WHERE p.company_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = p.company_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  action := 'nullify_projects_invalid_company'; affected_rows := v_count; RETURN NEXT;

  DELETE FROM public.companies c
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.company_id = c.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  action := 'delete_companies_without_project'; affected_rows := v_count; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_orphan_project_records() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_orphan_project_records() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_orphan_project_records() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_project_records() TO service_role;

-- Execução única na migração
SELECT * FROM public.cleanup_orphan_project_records();
