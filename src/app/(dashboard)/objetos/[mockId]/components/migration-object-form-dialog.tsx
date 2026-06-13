"use client";

import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Clock, Database, History, Search, Timer, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, unformatNumber, formatDurationInput } from "@/lib/migration/format-utils";
import type { MigrationObject } from "@/types/migration";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { FioriPopoverIconButtonHint } from "@/components/ui/fiori-icon-button-hint";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ptBR } from "date-fns/locale";
import {
  formatBrazilianDateTime,
  parseBrazilianLocalDateTime,
  toIsoLocalSeconds,
} from "@/lib/migration/datetime-br";
import { FioriDialogContextFields } from "@/components/ui/fiori-dialog-context-fields";

interface MasterObject {
  id: string;
  name: string;
  chargeGroup?: string;
}

interface MigrationFormData {
  masterObjectId: string;
  name: string;
  description: string;
  chargeGroup: string;
  chargeOrder: string | number;
  isParallel: boolean;
  chargeStartTime: string;
  chargeEndTime: string;
  targetRecordsCount: number;
  processedRecordsCount: number;
  migratedRecordsCount: number;
  successfulRecordsCount: number;
  errorRecordsCount: number;
  currentChargeDurationMs: number;
  previousMigratedRecordsCount: number;
  previousChargeDurationMs: number;
  dependencyIds: string[];
}

interface MigrationObjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingObject: MigrationObject | null;
  formData: MigrationFormData;
  onFormChange: (fn: (prev: MigrationFormData) => MigrationFormData) => void;
  filteredMasterObjects: MasterObject[];
  selectedMasterIds: string[];
  onSelectAll: () => void;
  onToggleMaster: (id: string) => void;
  searchMasterTerm: string;
  onSearchMasterChange: (s: string) => void;
  prevDurationInput: string;
  onDurationInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  isAdmin: boolean;
  isMockLocked: boolean;
  empresa?: string;
  projectName?: string;
  mockName?: string;
}

export function MigrationObjectFormDialog({
  open,
  onOpenChange,
  editingObject,
  formData,
  onFormChange,
  filteredMasterObjects,
  selectedMasterIds,
  onSelectAll,
  onToggleMaster,
  searchMasterTerm,
  onSearchMasterChange,
  prevDurationInput,
  onDurationInputChange,
  onSave,
  isAdmin,
  isMockLocked,
  empresa,
  projectName,
  mockName,
}: MigrationObjectFormDialogProps) {
  const [chargeStartDraft, setChargeStartDraft] = useState("");
  const [chargeEndDraft, setChargeEndDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setChargeStartDraft(formatBrazilianDateTime(formData.chargeStartTime));
    setChargeEndDraft(formatBrazilianDateTime(formData.chargeEndTime));
  }, [open, formData.chargeStartTime, formData.chargeEndTime]);

  const parseLocalDateTime = (value: string) => parseBrazilianLocalDateTime(value);

  const commitChargeDraft = (key: "chargeStartTime" | "chargeEndTime", draft: string, currentSaved: string) => {
    const trimmed = draft.trim();
    const revert = () => {
      const s = formatBrazilianDateTime(currentSaved);
      if (key === "chargeStartTime") setChargeStartDraft(s);
      else setChargeEndDraft(s);
    };
    if (!trimmed) {
      revert();
      return;
    }
    const parsed = parseBrazilianLocalDateTime(trimmed);
    if (!parsed || Number.isNaN(parsed.getTime())) {
      revert();
      return;
    }
    const iso = toIsoLocalSeconds(parsed);
    onFormChange((prev) => ({ ...prev, [key]: iso }));
    const br = formatBrazilianDateTime(iso);
    if (key === "chargeStartTime") setChargeStartDraft(br);
    else setChargeEndDraft(br);
  };
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);
  const minuteSecondOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);

  const updateDatePart = (key: "chargeStartTime" | "chargeEndTime", date: Date | undefined) => {
    if (!date) return;
    onFormChange((prev) => {
      const current = parseBrazilianLocalDateTime(prev[key]) ?? new Date();
      const merged = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        current.getHours(),
        current.getMinutes(),
        current.getSeconds()
      );
      return { ...prev, [key]: toIsoLocalSeconds(merged) };
    });
  };

  const updateTimePart = (key: "chargeStartTime" | "chargeEndTime", part: "hour" | "minute" | "second", value: string) => {
    onFormChange((prev) => {
      const base = parseBrazilianLocalDateTime(prev[key]) ?? new Date();
      const h = part === "hour" ? Number(value) : base.getHours();
      const m = part === "minute" ? Number(value) : base.getMinutes();
      const s = part === "second" ? Number(value) : base.getSeconds();
      const merged = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, s);
      return { ...prev, [key]: toIsoLocalSeconds(merged) };
    });
  };

  const startDate = parseLocalDateTime(formData.chargeStartTime);
  const endDate = parseLocalDateTime(formData.chargeEndTime);
  const startValid = !!startDate && !Number.isNaN(startDate.getTime());
  const endValid = !!endDate && !Number.isNaN(endDate.getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog flex h-[min(92vh,640px)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
      >
        <DialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
          <DialogDescription className="sr-only">
            Detalhamento e atualização dos dados de execução do objeto de migração.
          </DialogDescription>
          <div className="flex items-center gap-3">
            <div className="fiori-dialog-icon shrink-0">
              <Database className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="fiori-dialog-title-row">
                <DialogTitle className="fiori-dialog-title shrink-0">
                  {editingObject ? "Detalhamento da execução" : "Seleção de objetos para a mock"}
                </DialogTitle>
                <FioriDialogContextFields
                  empresa={empresa}
                  projectName={projectName}
                  mockName={mockName}
                />
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-5 py-4">
            {!editingObject ? (
              <>
                <div className="fiori-search-shell">
                  <Search className="fiori-search-icon" />
                  <Input
                    placeholder="Pesquisar objetos no catálogo..."
                    className="fiori-search-input shadow-none"
                    value={searchMasterTerm}
                    onChange={(e) => onSearchMasterChange(e.target.value)}
                  />
                </div>

                <div>
                  <div className="fiori-master-picker-header">
                    <label className="fiori-field-label">
                      <Database className="h-3.5 w-3.5 text-[var(--fiori-brand)]" />
                      Objetos disponíveis
                    </label>
                    {filteredMasterObjects.length > 0 && (
                      <button type="button" onClick={onSelectAll} className="fiori-link-btn">
                        {filteredMasterObjects.every((mo) => selectedMasterIds.includes(mo.id))
                          ? "Desmarcar todos"
                          : "Marcar todos"}
                      </button>
                    )}
                  </div>
                  <div className="fiori-picker-zone min-h-[8.75rem]">
                    <div className="flex flex-wrap gap-1.5">
                      {filteredMasterObjects.length > 0 ? (
                        filteredMasterObjects.map((mo) => {
                          const isSelected = selectedMasterIds.includes(mo.id);
                          return (
                            <button
                              key={mo.id}
                              type="button"
                              className={cn(
                                "fiori-chip",
                                isSelected && "fiori-chip-selected"
                              )}
                              onClick={() => onToggleMaster(mo.id)}
                            >
                              {mo.name}
                              {mo.chargeGroup && (
                                <span className="opacity-60">({mo.chargeGroup})</span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <p className="fiori-empty-hint w-full py-6 text-center">
                          Nenhum objeto disponível para cadastro.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="fiori-object-exec-summary">
                  <div className="fiori-object-exec-name">
                    <div className="fiori-object-exec-icon">
                      <Database className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="fiori-field-label">Objeto técnico</span>
                      <p className="truncate font-semibold uppercase text-[var(--fiori-text)]">
                        {formData.name}
                      </p>
                    </div>
                  </div>
                  <div className="fiori-object-exec-meta">
                    <div className="fiori-object-exec-field">
                      <span className="fiori-field-label">Grupo</span>
                      <span className="fiori-object-exec-readonly">{formData.chargeGroup}</span>
                    </div>
                    <div className="fiori-object-exec-field">
                      <span className="fiori-field-label">Ordem</span>
                      <span className="fiori-object-exec-readonly">
                        {(() => {
                          const s = String(formData.chargeOrder ?? "").trim();
                          if (/^\d{2}\.\d{2}$/.test(s)) return s;
                          const n = parseInt(s);
                          return n > 0 ? `${String(n).padStart(2, "0")}.00` : "—";
                        })()}
                      </span>
                    </div>
                    <div className="fiori-object-exec-field items-center">
                      <span className="fiori-field-label">Paralelo</span>
                      <Switch checked={formData.isParallel} disabled className="scale-90 opacity-60 origin-right" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--fiori-border-light)] pt-4">
                  <h3 className="fiori-section-title">
                    <Timer className="h-3.5 w-3.5" />
                    Monitoramento da carga
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="fiori-field-label">
                        <Clock className="h-3.5 w-3.5 text-[var(--fiori-brand)]" />
                        Início
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          disabled={!isAdmin || isMockLocked}
                          value={chargeStartDraft}
                          onChange={(e) => setChargeStartDraft(e.target.value)}
                          onBlur={() =>
                            commitChargeDraft("chargeStartTime", chargeStartDraft, formData.chargeStartTime)
                          }
                          placeholder="dd/mm/aaaa hh:mm:ss"
                          autoComplete="off"
                          aria-label="Data e hora de início da carga"
                          className="fiori-input min-w-0 flex-1 font-mono readable-disabled shadow-none"
                        />
                        <Popover>
                          <FioriPopoverIconButtonHint
                            hint="Abrir calendário — início da carga"
                            disabled={!isAdmin || isMockLocked}
                            className="fiori-icon-btn fiori-icon-btn-bordered"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <CalendarDays className="h-4 w-4" />
                          </FioriPopoverIconButtonHint>
                          <PopoverContent variant="fiori" className="w-auto max-h-[85vh] overflow-y-auto p-3" align="start">
                            <div className="space-y-3">
                              <Calendar
                                mode="single"
                                selected={startValid ? startDate! : undefined}
                                onSelect={(d) => updateDatePart("chargeStartTime", d)}
                                locale={ptBR}
                                initialFocus
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <Select
                                  value={String((startValid ? startDate : new Date()).getHours()).padStart(2, "0")}
                                  onValueChange={(v) => updateTimePart("chargeStartTime", "hour", v)}
                                >
                                  <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                  <SelectContent side="top" className="fiori-select-content max-h-40">
                                    {hourOptions.map((h) => (
                                      <SelectItem key={h} value={h} className="fiori-select-item">{h}h</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={String((startValid ? startDate : new Date()).getMinutes()).padStart(2, "0")}
                                  onValueChange={(v) => updateTimePart("chargeStartTime", "minute", v)}
                                >
                                  <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                  <SelectContent side="top" className="fiori-select-content max-h-40">
                                    {minuteSecondOptions.map((m) => (
                                      <SelectItem key={m} value={m} className="fiori-select-item">{m}m</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={String((startValid ? startDate : new Date()).getSeconds()).padStart(2, "0")}
                                  onValueChange={(v) => updateTimePart("chargeStartTime", "second", v)}
                                >
                                  <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                  <SelectContent side="top" className="fiori-select-content max-h-40">
                                    {minuteSecondOptions.map((s) => (
                                      <SelectItem key={s} value={s} className="fiori-select-item">{s}s</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="fiori-field-label">
                        <Clock className="h-3.5 w-3.5 text-[var(--fiori-brand)]" />
                        Término
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          disabled={!isAdmin || isMockLocked}
                          value={chargeEndDraft}
                          onChange={(e) => setChargeEndDraft(e.target.value)}
                          onBlur={() =>
                            commitChargeDraft("chargeEndTime", chargeEndDraft, formData.chargeEndTime)
                          }
                          placeholder="dd/mm/aaaa hh:mm:ss"
                          autoComplete="off"
                          aria-label="Data e hora de término da carga"
                          className="fiori-input min-w-0 flex-1 font-mono readable-disabled shadow-none"
                        />
                        <Popover>
                          <FioriPopoverIconButtonHint
                            hint="Abrir calendário — término da carga"
                            disabled={!isAdmin || isMockLocked}
                            className="fiori-icon-btn fiori-icon-btn-bordered"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <CalendarDays className="h-4 w-4" />
                          </FioriPopoverIconButtonHint>
                          <PopoverContent variant="fiori" className="w-auto max-h-[85vh] overflow-y-auto p-3" align="start">
                            <div className="space-y-3">
                              <Calendar
                                mode="single"
                                selected={endValid ? endDate! : undefined}
                                onSelect={(d) => updateDatePart("chargeEndTime", d)}
                                locale={ptBR}
                                initialFocus
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <Select
                                  value={String((endValid ? endDate : new Date()).getHours()).padStart(2, "0")}
                                  onValueChange={(v) => updateTimePart("chargeEndTime", "hour", v)}
                                >
                                  <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                  <SelectContent side="top" className="fiori-select-content max-h-40">
                                    {hourOptions.map((h) => (
                                      <SelectItem key={h} value={h} className="fiori-select-item">{h}h</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={String((endValid ? endDate : new Date()).getMinutes()).padStart(2, "0")}
                                  onValueChange={(v) => updateTimePart("chargeEndTime", "minute", v)}
                                >
                                  <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                  <SelectContent side="top" className="fiori-select-content max-h-40">
                                    {minuteSecondOptions.map((m) => (
                                      <SelectItem key={m} value={m} className="fiori-select-item">{m}m</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={String((endValid ? endDate : new Date()).getSeconds()).padStart(2, "0")}
                                  onValueChange={(v) => updateTimePart("chargeEndTime", "second", v)}
                                >
                                  <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                  <SelectContent side="top" className="fiori-select-content max-h-40">
                                    {minuteSecondOptions.map((s) => (
                                      <SelectItem key={s} value={s} className="fiori-select-item">{s}s</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="fiori-field-label">Total target</label>
                      <Input
                        type="text"
                        value={formatNumber(formData.targetRecordsCount)}
                        onChange={(e) =>
                          onFormChange((prev) => ({
                            ...prev,
                            targetRecordsCount: unformatNumber(e.target.value),
                          }))
                        }
                        className="fiori-input readable-disabled shadow-none"
                        disabled={!isAdmin || isMockLocked}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="fiori-field-label">Total carregado</label>
                      <Input
                        type="text"
                        readOnly
                        value={formatNumber(
                          Math.max(0, formData.targetRecordsCount - formData.errorRecordsCount)
                        )}
                        className="fiori-input readable-disabled shadow-none bg-[#f5f6f7]"
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="fiori-field-label">Sucesso (auto)</label>
                      <Input
                        type="text"
                        value={formatNumber(formData.successfulRecordsCount)}
                        readOnly
                        className="fiori-input fiori-input-success readable-disabled shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="fiori-field-label">Total erro</label>
                      <Input
                        type="text"
                        value={formatNumber(formData.errorRecordsCount)}
                        onChange={(e) =>
                          onFormChange((prev) => ({
                            ...prev,
                            errorRecordsCount: unformatNumber(e.target.value),
                          }))
                        }
                        className="fiori-input fiori-input-error readable-disabled shadow-none"
                        disabled={!isAdmin || isMockLocked}
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5 sm:col-span-1">
                      <label className="fiori-field-label">Duração</label>
                      <Input
                        readOnly
                        value={formatDurationInput(formData.currentChargeDurationMs)}
                        className="fiori-input font-mono readable-disabled shadow-none bg-[#f5f6f7]"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--fiori-border-light)] pt-4">
                  <h3 className="fiori-section-title">
                    <History className="h-3.5 w-3.5" />
                    Histórico do ciclo anterior
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="fiori-field-label">Volume anterior</label>
                      <Input
                        type="text"
                        value={formatNumber(formData.previousMigratedRecordsCount)}
                        onChange={(e) =>
                          onFormChange((prev) => ({
                            ...prev,
                            previousMigratedRecordsCount: unformatNumber(e.target.value),
                          }))
                        }
                        className="fiori-input readable-disabled shadow-none"
                        disabled={!isAdmin || isMockLocked}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="fiori-field-label">Duração anterior</label>
                      <Input
                        placeholder="Ex.: 08H 30M 00S"
                        value={prevDurationInput}
                        onChange={onDurationInputChange}
                        className="fiori-input readable-disabled shadow-none"
                        disabled={!isAdmin || isMockLocked}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="fiori-dialog-footer shrink-0 flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => onOpenChange(false)} className="fiori-btn-ghost w-full sm:w-auto">
            Cancelar
          </button>
          {isAdmin && (
            <button
              type="button"
              disabled={isMockLocked}
              onClick={onSave}
              className="fiori-btn-emphasized w-full sm:w-auto"
            >
              {editingObject
                ? "Atualizar dados"
                : `Adicionar ${selectedMasterIds.length} objeto${selectedMasterIds.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
