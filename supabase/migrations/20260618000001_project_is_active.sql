-- Soft-delete de projetos: is_active = false oculta da operação sem excluir dados

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_projects_is_active
  ON public.projects (is_active);
