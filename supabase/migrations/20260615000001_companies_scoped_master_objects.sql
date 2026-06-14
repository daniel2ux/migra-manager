-- Empresas como entidade + catálogo mestre vinculado ao projeto

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name_upper
  ON public.companies (UPPER(TRIM(name)));

DROP TRIGGER IF EXISTS companies_updated_at ON public.companies;
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.master_objects
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_master_objects_project_id
  ON public.master_objects (project_id);

CREATE INDEX IF NOT EXISTS idx_projects_company_id
  ON public.projects (company_id);

-- Backfill empresas a partir do texto legado em projects.company
INSERT INTO public.companies (name)
SELECT DISTINCT UPPER(TRIM(p.company))
FROM public.projects p
WHERE TRIM(COALESCE(p.company, '')) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE UPPER(TRIM(c.name)) = UPPER(TRIM(p.company))
  );

UPDATE public.projects p
SET company_id = c.id
FROM public.companies c
WHERE p.company_id IS NULL
  AND TRIM(COALESCE(p.company, '')) <> ''
  AND UPPER(TRIM(c.name)) = UPPER(TRIM(p.company));

-- RLS: companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_select ON public.companies;
CREATE POLICY companies_select ON public.companies
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS companies_write ON public.companies;
CREATE POLICY companies_write ON public.companies
  FOR ALL TO authenticated
  USING (private.is_admin_or_master())
  WITH CHECK (private.is_admin_or_master());

-- RLS: master_objects escopado por projeto
DROP POLICY IF EXISTS master_objects_select ON public.master_objects;
CREATE POLICY master_objects_select ON public.master_objects
  FOR SELECT TO authenticated
  USING (
    private.is_admin_or_master()
    OR (
      project_id IS NOT NULL
      AND private.has_project_access(project_id)
    )
  );

DROP POLICY IF EXISTS master_objects_write ON public.master_objects;
CREATE POLICY master_objects_write ON public.master_objects
  FOR ALL TO authenticated
  USING (private.is_admin_or_master())
  WITH CHECK (private.is_admin_or_master());

-- INSERT: exige projeto com empresa cadastrada
CREATE OR REPLACE FUNCTION private.protect_master_object_project_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.project_id IS NULL THEN
      RAISE EXCEPTION 'master_objects_insert_denied: project_id é obrigatório';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = NEW.project_id
        AND company_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'master_objects_insert_denied: cadastre a empresa no projeto antes de incluir objetos';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      RAISE EXCEPTION 'master_objects_update_denied: project_id não pode ser alterado';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_master_object_project_scope() FROM PUBLIC;

DROP TRIGGER IF EXISTS master_objects_protect_project_scope ON public.master_objects;
CREATE TRIGGER master_objects_protect_project_scope
  BEFORE INSERT OR UPDATE ON public.master_objects
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_master_object_project_scope();
