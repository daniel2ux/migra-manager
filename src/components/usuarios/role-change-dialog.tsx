"use client";

import { Loader2, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { UserProfile } from "@/types/usuarios";
import { AccessProfileSelect } from "@/components/usuarios/access-profile-select";

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserProfile | null;
  newRole: UserProfile["role"];
  onRoleChange: (role: UserProfile["role"]) => void;
  accessProfileId: string | null | undefined;
  onAccessProfileChange: (id: string | null) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  profileName: string;
  onProfileNameChange: (name: string) => void;
  onSubmit: () => Promise<void>;
  isChanging: boolean;
}

const ROLES = [
  { value: "master", label: "Master" },
  { value: "admin", label: "Governança" },
  { value: "especialista", label: "Especialista" },
  { value: "membro", label: "Consultoria" },
] as const;

export function RoleChangeDialog({
  open,
  onOpenChange,
  targetUser,
  newRole,
  onRoleChange,
  accessProfileId,
  onAccessProfileChange,
  reason,
  onReasonChange,
  profileName,
  onProfileNameChange,
  onSubmit,
  isChanging,
}: RoleChangeDialogProps) {
  const isValid = !!reason.trim();

  return (
    <Dialog preserveDashboardScroll open={open} onOpenChange={onOpenChange}>
      <DialogContent
        open={open}
        variant="fiori"
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog fiori-dialog--form flex w-[calc(100vw-1rem)] max-w-md flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            Alterar perfil de acesso do profissional
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <Shield className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="fiori-dialog-title">Alterar perfil</DialogTitle>
              <p className="fiori-dialog-subtitle truncate">
                {targetUser?.name || targetUser?.email || "Profissional"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-dialog-body">
          <section className="fiori-form-section space-y-4">
            <div className="space-y-1.5">
              <label className="fiori-field-label" htmlFor="role-change-profile">
                Perfil de sistema (role)
              </label>
              <Select
                value={newRole}
                onValueChange={(v) => onRoleChange(v as UserProfile["role"])}
              >
                <SelectTrigger id="role-change-profile" className="fiori-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="fiori-select-content">
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value} className="fiori-select-item">
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="fiori-field-label" htmlFor="role-change-access-profile">
                Perfil de permissões
              </label>
              <AccessProfileSelect
                id="role-change-access-profile"
                value={accessProfileId}
                onChange={onAccessProfileChange}
                role={newRole}
                isMaster={newRole === "master"}
              />
            </div>

            <div className="space-y-1.5">
              <label className="fiori-field-label" htmlFor="role-change-position">
                Cargo ou função
              </label>
              <Input
                id="role-change-position"
                value={profileName}
                onChange={(e) => onProfileNameChange(e.target.value)}
                placeholder="Analista sênior"
                className="fiori-input readable-disabled shadow-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="fiori-field-label" htmlFor="role-change-reason">
                Motivo da alteração <span className="text-[var(--fiori-negative)]">*</span>
              </label>
              <Input
                id="role-change-reason"
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Justificativa para a mudança de perfil"
                className="fiori-input readable-disabled shadow-none"
              />
              <p className="fiori-field-hint">
                O motivo é registrado para auditoria de acessos.
              </p>
            </div>
          </section>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="fiori-btn-ghost"
            disabled={isChanging}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isChanging || !isValid}
            className="fiori-btn-emphasized inline-flex items-center gap-1.5"
          >
            {isChanging && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            Confirmar alteração
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
