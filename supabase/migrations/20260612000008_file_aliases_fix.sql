-- file_aliases: updated_at para edições + realtime para atualizar a lista na UI
ALTER TABLE public.file_aliases
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER PUBLICATION supabase_realtime ADD TABLE public.file_aliases;
