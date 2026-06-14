-- Security hardening: profile privilege escalation, write scope for mocks/objects

-- ── profiles: impedir auto-elevação de privilégios ───────────────────────────

CREATE OR REPLACE FUNCTION private.protect_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.is_admin_or_master() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'profiles_insert_denied: só é permitido inserir o próprio perfil';
  END IF;

  NEW.role := 'membro';
  NEW.is_master := false;
  NEW.is_disabled := false;
  NEW.must_change_password := COALESCE(NEW.must_change_password, false);
  NEW.project_ids := '{}'::uuid[];

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_profile_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS profiles_protect_insert ON public.profiles;
CREATE TRIGGER profiles_protect_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_profile_insert();

CREATE OR REPLACE FUNCTION private.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.is_admin_or_master() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'profiles_update_denied: só é permitido atualizar o próprio perfil';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles_update_denied: alteração de role não permitida';
  END IF;
  IF NEW.is_master IS DISTINCT FROM OLD.is_master THEN
    RAISE EXCEPTION 'profiles_update_denied: alteração de is_master não permitida';
  END IF;
  IF NEW.is_disabled IS DISTINCT FROM OLD.is_disabled THEN
    RAISE EXCEPTION 'profiles_update_denied: alteração de is_disabled não permitida';
  END IF;
  IF NEW.project_ids IS DISTINCT FROM OLD.project_ids THEN
    RAISE EXCEPTION 'profiles_update_denied: alteração de project_ids não permitida';
  END IF;
  IF NEW.must_change_password IS DISTINCT FROM OLD.must_change_password THEN
    RAISE EXCEPTION 'profiles_update_denied: alteração de must_change_password não permitida';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_profile_privileged_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS profiles_protect_privileged_fields ON public.profiles;
CREATE TRIGGER profiles_protect_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_profile_privileged_fields();

-- ── mocks / migration_objects: escrita restrita a admin/master (UI já exige) ─

DROP POLICY IF EXISTS mocks_write ON public.mocks;
CREATE POLICY mocks_write ON public.mocks
  FOR ALL TO authenticated
  USING (private.is_admin_or_master())
  WITH CHECK (private.is_admin_or_master());

DROP POLICY IF EXISTS migration_objects_write ON public.migration_objects;
CREATE POLICY migration_objects_write ON public.migration_objects
  FOR ALL TO authenticated
  USING (private.is_admin_or_master())
  WITH CHECK (private.is_admin_or_master());
