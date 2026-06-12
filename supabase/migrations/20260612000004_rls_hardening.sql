-- RLS hardening: edit_locks, sessions, handle_new_user, private helpers, avatars bucket

-- Fix search_path on private helpers flagged by security advisor
CREATE OR REPLACE FUNCTION private.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT auth.uid()::text = current_setting('app.superadmin_uid', true);
$$;

-- Move profile bootstrap off public API surface
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_new_user();

-- Default de expiração alinhado ao TTL de 5 min do use-edit-lock
ALTER TABLE public.edit_locks
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '5 minutes');

-- edit_locks: leitura para todos autenticados; escrita só com user_id = auth.uid()
DROP POLICY IF EXISTS edit_locks_all ON public.edit_locks;

CREATE POLICY edit_locks_select ON public.edit_locks
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY edit_locks_insert ON public.edit_locks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE aberto a qualquer autenticado (permite force-lock); WITH CHECK garante user_id próprio
CREATE POLICY edit_locks_update ON public.edit_locks
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY edit_locks_delete ON public.edit_locks
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR expires_at < now()
    OR private.is_admin_or_master()
  );

-- sessions: cada usuário gerencia apenas a própria sessão; admins veem todas
DROP POLICY IF EXISTS sessions_all ON public.sessions;

CREATE POLICY sessions_select ON public.sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin_or_master());

CREATE POLICY sessions_insert ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY sessions_update ON public.sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY sessions_delete ON public.sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.is_admin_or_master());

-- Avatars: bucket não-público evita listagem anônima; leitura por objeto ainda permitida
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

CREATE POLICY storage_avatars_anon_select ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'avatars');
