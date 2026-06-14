/**
 * Permissões granulares por perfil de acesso.
 * Hierarquia: MEMBRO (visualização) → ADMIN (+ edição) → MASTER (+ exclusivos).
 */

export const PERMISSION_GROUPS = [
  {
    id: "projects",
    label: "Projetos",
    permissions: [
      { key: "projects.view", label: "Visualizar" },
      { key: "projects.create", label: "Criar" },
      { key: "projects.edit", label: "Editar" },
      { key: "projects.delete", label: "Excluir" },
      { key: "projects.lock", label: "Bloquear / desbloquear" },
    ],
  },
  {
    id: "mocks",
    label: "Mocks",
    permissions: [
      { key: "mocks.view", label: "Visualizar" },
      { key: "mocks.create", label: "Criar" },
      { key: "mocks.edit", label: "Editar" },
      { key: "mocks.delete", label: "Excluir" },
      { key: "mocks.lock", label: "Bloquear / desbloquear" },
      { key: "mocks.clone", label: "Clonar" },
      { key: "mocks.restart", label: "Reiniciar carga" },
    ],
  },
  {
    id: "objects",
    label: "Objetos de migração",
    permissions: [
      { key: "objects.view", label: "Visualizar" },
      { key: "objects.create", label: "Criar" },
      { key: "objects.edit", label: "Editar" },
      { key: "objects.delete", label: "Excluir" },
      { key: "objects.reset", label: "Reiniciar objeto" },
      { key: "objects.import", label: "Importar logs" },
      { key: "objects.export", label: "Exportar" },
      { key: "objects.quick_edit", label: "Edição rápida" },
    ],
  },
  {
    id: "catalog",
    label: "Catálogo mestre",
    permissions: [
      { key: "master_catalog.view", label: "Visualizar" },
      { key: "master_catalog.edit", label: "Editar" },
      { key: "master_catalog.delete", label: "Excluir do catálogo" },
    ],
  },
  {
    id: "reports",
    label: "Relatórios",
    permissions: [{ key: "reports.view", label: "Visualizar" }],
  },
  {
    id: "logs",
    label: "Logs",
    permissions: [
      { key: "logs.view", label: "Visualizar" },
      { key: "logs.import", label: "Importar" },
      { key: "logs.clear", label: "Limpar logs (master)" },
    ],
  },
  {
    id: "users",
    label: "Usuários",
    permissions: [
      { key: "users.view", label: "Visualizar" },
      { key: "users.create", label: "Criar" },
      { key: "users.edit", label: "Editar" },
      { key: "users.delete", label: "Excluir" },
      { key: "users.change_role", label: "Alterar perfil" },
      { key: "users.reset_password", label: "Resetar senha" },
      { key: "users.block", label: "Bloquear / desbloquear" },
    ],
  },
  {
    id: "config",
    label: "Configurações",
    permissions: [
      { key: "config.activity_groups", label: "Grupos de atividade" },
      { key: "config.charge_groups", label: "Grupos de objetos" },
      { key: "config.emails", label: "E-mails" },
      { key: "config.system", label: "Sistema (master)" },
      { key: "config.smtp", label: "SMTP (master)" },
      { key: "config.file_aliases", label: "Aliases de arquivo (master)" },
    ],
  },
  {
    id: "access_profiles",
    label: "Perfis de acesso",
    permissions: [{ key: "access_profiles.manage", label: "Gerenciar perfis" }],
  },
  {
    id: "backup",
    label: "Backup",
    permissions: [
      { key: "backup.list", label: "Listar / baixar" },
      { key: "backup.create", label: "Criar backup" },
      { key: "backup.restore", label: "Restaurar" },
      { key: "backup.delete", label: "Excluir backup" },
    ],
  },
  {
    id: "utilities",
    label: "Utilitários",
    permissions: [
      { key: "utilities.clone_project", label: "Clonar projeto" },
      { key: "utilities.clone_mock", label: "Clonar mock" },
      { key: "utilities.clean_catalog", label: "Limpar catálogo (master)" },
      { key: "utilities.clean_logs", label: "Limpar logs em lote (master)" },
    ],
  },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

const VIEW_PERMISSIONS: PermissionKey[] = [
  "projects.view",
  "mocks.view",
  "objects.view",
  "master_catalog.view",
  "reports.view",
  "logs.view",
];

const ADMIN_EDIT_PERMISSIONS: PermissionKey[] = [
  "projects.create",
  "projects.edit",
  "projects.lock",
  "mocks.create",
  "mocks.edit",
  "mocks.lock",
  "mocks.clone",
  "mocks.restart",
  "objects.create",
  "objects.edit",
  "objects.import",
  "objects.export",
  "objects.quick_edit",
  "master_catalog.edit",
  "users.view",
  "users.edit",
  "config.activity_groups",
  "config.charge_groups",
  "config.emails",
  "logs.import",
  "reports.view",
  "backup.list",
  "utilities.clone_project",
  "utilities.clone_mock",
];

/** Exclusões no perfil ADMIN — deletes e permissões exclusivas do Master. */
const ADMIN_DELETE_PERMISSIONS: PermissionKey[] = [
  "projects.delete",
  "mocks.delete",
  "objects.delete",
  "objects.reset",
  "users.delete",
  "master_catalog.delete",
];

const MASTER_EXCLUSIVE_PERMISSIONS: PermissionKey[] = [
  "users.create",
  "users.change_role",
  "users.reset_password",
  "users.block",
  "access_profiles.manage",
  "config.system",
  "config.smtp",
  "config.file_aliases",
  "backup.create",
  "backup.restore",
  "backup.delete",
  "logs.clear",
  "utilities.clean_catalog",
  "utilities.clean_logs",
];

function excludePermissions(
  keys: PermissionKey[],
  denied: Set<PermissionKey>,
): PermissionKey[] {
  return keys.filter((k) => !denied.has(k));
}

const ADMIN_DENIED_PERMISSIONS = new Set<PermissionKey>([
  ...ADMIN_DELETE_PERMISSIONS,
  ...MASTER_EXCLUSIVE_PERMISSIONS,
]);

export const SYSTEM_PROFILE_NAMES = ["MASTER", "ADMIN", "ESPECIALISTA", "MEMBRO"] as const;
export type SystemProfileName = (typeof SYSTEM_PROFILE_NAMES)[number];

export function roleToSystemProfileName(
  role?: string | null,
  isMasterFlag?: boolean,
): SystemProfileName {
  if (isMasterFlag || role?.toLowerCase() === "master") return "MASTER";
  if (role?.toLowerCase() === "admin") return "ADMIN";
  if (role?.toLowerCase() === "especialista") return "ESPECIALISTA";
  return "MEMBRO";
}

export function buildDefaultPermissions(profileName: string): PermissionKey[] {
  const name = profileName.trim().toUpperCase();

  if (name === "MASTER") {
    return [...ALL_PERMISSION_KEYS];
  }

  if (name === "ADMIN") {
    return excludePermissions(
      [...VIEW_PERMISSIONS, ...ADMIN_EDIT_PERMISSIONS],
      ADMIN_DENIED_PERMISSIONS,
    );
  }

  if (name === "ESPECIALISTA") {
    return [
      ...VIEW_PERMISSIONS,
      "objects.quick_edit",
      "objects.import",
      "logs.view",
      "logs.import",
    ];
  }

  if (name === "MEMBRO") {
    return [...VIEW_PERMISSIONS];
  }

  return [...VIEW_PERMISSIONS];
}

export function normalizePermissions(
  permissions: string[] | null | undefined,
  profileName: string,
): Set<PermissionKey> {
  const defaults = buildDefaultPermissions(profileName);
  const raw = permissions ?? [];
  const valid = raw.filter((p): p is PermissionKey =>
    ALL_PERMISSION_KEYS.includes(p as PermissionKey),
  );
  if (valid.length === 0) {
    return new Set(defaults);
  }
  return new Set(valid);
}

export function hasPermission(
  permissions: Set<PermissionKey> | PermissionKey[] | null | undefined,
  key: PermissionKey,
): boolean {
  if (!permissions) return false;
  if (permissions instanceof Set) return permissions.has(key);
  return permissions.includes(key);
}

export function permissionsToArray(set: Set<PermissionKey>): PermissionKey[] {
  return ALL_PERMISSION_KEYS.filter((k) => set.has(k));
}
