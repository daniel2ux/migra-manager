-- Corrige criação de usuário: triggers de proteção bloqueavam inserts/updates
-- feitos pelo service role (auth.uid() NULL) e pelo handle_new_user (SECURITY DEFINER).

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

  -- Service role / bootstrap (handle_new_user): sem JWT de usuário
  IF auth.uid() IS NULL THEN
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

  -- Service role: operações administrativas via API server-side
  IF auth.uid() IS NULL THEN
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

REVOKE ALL ON FUNCTION private.protect_profile_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.protect_profile_privileged_fields() FROM PUBLIC;
