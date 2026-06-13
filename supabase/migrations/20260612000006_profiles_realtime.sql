-- Lista de usuários (profiles) deve atualizar em tempo real após cadastro/edição.
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
