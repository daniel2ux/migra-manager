-- Realtime para catálogo de e-mails (listas usam useCollection + postgres_changes)
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_contacts;
