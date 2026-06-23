-- Alinha cleanup_orphan_project_records() com audit_orphan_project_records():
-- object_ids em activity_groups/charge_groups devem referenciar master_objects
-- do mesmo project_id do grupo (não apenas existir em qualquer projeto).

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
      WHERE mo.id = mid AND mo.project_id = ag.project_id
    )
  ), '{}'::uuid[]),
  updated_at = now()
  WHERE EXISTS (
    SELECT 1 FROM unnest(ag.object_ids) AS oid
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.master_objects mo
      WHERE mo.id = oid AND mo.project_id = ag.project_id
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
      WHERE mo.id = mid AND mo.project_id = cg.project_id
    )
  ), '{}'::uuid[]),
  updated_at = now()
  WHERE EXISTS (
    SELECT 1 FROM unnest(cg.object_ids) AS oid
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.master_objects mo
      WHERE mo.id = oid AND mo.project_id = cg.project_id
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
