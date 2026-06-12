-- RLS policies

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_user_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT auth.uid()::text = current_setting('app.superadmin_uid', true);
$$;

CREATE OR REPLACE FUNCTION private.user_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_master()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_master OR role = 'master' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION private.is_admin_or_master()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_master OR role IN ('master', 'admin') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION private.has_project_access(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.is_admin_or_master()
    OR p_project_id = ANY (SELECT project_ids FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = p_project_id AND user_id = auth.uid()
    )
    OR auth.uid() = ANY (SELECT member_uids FROM public.projects WHERE id = p_project_id);
$$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (private.is_admin_or_master() OR id = auth.uid())
  WITH CHECK (private.is_admin_or_master() OR id = auth.uid());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (private.is_admin_or_master() OR id = auth.uid());

-- Projects
CREATE POLICY projects_select ON public.projects FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(id));
CREATE POLICY projects_write ON public.projects FOR ALL TO authenticated
  USING (private.is_admin_or_master())
  WITH CHECK (private.is_admin_or_master());

-- Project members
CREATE POLICY project_members_select ON public.project_members FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY project_members_write ON public.project_members FOR ALL TO authenticated
  USING (private.is_admin_or_master())
  WITH CHECK (private.is_admin_or_master());

-- Mocks
CREATE POLICY mocks_select ON public.mocks FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY mocks_write ON public.mocks FOR ALL TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id))
  WITH CHECK (private.is_admin_or_master() OR private.has_project_access(project_id));

-- Master objects (global catalog)
CREATE POLICY master_objects_select ON public.master_objects FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY master_objects_write ON public.master_objects FOR ALL TO authenticated
  USING (private.is_admin_or_master())
  WITH CHECK (private.is_admin_or_master());

-- Migration objects
CREATE POLICY migration_objects_select ON public.migration_objects FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY migration_objects_write ON public.migration_objects FOR ALL TO authenticated
  USING (private.is_admin_or_master() OR private.has_project_access(project_id))
  WITH CHECK (private.is_admin_or_master() OR private.has_project_access(project_id));

-- Comments
CREATE POLICY comments_select ON public.comments FOR SELECT TO authenticated
  USING (project_id IS NULL OR private.is_admin_or_master() OR private.has_project_access(project_id));
CREATE POLICY comments_write ON public.comments FOR ALL TO authenticated
  USING (project_id IS NULL OR private.is_admin_or_master() OR private.has_project_access(project_id))
  WITH CHECK (project_id IS NULL OR private.is_admin_or_master() OR private.has_project_access(project_id));

-- Config tables (admin only write)
CREATE POLICY activity_groups_select ON public.activity_groups FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY activity_groups_write ON public.activity_groups FOR ALL TO authenticated USING (private.is_admin_or_master()) WITH CHECK (private.is_admin_or_master());

CREATE POLICY email_contacts_select ON public.email_contacts FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY email_contacts_write ON public.email_contacts FOR ALL TO authenticated USING (private.is_admin_or_master()) WITH CHECK (private.is_admin_or_master());

CREATE POLICY email_groups_select ON public.email_groups FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY email_groups_write ON public.email_groups FOR ALL TO authenticated USING (private.is_admin_or_master()) WITH CHECK (private.is_admin_or_master());

CREATE POLICY access_profiles_select ON public.access_profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY access_profiles_write ON public.access_profiles FOR ALL TO authenticated USING (private.is_admin_or_master()) WITH CHECK (private.is_admin_or_master());

CREATE POLICY file_aliases_select ON public.file_aliases FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY file_aliases_write ON public.file_aliases FOR ALL TO authenticated USING (private.is_admin_or_master()) WITH CHECK (private.is_admin_or_master());

-- Edit locks & sessions
CREATE POLICY edit_locks_all ON public.edit_locks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY sessions_all ON public.sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Logs
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated USING (private.is_admin_or_master());
CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY migration_logs_select ON public.migration_logs FOR SELECT TO authenticated
  USING (private.is_admin_or_master() OR (project_id IS NOT NULL AND private.has_project_access(project_id)));
CREATE POLICY migration_logs_write ON public.migration_logs FOR ALL TO authenticated
  USING (private.is_admin_or_master() OR (project_id IS NOT NULL AND private.has_project_access(project_id)))
  WITH CHECK (private.is_admin_or_master() OR (project_id IS NOT NULL AND private.has_project_access(project_id)));

CREATE POLICY app_config_select ON public.app_config FOR SELECT TO authenticated USING (private.is_admin_or_master());
CREATE POLICY app_config_write ON public.app_config FOR ALL TO authenticated USING (private.is_master()) WITH CHECK (private.is_master());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.migration_objects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.edit_locks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
