"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogDescription,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { FioriPopoverIconButtonHint } from "@/components/ui/fiori-icon-button-hint";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarDays, Database, Lock, Package, Hash, FileText, Timer, Settings2 } from "lucide-react";
import { ptBR } from "date-fns/locale";

const FIORI_FIELD = "fiori-input shadow-none";
const FIORI_FIELD_UPPER = `${FIORI_FIELD} uppercase`;
const FIORI_TEXTAREA = "fiori-textarea shadow-none min-h-[3.5rem] resize-none";

function fioriFieldClass(readonly: boolean, uppercase = false): string {
    return cn(uppercase ? FIORI_FIELD_UPPER : FIORI_FIELD, readonly && "readable-disabled");
}

function fioriTextareaClass(readonly: boolean): string {
    return cn(FIORI_TEXTAREA, readonly && "readable-disabled");
}

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

/** ISO local `yyyy-mm-ddThh:mm:ss` → exibição `dd/mm/aaaa hh:mm:ss`. */
function formatBrDateTimeFromIso(iso: string) {
    if (!iso?.trim()) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** `dd/mm/aaaa hh:mm:ss` (espaço entre data e hora) → ISO local armazenado. */
function parseBrDateTimeToIso(text: string): string | null {
    const t = text.trim();
    const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const hh = Number(m[4]);
    const mi = Number(m[5]);
    const ss = Number(m[6]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || hh > 23 || mi > 59 || ss > 59) return null;
    const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}T${pad2(hh)}:${pad2(mi)}:${pad2(ss)}`;
}

const STATUS_LABELS: Record<string, string> = {
    PENDENTE: "Aberto",
    CARGA_EM_ANDAMENTO: "Em andamento",
    CARGA_CONCLUIDA: "Concluída",
    BLOQUEADO: "Bloqueado",
};

const STATUS_DOT_CLASS: Record<string, string> = {
    PENDENTE: "fiori-select-status-dot--neutral",
    CARGA_EM_ANDAMENTO: "fiori-select-status-dot--warning",
    CARGA_CONCLUIDA: "fiori-select-status-dot--success",
    BLOQUEADO: "fiori-select-status-dot--critical",
};

/** Bolinha na lista (CSS ::before) — não vai no ItemText, evita duplicar no trigger. */
const STATUS_ITEM_CLASS: Record<string, string> = {
    PENDENTE: "fiori-select-item--status-neutral",
    CARGA_EM_ANDAMENTO: "fiori-select-item--status-warning",
    CARGA_CONCLUIDA: "fiori-select-item--status-success",
    BLOQUEADO: "fiori-select-item--status-critical",
};

const STATUS_OPTIONS = [
    { value: "PENDENTE", label: STATUS_LABELS.PENDENTE },
    { value: "CARGA_EM_ANDAMENTO", label: STATUS_LABELS.CARGA_EM_ANDAMENTO },
    { value: "CARGA_CONCLUIDA", label: STATUS_LABELS.CARGA_CONCLUIDA },
    { value: "BLOQUEADO", label: STATUS_LABELS.BLOQUEADO },
] as const;

function parseLocalDateTime(value: string) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

interface MockDateTimeFieldProps {
    label: string;
    draft: string;
    onDraftChange: (value: string) => void;
    onCommit: () => void;
    isoValue: string;
    readonly: boolean;
    onDateSelect: (date: Date | undefined) => void;
    onTimeChange: (part: "hour" | "minute" | "second", value: string) => void;
    hourOptions: string[];
    minuteSecondOptions: string[];
    pickerAriaLabel: string;
}

function MockDateTimeField({
    label,
    draft,
    onDraftChange,
    onCommit,
    isoValue,
    readonly,
    onDateSelect,
    onTimeChange,
    hourOptions,
    minuteSecondOptions,
    pickerAriaLabel,
}: MockDateTimeFieldProps) {
    const date = parseLocalDateTime(isoValue);

    return (
        <div className="space-y-1">
            <label className="fiori-field-label">{label}</label>
            <div className="flex gap-2">
                <Input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={readonly}
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onBlur={onCommit}
                    placeholder="dd/mm/aaaa hh:mm:ss"
                    className={cn(fioriFieldClass(readonly), "min-w-0 flex-1")}
                />
                <Popover>
                    <FioriPopoverIconButtonHint
                        hint={pickerAriaLabel}
                        disabled={readonly}
                        className="fiori-icon-btn fiori-icon-btn-bordered shrink-0"
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
                            selected={date ?? undefined}
                            onSelect={onDateSelect}
                            locale={ptBR}
                            initialFocus
                        />
                        <div className="fiori-datetime-time">
                            <span className="fiori-datetime-time-label">Hora</span>
                            <div className="grid grid-cols-3 gap-2">
                                <Select
                                    value={String((date ?? new Date()).getHours()).padStart(2, "0")}
                                    onValueChange={(v) => onTimeChange("hour", v)}
                                >
                                    <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                    <SelectContent side="top" className="fiori-select-content max-h-40">
                                        {hourOptions.map((h) => (
                                            <SelectItem key={h} value={h} className="fiori-select-item">{h}h</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={String((date ?? new Date()).getMinutes()).padStart(2, "0")}
                                    onValueChange={(v) => onTimeChange("minute", v)}
                                >
                                    <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                    <SelectContent side="top" className="fiori-select-content max-h-40">
                                        {minuteSecondOptions.map((m) => (
                                            <SelectItem key={m} value={m} className="fiori-select-item">{m}m</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={String((date ?? new Date()).getSeconds()).padStart(2, "0")}
                                    onValueChange={(v) => onTimeChange("second", v)}
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
    );
}

interface MockFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingMock: any | null;
    formData: {
        name: string;
        sequence: string;
        explanatoryText: string;
        startDate: string;
        endDate: string;
        isLocked: boolean;
        status: string;
    };
    onFormChange: (data: any) => void;
    onSave: () => void;
    masterObjects: any[] | null;
    selectedMasters: Record<string, string[]>;
    onMasterSelect: (mockId: string, masterIds: string[]) => void;
    isViewOnly: boolean;
    isAdmin: boolean;
}

export function MockFormDialog({
    open,
    onOpenChange,
    editingMock,
    formData,
    onFormChange,
    onSave,
    masterObjects,
    selectedMasters = {},
    onMasterSelect,
    isViewOnly,
    isAdmin,
}: MockFormDialogProps) {
    const isMockLocked = (editingMock?.isLocked ?? false) || editingMock?.status === 'BLOQUEADO';
    const readonly = isViewOnly || !isAdmin || isMockLocked || (!!editingMock && editingMock.isActive === false);
    const isNew = !editingMock;

    const getTitle = () => {
        if (isMockLocked) return "Mock bloqueada";
        if (isNew && isAdmin) return "Nova mock";
        if (editingMock && !isViewOnly && isAdmin) return "Editar mock";
        return "Parâmetros da mock";
    };

    const handleMasterToggle = (masterId: string) => {
        const mockId = editingMock?.id || "new";
        const current = selectedMasters[mockId] || [];
        const updated = current.includes(masterId)
            ? current.filter((id) => id !== masterId)
            : [...current, masterId];
        onMasterSelect(mockId, updated);
    };

    const selectedCount = (() => {
        const mockId = editingMock?.id || "new";
        return (selectedMasters[mockId] || []).length;
    })();

    const [startDraft, setStartDraft] = useState("");
    const [endDraft, setEndDraft] = useState("");

    useEffect(() => {
        setStartDraft(formatBrDateTimeFromIso(formData.startDate));
    }, [formData.startDate]);

    useEffect(() => {
        setEndDraft(formatBrDateTimeFromIso(formData.endDate));
    }, [formData.endDate]);

    const commitStartDraft = () => {
        const t = startDraft.trim();
        if (!t) {
            onFormChange({ ...formData, startDate: "" });
            setStartDraft("");
            return;
        }
        const iso = parseBrDateTimeToIso(t);
        if (iso) {
            onFormChange({ ...formData, startDate: iso });
            setStartDraft(formatBrDateTimeFromIso(iso));
        } else {
            setStartDraft(formatBrDateTimeFromIso(formData.startDate));
        }
    };

    const commitEndDraft = () => {
        const t = endDraft.trim();
        if (!t) {
            onFormChange({ ...formData, endDate: "" });
            setEndDraft("");
            return;
        }
        const iso = parseBrDateTimeToIso(t);
        if (iso) {
            onFormChange({ ...formData, endDate: iso });
            setEndDraft(formatBrDateTimeFromIso(iso));
        } else {
            setEndDraft(formatBrDateTimeFromIso(formData.endDate));
        }
    };

    const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);
    const minuteSecondOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);

    const updateDatePart = (key: "startDate" | "endDate", date: Date | undefined) => {
        if (!date) return;
        const current = parseLocalDateTime(formData[key]) ?? new Date();
        const merged = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            current.getHours(),
            current.getMinutes(),
            current.getSeconds()
        );
        const yyyy = merged.getFullYear();
        const mm = String(merged.getMonth() + 1).padStart(2, "0");
        const dd = String(merged.getDate()).padStart(2, "0");
        const hh = String(merged.getHours()).padStart(2, "0");
        const mi = String(merged.getMinutes()).padStart(2, "0");
        const ss = String(merged.getSeconds()).padStart(2, "0");
        onFormChange({ ...formData, [key]: `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}` });
    };

    const updateTimePart = (key: "startDate" | "endDate", part: "hour" | "minute" | "second", value: string) => {
        const base = parseLocalDateTime(formData[key]) ?? new Date();
        const h = part === "hour" ? Number(value) : base.getHours();
        const m = part === "minute" ? Number(value) : base.getMinutes();
        const s = part === "second" ? Number(value) : base.getSeconds();
        const merged = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, s);
        const yyyy = merged.getFullYear();
        const mm = String(merged.getMonth() + 1).padStart(2, "0");
        const dd = String(merged.getDate()).padStart(2, "0");
        const hh = String(merged.getHours()).padStart(2, "0");
        const mi = String(merged.getMinutes()).padStart(2, "0");
        const ss = String(merged.getSeconds()).padStart(2, "0");
        onFormChange({ ...formData, [key]: `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}` });
    };

    const sortedMasterObjects = useMemo(() => {
        if (!masterObjects) return [];
        const seen = new Set<string>();
        const unique = masterObjects.filter((mo) => {
            const key = String(mo?.name ?? "").trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        return unique.sort((a, b) =>
            String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "pt-BR", { sensitivity: "base" })
        );
    }, [masterObjects]);

    const mockIdentifier = useMemo(() => {
        if (editingMock?.name) return editingMock.name;
        if (formData.name && formData.sequence) {
            return `${formData.name}-${formData.sequence}`.toUpperCase();
        }
        if (formData.name) return formData.name.toUpperCase();
        return null;
    }, [editingMock?.name, formData.name, formData.sequence]);

    const statusLabel = STATUS_LABELS[formData.status || "PENDENTE"] ?? formData.status;

    return (
        <Dialog preserveDashboardScroll open={open} onOpenChange={onOpenChange}>
            <DialogContent
                open={open}
                variant="fiori"
                overlayClassName="fiori-dialog-overlay"
                className="fiori-dialog fiori-dialog--form fiori-dialog--mock-form flex h-[min(92vh,560px)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
            >
                <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
                    <DialogDescription className="sr-only">
                        Formulário de configuração de mock.
                    </DialogDescription>
                    <div className="fiori-dialog-header-row">
                        <div className="fiori-dialog-icon shrink-0">
                            <Package className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="fiori-dialog-title">{getTitle()}</DialogTitle>
                            {mockIdentifier && (
                                <p className="fiori-dialog-subtitle truncate">{mockIdentifier}</p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {isMockLocked && (
                    <div className="fiori-message-warning shrink-0">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <p>Esta mock está bloqueada. Nenhuma informação pode ser alterada.</p>
                    </div>
                )}

                <div className="fiori-dialog-body">
                    {!isNew && (
                        <div className="fiori-mock-summary">
                            <div className="fiori-mock-summary-field">
                                <span className="fiori-field-label">Identificador</span>
                                <span className="fiori-mock-summary-value uppercase">{mockIdentifier ?? "—"}</span>
                            </div>
                            <div className="fiori-mock-summary-field">
                                <span className="fiori-field-label">Status</span>
                                <span className={cn(
                                    "fiori-mock-status-pill",
                                    formData.status === "CARGA_CONCLUIDA" && "fiori-mock-status-pill--success",
                                    formData.status === "CARGA_EM_ANDAMENTO" && "fiori-mock-status-pill--warning",
                                    formData.status === "BLOQUEADO" && "fiori-mock-status-pill--critical",
                                )}>
                                    {statusLabel}
                                </span>
                            </div>
                        </div>
                    )}

                    {isNew && (
                    <section className="fiori-form-section">
                        <h3 className="fiori-section-title">
                            <Hash className="h-3.5 w-3.5" />
                            Identificação
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-3 gap-y-2">
                            <div className="col-span-1 sm:col-span-8 space-y-1">
                                <label className="fiori-field-label">Nome (prefixo)</label>
                                <Input
                                    value={formData.name}
                                    readOnly
                                    placeholder="MOCK"
                                    className={fioriFieldClass(true, true)}
                                />
                            </div>

                            <div className="col-span-1 sm:col-span-4 space-y-1">
                                <label className="fiori-field-label">Parte numérica</label>
                                <Input
                                    value={formData.sequence}
                                    readOnly
                                    placeholder="01"
                                    className={cn(fioriFieldClass(true), "text-center")}
                                />
                            </div>

                            <div className="col-span-1 sm:col-span-12 fiori-id-preview">
                                <span className="fiori-id-preview-label">Identificador final</span>
                                <span className="fiori-id-preview-value uppercase">{formData.name || "—"}</span>
                                <span className="text-[var(--fiori-label)]">-</span>
                                <span className="fiori-id-preview-value fiori-id-preview-seq">{formData.sequence || "—"}</span>
                            </div>
                        </div>
                    </section>
                    )}

                    <section className="fiori-form-section">
                        <h3 className="fiori-section-title">
                            <FileText className="h-3.5 w-3.5" />
                            Texto explicativo
                        </h3>
                        <Textarea
                            value={formData.explanatoryText}
                            onChange={(e) =>
                                onFormChange({ ...formData, explanatoryText: e.target.value })
                            }
                            placeholder="Descreva o escopo e objetivos desta janela..."
                            disabled={readonly}
                            className={fioriTextareaClass(readonly)}
                        />
                    </section>

                    <section className="fiori-form-section">
                        <h3 className="fiori-section-title">
                            <Timer className="h-3.5 w-3.5" />
                            Período de execução
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <MockDateTimeField
                                label="Data início"
                                draft={startDraft}
                                onDraftChange={setStartDraft}
                                onCommit={commitStartDraft}
                                isoValue={formData.startDate}
                                readonly={readonly}
                                onDateSelect={(d) => updateDatePart("startDate", d)}
                                onTimeChange={(part, v) => updateTimePart("startDate", part, v)}
                                hourOptions={hourOptions}
                                minuteSecondOptions={minuteSecondOptions}
                                pickerAriaLabel="Selecionar data e hora — início"
                            />
                            <MockDateTimeField
                                label="Data fim"
                                draft={endDraft}
                                onDraftChange={setEndDraft}
                                onCommit={commitEndDraft}
                                isoValue={formData.endDate}
                                readonly={readonly}
                                onDateSelect={(d) => updateDatePart("endDate", d)}
                                onTimeChange={(part, v) => updateTimePart("endDate", part, v)}
                                hourOptions={hourOptions}
                                minuteSecondOptions={minuteSecondOptions}
                                pickerAriaLabel="Selecionar data e hora — fim"
                            />
                        </div>
                    </section>

                    <section className="fiori-form-section">
                        <h3 className="fiori-section-title">
                            <Settings2 className="h-3.5 w-3.5" />
                            Configuração
                        </h3>

                        {isAdmin && (
                            <div className="space-y-1 mb-3">
                                <label className="fiori-field-label">Status da mock</label>
                                <Select
                                    value={formData.status || "PENDENTE"}
                                    onValueChange={(value) =>
                                        onFormChange({ ...formData, status: value })
                                    }
                                    disabled={readonly}
                                >
                                    <SelectTrigger
                                        className={cn(
                                            "fiori-select-trigger fiori-select-trigger--status",
                                            readonly && "readable-disabled"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "fiori-select-status-dot",
                                                STATUS_DOT_CLASS[formData.status || "PENDENTE"]
                                            )}
                                            aria-hidden
                                        />
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    <SelectContent className="fiori-select-content fiori-select-content--status">
                                        {STATUS_OPTIONS.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                className={cn(
                                                    "fiori-select-item fiori-select-item--status",
                                                    STATUS_ITEM_CLASS[option.value]
                                                )}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {isNew && isAdmin && masterObjects && masterObjects.length > 0 && (
                            <div className="space-y-1 mb-3">
                                <div className="fiori-master-picker-header">
                                    <label className="fiori-field-label">
                                        <Database className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                                        Objetos master
                                    </label>
                                    {selectedCount > 0 && (
                                        <span className="text-[0.6875rem] font-semibold text-[var(--fiori-brand)]">
                                            {selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}
                                        </span>
                                    )}
                                </div>

                                <div className="fiori-picker-zone fiori-picker-zone--tall">
                                    <div className="flex flex-wrap gap-1.5">
                                        {sortedMasterObjects.map((mo) => {
                                            const mockId = editingMock?.id || "new";
                                            const isSelected = (selectedMasters[mockId] || []).includes(mo.id);
                                            return (
                                                <button
                                                    key={mo.id}
                                                    type="button"
                                                    onClick={() => !readonly && handleMasterToggle(mo.id)}
                                                    disabled={readonly}
                                                    className={cn(
                                                        "fiori-chip",
                                                        isSelected && "fiori-chip-selected",
                                                        readonly && "cursor-not-allowed opacity-60"
                                                    )}
                                                >
                                                    {mo.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {isAdmin && (
                            <div className="fiori-lock-row">
                                <div>
                                    <label className="fiori-field-label">Bloquear mock</label>
                                    <p className="fiori-field-hint mt-0.5">
                                        {formData.isLocked
                                            ? "Mock bloqueada para edição"
                                            : "Mock disponível para edição"}
                                    </p>
                                </div>
                                <Switch
                                    className="fiori-switch"
                                    checked={formData.isLocked}
                                    onCheckedChange={(checked) =>
                                        onFormChange({ ...formData, isLocked: checked })
                                    }
                                    disabled={readonly}
                                />
                            </div>
                        )}
                    </section>
                </div>

                <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="fiori-btn-ghost"
                    >
                        {readonly ? "Fechar" : "Cancelar"}
                    </button>
                    {!readonly && (
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={!formData.name || (isMockLocked && formData.isLocked === editingMock?.isLocked)}
                            className="fiori-btn-emphasized"
                        >
                            {editingMock ? "Salvar" : "Criar mock"}
                        </button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
