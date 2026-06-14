"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCESS_PROFILE_DEFAULT,
  defaultAccessProfileLabel,
  useAccessProfileOptions,
} from "@/hooks/use-access-profile-options";

interface AccessProfileSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  role?: string | null;
  isMaster?: boolean;
  disabled?: boolean;
  id?: string;
  hint?: string;
}

export function AccessProfileSelect({
  value,
  onChange,
  role,
  isMaster,
  disabled = false,
  id = "access-profile-select",
  hint,
}: AccessProfileSelectProps) {
  const { profiles, isLoading } = useAccessProfileOptions();

  const selectValue = value && value !== ACCESS_PROFILE_DEFAULT ? value : ACCESS_PROFILE_DEFAULT;

  const systemProfiles = profiles.filter((p) => p.isSystem);
  const customProfiles = profiles.filter((p) => !p.isSystem);

  return (
    <div className="space-y-1.5">
      <Select
        value={selectValue}
        onValueChange={(v) => onChange(v === ACCESS_PROFILE_DEFAULT ? null : v)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id={id} className="fiori-select-trigger">
          <SelectValue placeholder={isLoading ? "Carregando perfis…" : "Selecione o perfil de permissões"} />
        </SelectTrigger>
        <SelectContent className="fiori-select-content max-h-[280px]">
          <SelectItem value={ACCESS_PROFILE_DEFAULT} className="fiori-select-item">
            {defaultAccessProfileLabel(role, isMaster)}
          </SelectItem>

          {systemProfiles.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-[var(--fiori-label)]">
                Perfis padrão
              </div>
              {systemProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id} className="fiori-select-item">
                  {profile.name}
                  {profile.description ? ` — ${profile.description.slice(0, 40)}` : ""}
                </SelectItem>
              ))}
            </>
          )}

          {customProfiles.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-[var(--fiori-label)]">
                Perfis customizados
              </div>
              {customProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id} className="fiori-select-item">
                  {profile.name}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      <p className="fiori-field-hint">
        {hint ??
          "Define quais ações o usuário pode executar. O padrão segue o perfil de sistema vinculado ao role."}
      </p>
    </div>
  );
}
