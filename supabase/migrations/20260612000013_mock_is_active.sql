-- Soft-delete de mocks: is_active = false oculta da operação sem excluir dados

ALTER TABLE public.mocks
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_mocks_project_active
  ON public.mocks(project_id, is_active);
