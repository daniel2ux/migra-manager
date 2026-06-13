-- Atualiza a lista de objetos mestre na UI após insert/update/delete
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_objects;
