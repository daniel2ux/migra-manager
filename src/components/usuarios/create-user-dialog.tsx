"use client";

import { useEffect, useState } from "react";
import { Briefcase, Building2, Loader2, UserCircle, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateUserData } from "@/types/usuarios";
import { AccessProfileSelect } from "@/components/usuarios/access-profile-select";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateUserData) => Promise<boolean>;
  isCreating: boolean;
}

const ROLES = [
  { value: "master", label: "Master" },
  { value: "admin", label: "Governança" },
  { value: "especialista", label: "Especialista" },
  { value: "membro", label: "Consultoria" },
] as const;

const FIORI_FIELD = "fiori-input shadow-none";
const FIORI_FIELD_UPPER = `${FIORI_FIELD} uppercase`;

function createInitialForm(): CreateUserData {
  return {
    name: "",
    email: "",
    role: "membro",
    company: "",
    position: "",
    reason: "",
    accessProfileId: null,
  };
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: CreateUserDialogProps) {
  const [formData, setFormData] = useState<CreateUserData>(createInitialForm);

  useEffect(() => {
    if (open) setFormData(createInitialForm());
  }, [open]);

  const isValid =
    !!formData.name?.trim() &&
    !!formData.email?.trim() &&
    !!formData.reason?.trim();

  const handleSubmit = async () => {
    if (!isValid) return;
    const ok = await onCreate({
      ...formData,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      company: (formData.company ?? "").trim(),
      position: (formData.position ?? "").trim(),
      reason: formData.reason.trim(),
    });
    if (ok) setFormData(createInitialForm());
  };

  const handleDismiss = () => {
    setFormData(createInitialForm());
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleDismiss();
      }}
    >
      <DialogContent
        variant="fiori"
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog fiori-dialog--form fiori-dialog--user-form flex h-[min(92vh,640px)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            Cadastrar novo profissional
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <UserPlus className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="fiori-dialog-title">Novo profissional</DialogTitle>
              <p className="fiori-dialog-subtitle">Cadastro de acesso ao sistema</p>
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-dialog-body">
          <section className="fiori-form-section">
            <h3 className="fiori-section-title">
              <UserCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Dados pessoais
            </h3>
            <div className="space-y-4">
              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="create-user-name">
                  Nome completo <span className="text-[var(--fiori-negative)]">*</span>
                </label>
                <Input
                  id="create-user-name"
                  value={formData.name ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value.toUpperCase() })
                  }
                  placeholder="João da Silva"
                  className={FIORI_FIELD_UPPER}
                  autoComplete="name"
                />
              </div>

              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="create-user-email">
                  E-mail corporativo <span className="text-[var(--fiori-negative)]">*</span>
                </label>
                <Input
                  id="create-user-email"
                  type="email"
                  value={formData.email ?? ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@empresa.com"
                  className={FIORI_FIELD}
                  autoComplete="email"
                />
              </div>
            </div>
          </section>

          <section className="fiori-form-section">
            <h3 className="fiori-section-title">
              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Identificação corporativa
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="create-user-company">
                  Empresa
                </label>
                <Input
                  id="create-user-company"
                  value={formData.company ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value.toUpperCase() })
                  }
                  placeholder="Acme Ltda"
                  className={FIORI_FIELD_UPPER}
                  autoComplete="organization"
                />
              </div>
              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="create-user-position">
                  Cargo
                </label>
                <Input
                  id="create-user-position"
                  value={formData.position ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value.toUpperCase() })
                  }
                  placeholder="Analista sênior"
                  className={FIORI_FIELD_UPPER}
                  autoComplete="organization-title"
                />
              </div>
            </div>
          </section>

          <section className="fiori-form-section">
            <h3 className="fiori-section-title">
              <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Acesso e permissões
            </h3>
            <div className="space-y-4">
              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="create-user-role">
                  Perfil de sistema (role)
                </label>
                <Select
                  value={formData.role}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      role: v as CreateUserData["role"],
                      accessProfileId: null,
                    })
                  }
                >
                  <SelectTrigger id="create-user-role" className="fiori-select-trigger">
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

              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="create-user-access-profile">
                  Perfil de permissões
                </label>
                <AccessProfileSelect
                  id="create-user-access-profile"
                  value={formData.accessProfileId}
                  onChange={(id) => setFormData({ ...formData, accessProfileId: id })}
                  role={formData.role}
                  isMaster={formData.role === "master"}
                />
              </div>

              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="create-user-reason">
                  Motivo do cadastro <span className="text-[var(--fiori-negative)]">*</span>
                </label>
                <Input
                  id="create-user-reason"
                  value={formData.reason ?? ""}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Justificativa para o cadastro"
                  className={FIORI_FIELD}
                />
                <p className="fiori-field-hint">
                  O motivo é registrado para auditoria de acessos.
                </p>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="fiori-btn-ghost"
            disabled={isCreating}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isCreating || !isValid}
            className="fiori-btn-emphasized inline-flex items-center gap-1.5"
          >
            {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            Cadastrar profissional
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
