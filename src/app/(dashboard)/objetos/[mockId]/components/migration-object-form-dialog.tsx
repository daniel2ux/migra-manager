"use client";

import { useEffect, useMemo, useState, memo, useCallback } from "react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, Clock, Database, History, Loader2, Search, Timer, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, unformatNumber, formatDurationInput, formatNumberInput } from "@/lib/migration/format-utils";
import type { MigrationObject } from "@/types/migration";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { FioriPopoverIconButtonHint } from "@/components/ui/fiori-icon-button-hint";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ptBR } from "date-fns/locale";
import {
  formatBrazilianDateTime,
  formatBrazilianDateTimeInput,
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
  isMasterCatalogLoading?: boolean;
  masterPickerEmptyHint?: string;
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

const MasterPickerRow = memo(function MasterPickerRow({
  object,
  isSelected,
  onToggle,
}: {
  object: MasterObject;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  const handleClick = useCallback(() => onToggle(object.id), [object.id, onToggle]);

  return (
    <button
      type="button"
      className={cn("fiori-object-row", isSelected && "fiori-object-row-selected")}
      onClick={handleClick}
    >
      <div
        className={cn(
          "fiori-object-row-checkbox",
          isSelected && "fiori-object-row-checkbox-checked",
        )}
        aria-hidden
      >
        {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      </div>
      <div className="fiori-object-row-body min-w-0 flex-1">
        <span className="fiori-object-row-name">{object.name}</span>
      </div>
      {object.chargeGroup ? (
        <span className={cn("fiori-seq-badge", isSelected && "fiori-seq-badge-selected")}>
          {object.chargeGroup}
        </span>
      ) : null}
    </button>
  );
});

const MasterObjectPickerList = memo(function MasterObjectPickerList({
  objects,
  selectedIds,
  onToggle,
}: {
  objects: MasterObject[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const objectsById = useMemo(
    () => new Map(objects.map((mo) => [mo.id, mo])),
    [objects],
  );

  const { selectedObjects, availableObjects } = useMemo(() => {
    const selected: MasterObject[] = [];
    for (const id of selectedIds) {
      const mo = objectsById.get(id);
      if (mo) selected.push(mo);
    }
    const available = objects.filter((mo) => !selectedIdSet.has(mo.id));
    return { selectedObjects: selected, availableObjects: available };
  }, [objects, selectedIds, selectedIdSet, objectsById]);

  return (
    <div className="fiori-object-list fiori-object-list--compact">
      {selectedObjects.length > 0 ? (
        <div className="fiori-master-picker-selected">
          {selectedObjects.map((mo) => (
            <MasterPickerRow key={mo.id} object={mo} isSelected onToggle={onToggle} />
          ))}
        </div>
      ) : null}
      {availableObjects.map((mo) => (
        <MasterPickerRow key={mo.id} object={mo} isSelected={false} onToggle={onToggle} />
      ))}
    </div>
  );
});

export function MigrationObjectFormDialog({
  open,
  onOpenChange,
  editingObject,
  formData,
  onFormChange,
  filteredMasterObjects,
  isMasterCatalogLoading = false,
  masterPickerEmptyHint = "Nenhum objeto disponível para cadastro.",
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
  const [chargeStartCalOpen, setChargeStartCalOpen] = useState(false);
  const [chargeEndCalOpen, setChargeEndCalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChargeStartDraft(formatBrazilianDateTime(formData.chargeStartTime));
    setChargeEndDraft(formatBrazilianDateTime(formData.chargeEndTime));
  }, [open, formData.chargeStartTime, formData.chargeEndTime]);

  useEffect(() => {
    if (!open) {
      setChargeStartCalOpen(false);
      setChargeEndCalOpen(false);
    }
  }, [open]);

  const selectedMasterIdSet = useMemo(() => new Set(selectedMasterIds), [selectedMasterIds]);

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

  const selectDatePart = (
    key: "chargeStartTime" | "chargeEndTime",
    date: Date | undefined,
    setDraft: (value: string) => void,
    setCalOpen: (open: boolean) => void,
  ) => {
    if (!date) return;
    const current = parseBrazilianLocalDateTime(formData[key]) ?? new Date();
    const merged = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      current.getHours(),
      current.getMinutes(),
      current.getSeconds(),
    );
    const iso = toIsoLocalSeconds(merged);
    onFormChange((prev) => ({ ...prev, [key]: iso }));
    setDraft(formatBrazilianDateTime(iso));
    setCalOpen(false);
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
  const fieldsLocked = !isAdmin || isMockLocked;

  const renderDateTimeField = (
    key: "chargeStartTime" | "chargeEndTime",
    label: string,
    draft: string,
    setDraft: (value: string) => void,
    date: Date | null,
    valid: boolean,
    calOpen: boolean,
    onCalOpenChange: (open: boolean) => void,
  ) => (
    <div className="fiori-form-field">
      <label className="fiori-field-label">
        <Clock className="h-3 w-3 text-[var(--fiori-brand)]" />
        {label}
      </label>
      <div className="fiori-datetime-field">
        <Input
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          disabled={fieldsLocked}
          value={draft}
          onChange={(e) => setDraft(formatBrazilianDateTimeInput(e.target.value))}
          onBlur={() => commitChargeDraft(key, draft, formData[key])}
          placeholder="dd/mm/aaaa, hh:mm:ss"
          aria-label={`Data e hora de ${label.toLowerCase()} da carga`}
          className={cn(
            "fiori-input fiori-input-datetime shadow-none",
            fieldsLocked && "readable-disabled",
          )}
        />
        <Popover open={calOpen} onOpenChange={onCalOpenChange}>
          <FioriPopoverIconButtonHint
            hint={`Abrir calendário — ${label.toLowerCase()} da carga`}
            disabled={fieldsLocked}
            className="fiori-icon-btn fiori-icon-btn-bordered fiori-datetime-field-trigger shrink-0"
            onMouseDown={(e) => e.preventDefault()}
          >
            <CalendarDays className="h-4 w-4" />
          </FioriPopoverIconButtonHint>
          <PopoverContent
            variant="fiori"
            className="fiori-datetime-popover"
            side="bottom"
            align="end"
            sideOffset={6}
            collisionPadding={16}
            sticky="partial"
          >
            <Calendar
              variant="fiori"
              mode="single"
              selected={valid && date ? date : undefined}
              onSelect={(d) => selectDatePart(key, d, setDraft, onCalOpenChange)}
              locale={ptBR}
              initialFocus
            />
            <div className="fiori-datetime-time">
              <span className="fiori-datetime-time-label">Hora</span>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={String((valid && date ? date : new Date()).getHours()).padStart(2, "0")}
                  onValueChange={(v) => updateTimePart(key, "hour", v)}
                >
                  <SelectTrigger className="fiori-select-trigger shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top" className="fiori-select-content max-h-40">
                    {hourOptions.map((h) => (
                      <SelectItem key={h} value={h} className="fiori-select-item">
                        {h}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String((valid && date ? date : new Date()).getMinutes()).padStart(2, "0")}
                  onValueChange={(v) => updateTimePart(key, "minute", v)}
                >
                  <SelectTrigger className="fiori-select-trigger shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top" className="fiori-select-content max-h-40">
                    {minuteSecondOptions.map((m) => (
                      <SelectItem key={m} value={m} className="fiori-select-item">
                        {m}m
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String((valid && date ? date : new Date()).getSeconds()).padStart(2, "0")}
                  onValueChange={(v) => updateTimePart(key, "second", v)}
                >
                  <SelectTrigger className="fiori-select-trigger shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top" className="fiori-select-content max-h-40">
                    {minuteSecondOptions.map((s) => (
                      <SelectItem key={s} value={s} className="fiori-select-item">
                        {s}s
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  return (
    <Dialog preserveDashboardScroll open={open} onOpenChange={onOpenChange}>
      <DialogContent
        open={open}
        overlayClassName="fiori-dialog-overlay"
        className={cn(
          "fiori-dialog flex w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]",
          editingObject
            ? "max-h-[min(92vh,520px)] max-w-3xl"
            : "h-[min(92vh,640px)] max-w-3xl",
          editingObject && "fiori-dialog--form fiori-dialog--object-exec-form",
        )}
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

        {!editingObject ? (
          <>
            <div className="shrink-0 space-y-3 px-5 pt-4 pb-2">
              <div className="fiori-search-shell">
                <Search className="fiori-search-icon" />
                <Input
                  placeholder="Pesquisar objetos no catálogo..."
                  className="fiori-search-input shadow-none"
                  value={searchMasterTerm}
                  onChange={(e) => onSearchMasterChange(e.target.value)}
                />
              </div>

              <div className="fiori-master-picker-header mb-0">
                <label className="fiori-field-label">
                  <Database className="h-3.5 w-3.5 text-[var(--fiori-brand)]" />
                  Objetos disponíveis
                </label>
                {filteredMasterObjects.length > 0 && (
                  <button type="button" onClick={onSelectAll} className="fiori-link-btn">
                    {filteredMasterObjects.every((mo) => selectedMasterIdSet.has(mo.id))
                      ? "Desmarcar todos"
                      : "Marcar todos"}
                  </button>
                )}
              </div>
            </div>

            <div className="fiori-master-object-picker-list custom-scrollbar min-h-0 flex-1 overflow-y-auto">
              {isMasterCatalogLoading ? (
                <div className="flex justify-center px-5 py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--fiori-brand)]" />
                </div>
              ) : filteredMasterObjects.length > 0 ? (
                <MasterObjectPickerList
                  objects={filteredMasterObjects}
                  selectedIds={selectedMasterIds}
                  onToggle={onToggleMaster}
                />
              ) : (
                <p className="fiori-empty-hint px-5 py-8 text-center">
                  {masterPickerEmptyHint}
                </p>
              )}
            </div>
          </>
        ) : (
        <div className="fiori-dialog-body custom-scrollbar">
                <div className="fiori-object-exec-summary">
                  <div className="fiori-object-exec-name">
                    <div className="fiori-object-exec-icon">
                      <Database className="h-3.5 w-3.5" />
                    </div>
                    <p className="truncate font-semibold uppercase text-[var(--fiori-text)]">
                      {formData.name}
                    </p>
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

                <section className="fiori-form-section">
                  <h3 className="fiori-section-title">
                    <Timer className="h-3 w-3" />
                    Monitoramento da carga
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {renderDateTimeField(
                      "chargeStartTime",
                      "Início",
                      chargeStartDraft,
                      setChargeStartDraft,
                      startDate,
                      startValid,
                      chargeStartCalOpen,
                      setChargeStartCalOpen,
                    )}
                    {renderDateTimeField(
                      "chargeEndTime",
                      "Término",
                      chargeEndDraft,
                      setChargeEndDraft,
                      endDate,
                      endValid,
                      chargeEndCalOpen,
                      setChargeEndCalOpen,
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="fiori-form-field">
                      <label className="fiori-field-label">Target</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatNumber(formData.targetRecordsCount)}
                        onChange={(e) => {
                          const formatted = formatNumberInput(e.target.value);
                          onFormChange((prev) => ({
                            ...prev,
                            targetRecordsCount: formatted ? unformatNumber(formatted) : 0,
                          }));
                        }}
                        className={cn(
                          "fiori-input tabular-nums shadow-none",
                          fieldsLocked && "readable-disabled",
                        )}
                        disabled={fieldsLocked}
                      />
                    </div>
                    <div className="fiori-form-field">
                      <label className="fiori-field-label" title="Target − Erro">
                        Carregado
                      </label>
                      <Input
                        type="text"
                        readOnly
                        tabIndex={-1}
                        value={formatNumber(
                          Math.max(0, formData.targetRecordsCount - formData.errorRecordsCount),
                        )}
                        className="fiori-input tabular-nums readable-disabled shadow-none"
                      />
                    </div>
                    <div className="fiori-form-field">
                      <label className="fiori-field-label">Sucesso</label>
                      <Input
                        type="text"
                        readOnly
                        tabIndex={-1}
                        value={formatNumber(formData.successfulRecordsCount)}
                        className="fiori-input fiori-input-success tabular-nums readable-disabled shadow-none"
                      />
                    </div>
                    <div className="fiori-form-field">
                      <label className="fiori-field-label">Erro</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatNumber(formData.errorRecordsCount)}
                        onChange={(e) => {
                          const formatted = formatNumberInput(e.target.value);
                          onFormChange((prev) => ({
                            ...prev,
                            errorRecordsCount: formatted ? unformatNumber(formatted) : 0,
                          }));
                        }}
                        className={cn(
                          "fiori-input fiori-input-error tabular-nums shadow-none",
                          fieldsLocked && "readable-disabled",
                        )}
                        disabled={fieldsLocked}
                      />
                    </div>
                    <div className="fiori-form-field col-span-2 sm:col-span-1">
                      <label className="fiori-field-label">Duração</label>
                      <Input
                        readOnly
                        tabIndex={-1}
                        value={formatDurationInput(formData.currentChargeDurationMs)}
                        className="fiori-input font-mono tabular-nums readable-disabled shadow-none"
                      />
                    </div>
                  </div>
                </section>

                <section className="fiori-form-section">
                  <h3 className="fiori-section-title">
                    <History className="h-3 w-3" />
                    Ciclo anterior
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="fiori-form-field">
                      <label className="fiori-field-label">Volume</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatNumber(formData.previousMigratedRecordsCount)}
                        onChange={(e) => {
                          const formatted = formatNumberInput(e.target.value);
                          onFormChange((prev) => ({
                            ...prev,
                            previousMigratedRecordsCount: formatted ? unformatNumber(formatted) : 0,
                          }));
                        }}
                        className={cn(
                          "fiori-input tabular-nums shadow-none",
                          fieldsLocked && "readable-disabled",
                        )}
                        disabled={fieldsLocked}
                      />
                    </div>
                    <div className="fiori-form-field">
                      <label className="fiori-field-label">Duração</label>
                      <Input
                        type="text"
                        placeholder="08H 30M 00S"
                        value={prevDurationInput}
                        onChange={onDurationInputChange}
                        className={cn(
                          "fiori-input font-mono tabular-nums shadow-none",
                          fieldsLocked && "readable-disabled",
                        )}
                        disabled={fieldsLocked}
                      />
                    </div>
                  </div>
                </section>
        </div>
        )}

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
