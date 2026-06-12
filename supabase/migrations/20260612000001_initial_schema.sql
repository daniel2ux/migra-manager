-- Migra Manager — schema inicial Supabase

CREATE TYPE public.user_role AS ENUM ('master', 'admin', 'especialista', 'membro');
CREATE TYPE public.migration_object_status AS ENUM ('PENDENTE', 'CARGA_EM_ANDAMENTO', 'CARGA_CONCLUIDA');
CREATE TYPE public.migration_log_status AS ENUM ('ERROR', 'WARN', 'INFO', 'OK');
CREATE TYPE public.master_object_status AS ENUM ('ATIVO', 'INATIVO', 'LEGACY');
CREATE TYPE public.master_object_type AS ENUM ('MASTER', 'TRANSACTIONAL', 'TECHNICAL', 'SCRIPT');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'membro',
  is_master BOOLEAN NOT NULL DEFAULT false,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  position TEXT,
  migrador_name TEXT,
  from_email TEXT,
  photo_url TEXT,
  notes TEXT,
  email_signatures JSONB NOT NULL DEFAULT '[]'::jsonb,
  project_ids UUID[] NOT NULL DEFAULT '{}',
  project_order UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  company TEXT DEFAULT '',
  owner_id UUID REFERENCES public.profiles(id),
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by_master BOOLEAN NOT NULL DEFAULT false,
  locked_by_uid UUID,
  locked_by_name TEXT,
  member_uids UUID[] NOT NULL DEFAULT '{}',
  member_profiles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE public.mocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  explanatory_text TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  is_locked BOOLEAN NOT NULL DEFAULT false,
  is_loaded BOOLEAN DEFAULT false,
  locked_by_master BOOLEAN DEFAULT false,
  locked_by_uid UUID,
  locked_by_name TEXT,
  is_running BOOLEAN DEFAULT false,
  quantity_existing_objects INTEGER NOT NULL DEFAULT 0,
  status TEXT,
  data_inicio_carga TEXT,
  data_fim_carga TEXT,
  load_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mocks_project_id ON public.mocks(project_id);
CREATE INDEX idx_mocks_slug ON public.mocks(project_id, slug);

CREATE TABLE public.master_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type public.master_object_type DEFAULT 'MASTER',
  status public.master_object_status DEFAULT 'ATIVO',
  charge_group TEXT,
  charge_order TEXT,
  parallel_order TEXT,
  is_parallel BOOLEAN DEFAULT false,
  dependency_ids UUID[] NOT NULL DEFAULT '{}',
  external_dependencies TEXT[] NOT NULL DEFAULT '{}',
  owner_id UUID,
  activity_group_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.migration_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id UUID NOT NULL REFERENCES public.mocks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  master_object_id UUID REFERENCES public.master_objects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  charge_group TEXT,
  charge_order TEXT,
  initial_charge_start_time TEXT,
  initial_charge_end_time TEXT,
  charge_start_time TEXT DEFAULT '',
  charge_end_time TEXT DEFAULT '',
  target_records_count INTEGER NOT NULL DEFAULT 0,
  processed_records_count INTEGER NOT NULL DEFAULT 0,
  migrated_records_count INTEGER NOT NULL DEFAULT 0,
  successful_records_count INTEGER NOT NULL DEFAULT 0,
  error_records_count INTEGER NOT NULL DEFAULT 0,
  current_charge_duration_ms INTEGER NOT NULL DEFAULT 0,
  previous_migrated_records_count INTEGER NOT NULL DEFAULT 0,
  previous_charge_duration_ms INTEGER NOT NULL DEFAULT 0,
  dependency_ids UUID[] NOT NULL DEFAULT '{}',
  owner_id UUID,
  is_parallel BOOLEAN DEFAULT false,
  parallel_order TEXT,
  status public.migration_object_status DEFAULT 'PENDENTE',
  has_tech_logs BOOLEAN DEFAULT false,
  load_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_migration_objects_project_mock ON public.migration_objects(project_id, mock_id);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  object_id UUID REFERENCES public.migration_objects(id) ON DELETE CASCADE,
  object_name TEXT,
  text TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_project_object ON public.comments(project_id, object_id);

CREATE TABLE public.activity_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#0ea5e9',
  display_order INTEGER NOT NULL DEFAULT 0,
  object_ids UUID[] NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  group_ids UUID[] NOT NULL DEFAULT '{}',
  created_by_uid UUID,
  updated_by_uid UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by_uid UUID,
  updated_by_uid UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.access_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.file_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_name TEXT NOT NULL,
  file_name_patterns TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.edit_locks (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_online BOOLEAN NOT NULL DEFAULT true,
  user_agent TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object TEXT NOT NULL,
  mock TEXT NOT NULL,
  filename TEXT NOT NULL,
  seq INTEGER NOT NULL DEFAULT 0,
  status public.migration_log_status NOT NULL DEFAULT 'INFO',
  info_key TEXT DEFAULT '',
  error_id TEXT,
  error_number TEXT,
  message TEXT NOT NULL DEFAULT '',
  username TEXT DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_file_name TEXT DEFAULT '',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  old_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_uid UUID,
  updated_by_name TEXT
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
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
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER mocks_updated_at BEFORE UPDATE ON public.mocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER master_objects_updated_at BEFORE UPDATE ON public.master_objects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER migration_objects_updated_at BEFORE UPDATE ON public.migration_objects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
