-- Perfis de acesso: descrição, flag de sistema, vínculo opcional em profiles, seed de permissões.

ALTER TABLE public.access_profiles
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_access_profiles_name_upper
  ON public.access_profiles (UPPER(TRIM(name)));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_profile_id UUID REFERENCES public.access_profiles(id) ON DELETE SET NULL;

-- MASTER: acesso total
INSERT INTO public.access_profiles (name, description, permissions, is_system)
VALUES (
  'MASTER',
  'Acesso total: permissões de ADMIN + utilitários, backup, usuários e configuração de sistema.',
  ARRAY[
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.lock',
    'mocks.view', 'mocks.create', 'mocks.edit', 'mocks.delete', 'mocks.lock', 'mocks.clone', 'mocks.restart',
    'objects.view', 'objects.create', 'objects.edit', 'objects.delete', 'objects.reset',
    'objects.import', 'objects.export', 'objects.quick_edit',
    'master_catalog.view', 'master_catalog.edit', 'master_catalog.delete',
    'reports.view', 'logs.view', 'logs.import', 'logs.clear',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'users.change_role', 'users.reset_password', 'users.block',
    'config.activity_groups', 'config.charge_groups', 'config.emails',
    'config.system', 'config.smtp', 'config.file_aliases',
    'access_profiles.manage',
    'backup.list', 'backup.create', 'backup.restore', 'backup.delete',
    'utilities.clone_project', 'utilities.clone_mock', 'utilities.clean_catalog', 'utilities.clean_logs'
  ]::TEXT[],
  true
)
ON CONFLICT ((UPPER(TRIM(name)))) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = true,
  updated_at = now();

-- ADMIN: visualização + edição; exclusões desabilitadas por padrão
INSERT INTO public.access_profiles (name, description, permissions, is_system)
VALUES (
  'ADMIN',
  'Governança: visualização e edição. Exclusões e ações destrutivas exigem habilitação explícita neste perfil.',
  ARRAY[
    'projects.view', 'projects.create', 'projects.edit', 'projects.lock',
    'mocks.view', 'mocks.create', 'mocks.edit', 'mocks.lock', 'mocks.clone', 'mocks.restart',
    'objects.view', 'objects.create', 'objects.edit', 'objects.import', 'objects.export', 'objects.quick_edit',
    'master_catalog.view', 'master_catalog.edit',
    'reports.view', 'logs.view', 'logs.import',
    'users.view', 'users.edit',
    'config.activity_groups', 'config.charge_groups', 'config.emails',
    'backup.list', 'utilities.clone_project', 'utilities.clone_mock'
  ]::TEXT[],
  true
)
ON CONFLICT ((UPPER(TRIM(name)))) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = true,
  updated_at = now();

-- ESPECIALISTA: leitura + ações técnicas limitadas
INSERT INTO public.access_profiles (name, description, permissions, is_system)
VALUES (
  'ESPECIALISTA',
  'Consultor técnico: visualização ampliada e edição rápida de objetos, sem gestão estrutural.',
  ARRAY[
    'projects.view', 'mocks.view', 'objects.view', 'master_catalog.view',
    'reports.view', 'logs.view', 'logs.import',
    'objects.quick_edit', 'objects.import'
  ]::TEXT[],
  true
)
ON CONFLICT ((UPPER(TRIM(name)))) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = true,
  updated_at = now();

-- MEMBRO (USER): somente visualização
INSERT INTO public.access_profiles (name, description, permissions, is_system)
VALUES (
  'MEMBRO',
  'Usuário operacional: acesso de visualização aos recursos do projeto.',
  ARRAY[
    'projects.view', 'mocks.view', 'objects.view', 'master_catalog.view',
    'reports.view', 'logs.view'
  ]::TEXT[],
  true
)
ON CONFLICT ((UPPER(TRIM(name)))) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = true,
  updated_at = now();
