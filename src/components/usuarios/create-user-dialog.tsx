"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
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

function createInitialForm(): CreateUserData {
  return {
    name: "",
    email: "",
    role: "membro",
    company: "",
    position: "",
    reason: "",
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
        className="fiori-dialog fiori-dialog--form flex w-[calc(100vw-1rem)] max-w-md flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
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
          <section className="fiori-form-section space-y-4">
            <div className="space-y-1.5">
              <label className="fiori-field-label" htmlFor="create-user-name">
                Nome completo <span className="text-[var(--fiori-negative)]">*</span>
              </label>
              <Input
                id="create-user-name"
                value={formData.name ?? ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="João da Silva"
                className="fiori-input readable-disabled shadow-none"
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="fiori-field-label" htmlFor="create-user-email">
                E-mail corporativo <span className="text-[var(--fiori-negative)]">*</span>
              </label>
              <Input
                id="create-user-email"
                type="email"
                value={formData.email ?? ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao@empresa.com"
                className="fiori-input readable-disabled shadow-none"
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="create-user-company">
                  Empresa
                </label>
                <Input
                  id="create-user-company"
                  value={formData.company ?? ""}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Acme Ltda"
                  className="fiori-input readable-disabled shadow-none"
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="create-user-position">
                  Cargo
                </label>
                <Input
                  id="create-user-position"
                  value={formData.position ?? ""}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Analista sênior"
                  className="fiori-input readable-disabled shadow-none"
                  autoComplete="organization-title"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="fiori-field-label" htmlFor="create-user-role">
                Perfil de acesso
              </label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as CreateUserData["role"] })}
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

            <div className="space-y-1.5">
              <label className="fiori-field-label" htmlFor="create-user-reason">
                Motivo do cadastro <span className="text-[var(--fiori-negative)]">*</span>
              </label>
              <Input
                id="create-user-reason"
                value={formData.reason ?? ""}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Justificativa para o cadastro"
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
