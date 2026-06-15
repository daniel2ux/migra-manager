-- Soft-disable de objetos na mock: is_active = false exclui da operação sem apagar dados

ALTER TABLE public.migration_objects
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_migration_objects_mock_active
  ON public.migration_objects(mock_id, is_active);
