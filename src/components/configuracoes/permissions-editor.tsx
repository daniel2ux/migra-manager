"use client";

import { cn } from "@/lib/utils";
import {
  PERMISSION_GROUPS,
  type PermissionKey,
  permissionsToArray,
} from "@/lib/auth/permissions";
import { Switch } from "@/components/ui/switch";

interface PermissionsEditorProps {
  value: Set<PermissionKey>;
  onChange: (next: Set<PermissionKey>) => void;
  readOnly?: boolean;
  profileName?: string;
}

export function PermissionsEditor({
  value,
  onChange,
  readOnly = false,
  profileName,
}: PermissionsEditorProps) {
  const isMasterProfile = profileName?.trim().toUpperCase() === "MASTER";

  function toggle(key: PermissionKey, enabled: boolean) {
    if (readOnly || isMasterProfile) return;
    const next = new Set(value);
    if (enabled) next.add(key);
    else next.delete(key);
    onChange(next);
  }

  function toggleGroup(keys: PermissionKey[], enabled: boolean) {
    if (readOnly || isMasterProfile) return;
    const next = new Set(value);
    for (const key of keys) {
      if (enabled) next.add(key);
      else next.delete(key);
    }
    onChange(next);
  }

  return (
    <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
      {isMasterProfile && (
        <p className="text-[0.6875rem] text-[var(--fiori-label)] bg-[#e8f3ff] border border-[#0070f2]/20 rounded-[0.375rem] px-3 py-2">
          O perfil MASTER possui acesso total e não pode ser restringido.
        </p>
      )}

      {PERMISSION_GROUPS.map((group) => {
        const keys = group.permissions.map((p) => p.key);
        const allOn = keys.every((k) => value.has(k));
        const someOn = keys.some((k) => value.has(k));

        return (
          <section
            key={group.id}
            className="border border-[var(--fiori-border-light)] rounded-[0.375rem] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#f5f6f7] border-b border-[var(--fiori-border-light)]">
              <span className="text-[0.75rem] font-semibold text-[var(--fiori-text)]">
                {group.label}
              </span>
              {!readOnly && !isMasterProfile && (
                <button
                  type="button"
                  className="text-[0.625rem] font-semibold text-[#0070f2] hover:underline"
                  onClick={() => toggleGroup(keys, !allOn)}
                >
                  {allOn ? "Desmarcar grupo" : someOn ? "Marcar grupo" : "Marcar grupo"}
                </button>
              )}
            </div>
            <ul className="divide-y divide-[var(--fiori-border-light)]">
              {group.permissions.map((perm) => {
                const checked = value.has(perm.key) || isMasterProfile;
                return (
                  <li
                    key={perm.key}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[0.6875rem] font-medium text-[var(--fiori-text)]">
                        {perm.label}
                      </p>
                      <p className="text-[0.625rem] text-[var(--fiori-label)] font-mono truncate">
                        {perm.key}
                      </p>
                    </div>
                    <Switch
                      checked={checked}
                      disabled={readOnly || isMasterProfile}
                      onCheckedChange={(on) => toggle(perm.key, on)}
                      className={cn(readOnly && "opacity-60")}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="text-[0.625rem] text-[var(--fiori-label)]">
        {permissionsToArray(value).length} de{" "}
        {PERMISSION_GROUPS.reduce((n, g) => n + g.permissions.length, 0)}{" "}
        permissões ativas
      </p>
    </div>
  );
}
