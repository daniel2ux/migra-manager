-- Função controlada para backfill de project_id em objetos mestre legados

CREATE OR REPLACE FUNCTION public.backfill_master_objects_project_id(
  p_project_id UUID,
  p_apply BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count BIGINT;
  updated_count INTEGER;
  project_name TEXT;
  company_name TEXT;
BEGIN
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'backfill_master_objects: project_id é obrigatório';
  END IF;

  SELECT p.name, c.name
  INTO project_name, company_name
  FROM public.projects p
  LEFT JOIN public.companies c ON c.id = p.company_id
  WHERE p.id = p_project_id;

  IF project_name IS NULL THEN
    RAISE EXCEPTION 'backfill_master_objects: projeto não encontrado (%)', p_project_id;
  END IF;

  IF company_name IS NULL THEN
    RAISE EXCEPTION 'backfill_master_objects: projeto % não possui empresa (company_id)', project_name;
  END IF;

  SELECT COUNT(*) INTO pending_count
  FROM public.master_objects
  WHERE project_id IS NULL;

  IF NOT p_apply THEN
    RETURN jsonb_build_object(
      'dry_run', true,
      'project_id', p_project_id,
      'project_name', project_name,
      'company_name', company_name,
      'would_update', pending_count
    );
  END IF;

  ALTER TABLE public.master_objects DISABLE TRIGGER master_objects_protect_project_scope;

  UPDATE public.master_objects
  SET project_id = p_project_id,
      updated_at = now()
  WHERE project_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  ALTER TABLE public.master_objects ENABLE TRIGGER master_objects_protect_project_scope;

  RETURN jsonb_build_object(
    'dry_run', false,
    'project_id', p_project_id,
    'project_name', project_name,
    'company_name', company_name,
    'updated', updated_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_master_objects_project_id(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_master_objects_project_id(UUID, BOOLEAN) TO service_role;
