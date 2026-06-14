"use client";

import { useEffect, useState } from "react";
import { Briefcase, Building2, CalendarDays, Loader2, User, UserCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { FioriPopoverIconButtonHint } from "@/components/ui/fiori-icon-button-hint";
import { Calendar } from "@/components/ui/calendar";
import type { UserProfile, UserFormData } from "@/types/usuarios";
import { formatBrazilianPhone } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

const FIORI_FIELD = "fiori-input shadow-none";
const FIORI_FIELD_UPPER = `${FIORI_FIELD} uppercase`;

function fioriFieldClass(readonly: boolean, uppercase = false): string {
  return cn(uppercase ? FIORI_FIELD_UPPER : FIORI_FIELD, readonly && "readable-disabled");
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  formData: Partial<UserFormData>;
  onFormDataChange: (data: Partial<UserFormData>) => void;
  onSave: () => Promise<void>;
  canEdit: boolean;
  isSaving?: boolean;
}

const EMPTY_FORM: UserFormData = {
  name: "",
  phone: "",
  company: "",
  position: "",
  department: "",
  manager: "",
  startDate: "",
  endDate: "",
  notes: "",
};

function getField<T extends keyof UserFormData>(
  formData: Partial<UserFormData>,
  user: UserProfile | null,
  field: T,
): string {
  return formData[field] ?? user?.[field] ?? EMPTY_FORM[field];
}

function parseISODate(value: string): Date | undefined {
  if (!value) return undefined;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toISODate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

function toMaskedDate(value: string): string {
  const digits = normalizeDateDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function maskedDateToISO(masked: string): string | null {
  const digits = normalizeDateDigits(masked);
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day);
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  if (!valid) return null;
  return toISODate(date);
}

function isISODateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function resolveToISO(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (isISODateString(t) && parseISODate(t)) return t;
  const masked = toMaskedDate(t);
  return maskedDateToISO(masked);
}

function displayDateBRInput(raw: string): string {
  if (!raw.trim()) return "";
  const iso = resolveToISO(raw);
  if (iso) {
    const d = parseISODate(iso);
    if (!d) return raw;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear());
    return `${day}/${month}/${year}`;
  }
  return raw;
}

function DateField({
  id,
  label,
  value,
  disabled,
  calOpen,
  onCalOpenChange,
  onInputChange,
  onDateSelect,
  pickerAriaLabel,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  calOpen: boolean;
  onCalOpenChange: (open: boolean) => void;
  onInputChange: (raw: string) => void;
  onDateSelect: (date: Date) => void;
  pickerAriaLabel: string;
}) {
  return (
    <div className="fiori-form-field">
      <label className="fiori-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          disabled={disabled}
          value={displayDateBRInput(value)}
          onChange={(e) => onInputChange(e.target.value)}
          className={cn(
            "fiori-input min-w-0 flex-1 font-mono shadow-none",
            disabled && "readable-disabled",
          )}
        />
        <Popover open={calOpen} onOpenChange={onCalOpenChange}>
          <FioriPopoverIconButtonHint
            hint={pickerAriaLabel}
            disabled={disabled}
            className="fiori-icon-btn fiori-icon-btn-bordered shrink-0"
          >
            <CalendarDays className="h-4 w-4" aria-hidden />
          </FioriPopoverIconButtonHint>
          <PopoverContent
            variant="fiori"
            className="fiori-datetime-popover"
            side="bottom"
            align="end"
            sideOffset={6}
            collisionPadding={16}
          >
            <Calendar
              variant="fiori"
              mode="single"
              selected={(() => {
                const iso = resolveToISO(value);
                return iso ? parseISODate(iso) : undefined;
              })()}
              onSelect={(d) => {
                if (d) onDateSelect(d);
                onCalOpenChange(false);
              }}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  formData,
  onFormDataChange,
  onSave,
  canEdit,
  isSaving = false,
}: EditUserDialogProps) {
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);
  const readonly = !canEdit;

  useEffect(() => {
    if (!open) {
      setStartCalOpen(false);
      setEndCalOpen(false);
    }
  }, [open]);

  const updateField = <T extends keyof UserFormData>(field: T, value: UserFormData[T]) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  const handleDateInput = (field: "startDate" | "endDate", raw: string) => {
    const trimmed = raw.trim();
    if (isISODateString(trimmed) && parseISODate(trimmed)) {
      updateField(field, trimmed);
      return;
    }
    const masked = toMaskedDate(raw);
    const iso = maskedDateToISO(masked);
    if (iso) {
      updateField(field, iso);
      return;
    }
    updateField(field, masked);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="fiori"
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog fiori-dialog--form fiori-dialog--user-form flex h-[min(92vh,640px)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            Ficha técnica do usuário
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <User className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="fiori-dialog-title">Ficha técnica</DialogTitle>
              <p className="fiori-dialog-subtitle truncate">
                {user?.name || user?.email || "Profissional"}
              </p>
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
                <label className="fiori-field-label" htmlFor="edit-user-name">
                  Nome completo
                </label>
                <Input
                  id="edit-user-name"
                  value={getField(formData, user, "name")}
                  onChange={(e) => updateField("name", e.target.value.toUpperCase())}
                  placeholder="João da Silva"
                  disabled={readonly}
                  className={fioriFieldClass(readonly, true)}
                />
              </div>
              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="edit-user-phone">
                  Telefone de contato
                </label>
                <Input
                  id="edit-user-phone"
                  type="tel"
                  inputMode="numeric"
                  value={formatBrazilianPhone(getField(formData, user, "phone"))}
                  onChange={(e) => updateField("phone", formatBrazilianPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  disabled={readonly}
                  className={fioriFieldClass(readonly)}
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
                <label className="fiori-field-label" htmlFor="edit-user-company">
                  Empresa
                </label>
                <Input
                  id="edit-user-company"
                  value={getField(formData, user, "company")}
                  onChange={(e) => updateField("company", e.target.value.toUpperCase())}
                  placeholder="Acme Ltda"
                  disabled={readonly}
                  className={fioriFieldClass(readonly, true)}
                />
              </div>
              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="edit-user-position">
                  Cargo
                </label>
                <Input
                  id="edit-user-position"
                  value={getField(formData, user, "position")}
                  onChange={(e) => updateField("position", e.target.value.toUpperCase())}
                  placeholder="Analista sênior"
                  disabled={readonly}
                  className={fioriFieldClass(readonly, true)}
                />
              </div>
              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="edit-user-department">
                  Departamento
                </label>
                <Input
                  id="edit-user-department"
                  value={getField(formData, user, "department")}
                  onChange={(e) => updateField("department", e.target.value.toUpperCase())}
                  placeholder="Tecnologia"
                  disabled={readonly}
                  className={fioriFieldClass(readonly, true)}
                />
              </div>
              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="edit-user-manager">
                  Gestor direto
                </label>
                <Input
                  id="edit-user-manager"
                  value={getField(formData, user, "manager")}
                  onChange={(e) => updateField("manager", e.target.value.toUpperCase())}
                  placeholder="Maria Santos"
                  disabled={readonly}
                  className={fioriFieldClass(readonly, true)}
                />
              </div>
            </div>
          </section>

          <section className="fiori-form-section">
            <h3 className="fiori-section-title">
              <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Ciclo de alocação
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DateField
                  id="edit-user-start-date"
                  label="Data de início"
                  value={getField(formData, user, "startDate")}
                  disabled={readonly}
                  calOpen={startCalOpen}
                  onCalOpenChange={setStartCalOpen}
                  onInputChange={(raw) => handleDateInput("startDate", raw)}
                  onDateSelect={(d) => updateField("startDate", toISODate(d))}
                  pickerAriaLabel="Abrir calendário — data de início"
                />
                <DateField
                  id="edit-user-end-date"
                  label="Data de fim"
                  value={getField(formData, user, "endDate")}
                  disabled={readonly}
                  calOpen={endCalOpen}
                  onCalOpenChange={setEndCalOpen}
                  onInputChange={(raw) => handleDateInput("endDate", raw)}
                  onDateSelect={(d) => updateField("endDate", toISODate(d))}
                  pickerAriaLabel="Abrir calendário — data de fim"
                />
              </div>
              <div className="fiori-form-field">
                <label className="fiori-field-label" htmlFor="edit-user-notes">
                  Observações adicionais
                </label>
                <Textarea
                  id="edit-user-notes"
                  value={getField(formData, user, "notes")}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Anotações relevantes sobre o profissional…"
                  disabled={readonly}
                  rows={3}
                  className={cn("fiori-textarea shadow-none min-h-[5rem]", readonly && "readable-disabled")}
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="fiori-btn-ghost"
            disabled={isSaving}
          >
            {canEdit ? "Cancelar" : "Fechar"}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="fiori-btn-emphasized inline-flex items-center gap-1.5"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
              Salvar alterações
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
