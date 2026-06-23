-- Isolamento de dados por projeto (e mock onde aplicável).

-- ── Colunas project_id ───────────────────────────────────────────────────────

ALTER TABLE public.activity_groups
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.charge_groups
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.email_contacts
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.email_groups
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.file_aliases
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.migration_logs
  ADD COLUMN IF NOT EXISTS mock_id UUID REFERENCES public.mocks(id) ON DELETE CASCADE;

-- ── Backfill project_id ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.infer_project_from_object_ids(p_object_ids UUID[])
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT mo.project_id
  FROM unnest(COALESCE(p_object_ids, '{}'::uuid[])) AS oid
  JOIN public.master_objects mo ON mo.id = oid
  WHERE mo.project_id IS NOT NULL
  GROUP BY mo.project_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.default_project_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.projects
  WHERE COALESCE(is_active, true)
  ORDER BY created_at
  LIMIT 1;
$$;

UPDATE public.activity_groups ag
SET project_id = COALESCE(
  private.infer_project_from_object_ids(ag.object_ids),
  private.default_project_id()
)
WHERE ag.project_id IS NULL;

UPDATE public.charge_groups cg
SET project_id = COALESCE(
  private.infer_project_from_object_ids(cg.object_ids),
  private.default_project_id()
)
WHERE cg.project_id IS NULL;

UPDATE public.email_groups eg
SET project_id = private.default_project_id()
WHERE eg.project_id IS NULL;

UPDATE public.email_contacts ec
SET project_id = COALESCE(
  (
    SELECT eg.project_id
    FROM unnest(COALESCE(ec.group_ids, '{}'::uuid[])) AS gid
    JOIN public.email_groups eg ON eg.id = gid
    WHERE eg.project_id IS NOT NULL
    LIMIT 1
  ),
  private.default_project_id()
)
WHERE ec.project_id IS NULL;

UPDATE public.file_aliases fa
SET project_id = private.default_project_id()
WHERE fa.project_id IS NULL;

UPDATE public.audit_logs al
SET project_id = NULLIF(al.details->>'project_id', '')::uuid
WHERE al.project_id IS NULL
  AND al.details ? 'project_id'
  AND NULLIF(al.details->>'project_id', '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE public.comments c
SET project_id = mo.project_id
FROM public.migration_objects mo
WHERE c.project_id IS NULL
  AND c.object_id = mo.id;

DELETE FROM public.comments
WHERE project_id IS NULL;

UPDATE public.master_objects mo
SET project_id = private.default_project_id()
WHERE mo.project_id IS NULL;

UPDATE public.profiles pr
SET primary_project_id = pr.project_ids[1]
WHERE pr.primary_project_id IS NULL
  AND COALESCE(array_length(pr.project_ids, 1), 0) > 0;

UPDATE public.profiles pr
SET primary_project_id = (
  SELECT p.id
  FROM public.projects p
  WHERE pr.id = ANY (p.member_uids)
  ORDER BY p.created_at
  LIMIT 1
)
WHERE pr.primary_project_id IS NULL;

-- migration_logs: mock_id a partir da coluna legada `mock`
UPDATE public.migration_logs ml
SET mock_id = ml.mock::uuid
WHERE ml.mock_id IS NULL
  AND ml.mock ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (SELECT 1 FROM public.mocks m WHERE m.id = ml.mock::uuid);

UPDATE public.migration_logs ml
SET mock_id = m.id
FROM public.mocks m
WHERE ml.mock_id IS NULL
  AND ml.project_id IS NOT NULL
  AND m.project_id = ml.project_id
  AND (
    UPPER(TRIM(m.name)) = UPPER(TRIM(ml.mock))
    OR COALESCE(m.slug, '') = TRIM(ml.mock)
  );

UPDATE public.migration_logs ml
SET project_id = m.project_id
FROM public.mocks m
WHERE ml.project_id IS NULL
  AND ml.mock_id = m.id;

DELETE FROM public.migration_logs
WHERE project_id IS NULL OR mock_id IS NULL;

-- ── NOT NULL e índices ───────────────────────────────────────────────────────

ALTER TABLE public.activity_groups
  ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.charge_groups
  ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.email_contacts
  ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.email_groups
  ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.file_aliases
  ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.comments
  ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.master_objects
  ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.migration_logs
  ALTER COLUMN project_id SET NOT NULL,
  ALTER COLUMN mock_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_groups_project_id
  ON public.activity_groups (project_id);
CREATE INDEX IF NOT EXISTS idx_charge_groups_project_id
  ON public.charge_groups (project_id);
CREATE INDEX IF NOT EXISTS idx_email_contacts_project_id
  ON public.email_contacts (project_id);
CREATE INDEX IF NOT EXISTS idx_email_groups_project_id
  ON public.email_groups (project_id);
CREATE INDEX IF NOT EXISTS idx_file_aliases_project_id
  ON public.file_aliases (project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id
  ON public.audit_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_profiles_primary_project_id
  ON public.profiles (primary_project_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_project_mock
  ON public.migration_logs (project_id, mock_id);

DROP INDEX IF EXISTS public.idx_charge_groups_name_upper;
CREATE UNIQUE INDEX idx_charge_groups_project_name_upper
  ON public.charge_groups (project_id, upper(trim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_groups_project_name_upper
  ON public.activity_groups (project_id, upper(trim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_groups_project_name_upper
  ON public.email_groups (project_id, upper(trim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_file_aliases_project_object_name
  ON public.file_aliases (project_id, upper(trim(object_name)));

-- ── RLS escopado por projeto ─────────────────────────────────────────────────

DROP POLICY IF EXISTS activity_groups_select ON public.activity_groups;
DROP POLICY IF EXISTS activity_groups_write ON public.activity_groups;
CREATE POLICY activity_groups_select ON public.activity_groups
  FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY activity_groups_write ON public.activity_groups
  FOR ALL TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id))
  WITH CHECK (private.is_admin_or_master() OR private.has_project_access(project_id));

DROP POLICY IF EXISTS charge_groups_select ON public.charge_groups;
DROP POLICY IF EXISTS charge_groups_write ON public.charge_groups;
CREATE POLICY charge_groups_select ON public.charge_groups
  FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY charge_groups_write ON public.charge_groups
  FOR ALL TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id))
  WITH CHECK (private.is_admin_or_master() OR private.has_project_access(project_id));

DROP POLICY IF EXISTS email_contacts_select ON public.email_contacts;
DROP POLICY IF EXISTS email_contacts_write ON public.email_contacts;
CREATE POLICY email_contacts_select ON public.email_contacts
  FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY email_contacts_write ON public.email_contacts
  FOR ALL TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id))
  WITH CHECK (private.is_admin_or_master() OR private.has_project_access(project_id));

DROP POLICY IF EXISTS email_groups_select ON public.email_groups;
DROP POLICY IF EXISTS email_groups_write ON public.email_groups;
CREATE POLICY email_groups_select ON public.email_groups
  FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY email_groups_write ON public.email_groups
  FOR ALL TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id))
  WITH CHECK (private.is_admin_or_master() OR private.has_project_access(project_id));

DROP POLICY IF EXISTS file_aliases_select ON public.file_aliases;
DROP POLICY IF EXISTS file_aliases_write ON public.file_aliases;
CREATE POLICY file_aliases_select ON public.file_aliases
  FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY file_aliases_write ON public.file_aliases
  FOR ALL TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id))
  WITH CHECK (private.is_admin_or_master() OR private.has_project_access(project_id));

DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    private.is_admin_or_master()
    OR (project_id IS NOT NULL AND private.has_project_access(project_id))
  );
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (project_id IS NULL OR private.is_admin_or_master() OR private.has_project_access(project_id))
  );

DROP POLICY IF EXISTS comments_select ON public.comments;
DROP POLICY IF EXISTS comments_write ON public.comments;
CREATE POLICY comments_select ON public.comments
  FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY comments_write ON public.comments
  FOR ALL TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id))
  WITH CHECK (private.is_admin_or_master() OR private.has_project_access(project_id));

DROP POLICY IF EXISTS migration_logs_select ON public.migration_logs;
DROP POLICY IF EXISTS migration_logs_write ON public.migration_logs;
CREATE POLICY migration_logs_select ON public.migration_logs
  FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY migration_logs_write ON public.migration_logs
  FOR ALL TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id))
  WITH CHECK (private.is_admin_or_master() OR private.has_project_access(project_id));

-- ── Triggers: project_id imutável após insert ────────────────────────────────

CREATE OR REPLACE FUNCTION private.protect_row_project_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.project_id IS NULL THEN
      RAISE EXCEPTION '%: project_id é obrigatório', TG_TABLE_NAME;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      RAISE EXCEPTION '%: project_id não pode ser alterado', TG_TABLE_NAME;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_row_project_scope() FROM PUBLIC;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'activity_groups',
    'charge_groups',
    'email_contacts',
    'email_groups',
    'file_aliases'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS protect_project_scope ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER protect_project_scope BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.protect_row_project_scope()',
      t
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION private.protect_migration_log_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.project_id IS NULL OR NEW.mock_id IS NULL THEN
      RAISE EXCEPTION 'migration_logs: project_id e mock_id são obrigatórios';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.mocks m
      WHERE m.id = NEW.mock_id AND m.project_id = NEW.project_id
    ) THEN
      RAISE EXCEPTION 'migration_logs: mock não pertence ao projeto informado';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.mock_id IS DISTINCT FROM OLD.mock_id THEN
      RAISE EXCEPTION 'migration_logs: project_id e mock_id não podem ser alterados';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_migration_log_scope() FROM PUBLIC;

DROP TRIGGER IF EXISTS migration_logs_protect_scope ON public.migration_logs;
CREATE TRIGGER migration_logs_protect_scope
  BEFORE INSERT OR UPDATE ON public.migration_logs
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_migration_log_scope();

-- ── Auditoria de órfãos (estende função existente) ───────────────────────────

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
  SELECT 'activity_groups_invalid_project', COUNT(*)::bigint
  FROM public.activity_groups ag
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = ag.project_id)
  UNION ALL
  SELECT 'charge_groups_invalid_project', COUNT(*)::bigint
  FROM public.charge_groups cg
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = cg.project_id)
  UNION ALL
  SELECT 'email_groups_invalid_project', COUNT(*)::bigint
  FROM public.email_groups eg
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = eg.project_id)
  UNION ALL
  SELECT 'email_contacts_invalid_project', COUNT(*)::bigint
  FROM public.email_contacts ec
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = ec.project_id)
  UNION ALL
  SELECT 'file_aliases_invalid_project', COUNT(*)::bigint
  FROM public.file_aliases fa
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = fa.project_id)
  UNION ALL
  SELECT 'audit_logs_invalid_project', COUNT(*)::bigint
  FROM public.audit_logs al
  WHERE al.project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = al.project_id)
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
  SELECT 'migration_logs_invalid_project', COUNT(*)::bigint
  FROM public.migration_logs ml
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = ml.project_id)
  UNION ALL
  SELECT 'migration_logs_invalid_mock', COUNT(*)::bigint
  FROM public.migration_logs ml
  WHERE NOT EXISTS (SELECT 1 FROM public.mocks m WHERE m.id = ml.mock_id)
  UNION ALL
  SELECT 'migration_logs_project_mock_mismatch', COUNT(*)::bigint
  FROM public.migration_logs ml
  JOIN public.mocks m ON m.id = ml.mock_id
  WHERE ml.project_id IS DISTINCT FROM m.project_id
  UNION ALL
  SELECT 'comments_invalid_project', COUNT(*)::bigint
  FROM public.comments c
  WHERE NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = c.project_id)
  UNION ALL
  SELECT 'comments_orphan_object', COUNT(*)::bigint
  FROM public.comments c
  WHERE c.object_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.migration_objects mo WHERE mo.id = c.object_id)
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
  SELECT 'profiles_invalid_primary_project', COUNT(*)::bigint
  FROM public.profiles pr
  WHERE pr.primary_project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pr.primary_project_id)
  UNION ALL
  SELECT 'activity_groups_stale_object_ids', COUNT(*)::bigint
  FROM public.activity_groups ag
  WHERE EXISTS (
    SELECT 1 FROM unnest(ag.object_ids) AS oid
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.master_objects mo
      WHERE mo.id = oid AND mo.project_id = ag.project_id
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
      WHERE mo.id = oid AND mo.project_id = cg.project_id
    )
  );
$$;

-- RPC de contagem por mock: usar mock_id em migration_logs
CREATE OR REPLACE FUNCTION public.count_mock_related_rows(
  p_project_id UUID,
  p_mock_ids UUID[]
)
RETURNS TABLE (
  mock_id UUID,
  object_count BIGINT,
  log_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mock_ids AS (
    SELECT unnest(p_mock_ids) AS id
  ),
  object_counts AS (
    SELECT mo.mock_id, COUNT(*)::bigint AS cnt
    FROM public.migration_objects mo
    WHERE mo.project_id = p_project_id
      AND mo.mock_id = ANY (p_mock_ids)
    GROUP BY mo.mock_id
  ),
  log_counts AS (
    SELECT ml.mock_id, COUNT(*)::bigint AS cnt
    FROM public.migration_logs ml
    WHERE ml.project_id = p_project_id
      AND ml.mock_id = ANY (p_mock_ids)
    GROUP BY ml.mock_id
  )
  SELECT
    m.id AS mock_id,
    COALESCE(oc.cnt, 0) AS object_count,
    COALESCE(lc.cnt, 0) AS log_count
  FROM mock_ids m
  LEFT JOIN object_counts oc ON oc.mock_id = m.id
  LEFT JOIN log_counts lc ON lc.mock_id = m.id;
$$;

REVOKE ALL ON FUNCTION public.count_mock_related_rows(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_mock_related_rows(UUID, UUID[]) TO service_role;
