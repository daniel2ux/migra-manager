-- Status de execução do projeto + proteção quando bloqueado

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS execution_status TEXT NOT NULL DEFAULT 'ATIVO'
  CONSTRAINT projects_execution_status_check
    CHECK (execution_status IN ('ATIVO', 'EM_EXECUCAO', 'ENCERRADO'));

CREATE OR REPLACE FUNCTION private.protect_project_locked_execution_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_locked AND NEW.execution_status IS DISTINCT FROM OLD.execution_status THEN
    RAISE EXCEPTION 'projects_update_denied: não é permitido alterar status de projeto bloqueado';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_project_locked_execution_status() FROM PUBLIC;

DROP TRIGGER IF EXISTS projects_protect_locked_execution_status ON public.projects;
CREATE TRIGGER projects_protect_locked_execution_status
  BEFORE UPDATE OF execution_status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_project_locked_execution_status();
