-- Remove tabela legada project_members (app usa member_uids + profiles.project_ids)
-- Remove coluna ociosa mocks.is_loaded (status/contadores substituem)

CREATE OR REPLACE FUNCTION private.has_project_access(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_admin_or_master()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND p_project_id = ANY (project_ids)
    )
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = p_project_id AND auth.uid() = ANY (member_uids)
    );
$$;

DROP POLICY IF EXISTS project_members_select ON public.project_members;
DROP POLICY IF EXISTS project_members_write ON public.project_members;
DROP TABLE IF EXISTS public.project_members;

ALTER TABLE public.mocks
  DROP COLUMN IF EXISTS is_loaded;
