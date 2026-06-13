"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Loader2, CalendarDays, Zap, Database, Timer } from "lucide-react";
import { FioriDialogContextFields } from "@/components/ui/fiori-dialog-context-fields";
import { dashboardDialogContentProps, dashboardDialogRootProps } from "@/lib/dashboard/scroll-preservation";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { FioriPopoverIconButtonHint } from "@/components/ui/fiori-icon-button-hint";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ptBR } from "date-fns/locale";
import { formatNumber, unformatNumber } from "@/lib/migration/format-utils";
import {
    formatBrazilianDateTime,
    parseBrazilianLocalDateTime,
    toIsoLocalSeconds,
} from "@/lib/migration/datetime-br";

export interface QuickFormData {
    chargeStartTime: string;
    chargeEndTime: string;
    targetRecordsCount: number;
    processedRecordsCount: number;
    errorRecordsCount: number;
}

type QuickEditObject = {
    name?: string;
    chargeOrder?: string | number;
    chargeStartTime?: string | null;
    chargeEndTime?: string | null;
    targetRecordsCount?: number;
    processedRecordsCount?: number;
    errorRecordsCount?: number;
    currentChargeDurationMs?: number;
};

type BaseQuickEditProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quickEditObject: QuickEditObject | null;
    empresa?: string;
    projectName?: string;
    mockName?: string;
};

type DashboardQuickEditProps = BaseQuickEditProps & {
    mode?: "dashboard";
    handleSaveQuick?: (data: QuickFormData) => Promise<void> | void;
    readOnly?: boolean;
    preserveScroll?: boolean;
};

type MockQuickEditProps = BaseQuickEditProps & {
    mode: "mock";
    quickFormData: QuickFormData;
    onFormChange: (data: QuickFormData) => void;
    onSave: () => void;
};

export type QuickEditDialogProps = DashboardQuickEditProps | MockQuickEditProps;

function getCurrentLocalISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - offset);
    return localNow.toISOString().slice(0, 16);
}

export function QuickEditDialog(props: QuickEditDialogProps) {
    const {
        open,
        onOpenChange,
        quickEditObject,
        empresa,
        projectName,
        mockName,
    } = props;

    const isMock = props.mode === "mock";
    const readOnly = !isMock && (props.readOnly ?? false);
    const preserveScroll = !isMock && (props.preserveScroll ?? true);

    const [formData, setFormData] = useState<QuickFormData>({
        targetRecordsCount: 0,
        processedRecordsCount: 0,
        errorRecordsCount: 0,
        chargeStartTime: "",
        chargeEndTime: "",
    });

    const activeData = isMock ? props.quickFormData : formData;
    const setActiveData = isMock
        ? (props as MockQuickEditProps).onFormChange
        : (data: QuickFormData) => setFormData(data);

    const [targetStr, setTargetStr] = useState("");
    const [processedStr, setProcessedStr] = useState("");
    const [errorStr, setErrorStr] = useState("");
    const [chargeStartDraft, setChargeStartDraft] = useState("");
    const [chargeEndDraft, setChargeEndDraft] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);
    const minuteSecondOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);

    const startDate = parseBrazilianLocalDateTime(activeData.chargeStartTime);
    const endDate = parseBrazilianLocalDateTime(activeData.chargeEndTime);
    const startValid = !!startDate && !Number.isNaN(startDate.getTime());
    const endValid = !!endDate && !Number.isNaN(endDate.getTime());

    const updateDatePart = (key: "chargeStartTime" | "chargeEndTime", date: Date | undefined) => {
        if (!date) return;
        const current = parseBrazilianLocalDateTime(activeData[key]) ?? new Date();
        const merged = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            current.getHours(),
            current.getMinutes(),
            current.getSeconds()
        );
        const iso = toIsoLocalSeconds(merged);
        const br = formatBrazilianDateTime(iso);
        setActiveData({ ...activeData, [key]: iso });
        if (key === "chargeStartTime") setChargeStartDraft(br);
        else setChargeEndDraft(br);
    };

    const updateTimePart = (key: "chargeStartTime" | "chargeEndTime", part: "hour" | "minute" | "second", value: string) => {
        const base = parseBrazilianLocalDateTime(activeData[key]) ?? new Date();
        const h = part === "hour" ? Number(value) : base.getHours();
        const m = part === "minute" ? Number(value) : base.getMinutes();
        const s = part === "second" ? Number(value) : base.getSeconds();
        const merged = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, s);
        const iso = toIsoLocalSeconds(merged);
        const br = formatBrazilianDateTime(iso);
        setActiveData({ ...activeData, [key]: iso });
        if (key === "chargeStartTime") setChargeStartDraft(br);
        else setChargeEndDraft(br);
    };

    const commitChargeInput = (key: "chargeStartTime" | "chargeEndTime", draft: string) => {
        const trimmed = draft.trim();
        const currentIso = activeData[key];
        const revert = () => {
            const s = formatBrazilianDateTime(currentIso);
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
        const br = formatBrazilianDateTime(iso);
        setActiveData({ ...activeData, [key]: iso });
        if (key === "chargeStartTime") setChargeStartDraft(br);
        else setChargeEndDraft(br);
    };

    useEffect(() => {
        if (!open || !quickEditObject || isMock) return;
        const now = getCurrentLocalISO();
        const initialStart = quickEditObject.chargeStartTime || now;
        const initialEnd = quickEditObject.chargeEndTime || "";
        const initialTarget = quickEditObject.targetRecordsCount || 0;
        const initialError = quickEditObject.errorRecordsCount || 0;
        let initialProcessed = quickEditObject.processedRecordsCount || 0;
        if (initialProcessed === 0 && initialTarget > 0) {
            initialProcessed = initialTarget;
        }
        const initialData: QuickFormData = {
            targetRecordsCount: initialTarget,
            processedRecordsCount: initialProcessed,
            errorRecordsCount: initialError,
            chargeStartTime: initialStart,
            chargeEndTime: initialEnd,
        };
        setFormData(initialData);
        setTargetStr(formatNumber(initialData.targetRecordsCount));
        setProcessedStr(formatNumber(initialData.processedRecordsCount));
        setErrorStr(formatNumber(initialData.errorRecordsCount));
        setChargeStartDraft(formatBrazilianDateTime(initialData.chargeStartTime));
        setChargeEndDraft(formatBrazilianDateTime(initialData.chargeEndTime));
        setIsSaving(false);
    }, [open, quickEditObject, isMock]);

    useEffect(() => {
        if (!open || !isMock) return;
        setTargetStr(formatNumber(activeData.targetRecordsCount));
        setErrorStr(formatNumber(activeData.errorRecordsCount));
        setChargeStartDraft(formatBrazilianDateTime(activeData.chargeStartTime));
        setChargeEndDraft(formatBrazilianDateTime(activeData.chargeEndTime));
    }, [
        open,
        isMock,
        activeData.targetRecordsCount,
        activeData.errorRecordsCount,
        activeData.chargeStartTime,
        activeData.chargeEndTime,
    ]);

    const handleDashboardNumberChange = (val: string, field: "target" | "processed" | "error") => {
        const digits = val.replace(/\D/g, "");
        const formatted = formatNumber(parseInt(digits || "0", 10));
        const numVal = unformatNumber(formatted);

        setFormData((prev) => {
            let nextTarget = prev.targetRecordsCount;
            let nextError = prev.errorRecordsCount;
            let nextProcessed = prev.processedRecordsCount;

            if (field === "target") {
                nextTarget = numVal;
                setTargetStr(formatted);
                nextProcessed = nextTarget;
                setProcessedStr(formatNumber(nextProcessed));
            } else if (field === "error") {
                nextError = numVal;
                setErrorStr(formatted);
            } else if (field === "processed") {
                const rawDigits = val.replace(/\D/g, "");
                if (rawDigits === "") {
                    setProcessedStr("");
                    nextProcessed = 0;
                } else {
                    const formattedProc = formatNumber(parseInt(rawDigits, 10));
                    nextProcessed = unformatNumber(formattedProc);
                    setProcessedStr(formattedProc);
                }
            }

            return {
                ...prev,
                targetRecordsCount: nextTarget,
                errorRecordsCount: nextError,
                processedRecordsCount: nextProcessed,
            };
        });
    };

    const handleMockNumberChange = (val: string, field: "target" | "error") => {
        if (field === "target") {
            setTargetStr(val);
            const target = Math.max(0, unformatNumber(val));
            const errorCount = Math.max(0, activeData.errorRecordsCount);
            setActiveData({
                ...activeData,
                targetRecordsCount: target,
                processedRecordsCount: Math.max(0, target - errorCount),
            });
        } else {
            setErrorStr(val);
            const errorCount = Math.max(0, unformatNumber(val));
            const target = Math.max(0, activeData.targetRecordsCount);
            setActiveData({
                ...activeData,
                errorRecordsCount: errorCount,
                processedRecordsCount: Math.max(0, target - errorCount),
            });
        }
    };

    const handleMockBlur = (field: "target" | "error") => {
        if (field === "target") {
            const target = Math.max(0, unformatNumber(targetStr));
            setTargetStr(formatNumber(target));
            const errorCount = Math.max(0, activeData.errorRecordsCount);
            setActiveData({
                ...activeData,
                targetRecordsCount: target,
                processedRecordsCount: Math.max(0, target - errorCount),
            });
        } else {
            const errorCount = Math.max(0, unformatNumber(errorStr));
            setErrorStr(formatNumber(errorCount));
            const target = Math.max(0, activeData.targetRecordsCount);
            setActiveData({
                ...activeData,
                errorRecordsCount: errorCount,
                processedRecordsCount: Math.max(0, target - errorCount),
            });
        }
    };

    const successValue = Math.max(0, activeData.processedRecordsCount - activeData.errorRecordsCount);
    const computedCarregada = Math.max(0, activeData.targetRecordsCount - activeData.errorRecordsCount);

    const getDurationDisplay = () => {
        if (!activeData.chargeStartTime || !activeData.chargeEndTime) return "00H 00M 00S";
        const start = new Date(activeData.chargeStartTime).getTime();
        const end = new Date(activeData.chargeEndTime).getTime();
        if (isNaN(start) || isNaN(end) || end < start) return "00H 00M 00S";
        const diff = end - start;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${h.toString().padStart(2, "0")}H ${m.toString().padStart(2, "0")}M ${s.toString().padStart(2, "0")}S`;
    };

    const onSave = async () => {
        if (isMock) {
            props.onSave();
            return;
        }
        if (!props.handleSaveQuick) return;
        setIsSaving(true);
        try {
            await props.handleSaveQuick(formData);
        } catch (err) {
            console.error("Erro no dialog ao salvar:", err);
            setIsSaving(false);
        }
    };

    const dialogRootProps = preserveScroll ? dashboardDialogRootProps : {};
    const dialogContentProps = preserveScroll ? dashboardDialogContentProps : {};

    const renderDateTimeField = (
        key: "chargeStartTime" | "chargeEndTime",
        label: string,
        draft: string,
        setDraft: (v: string) => void,
        date: Date | null,
        valid: boolean,
        stackLayout: boolean
    ) => (
        <div className={stackLayout ? "space-y-1.5" : "space-y-1.5"}>
            <label className="fiori-field-label">
                <Clock className="h-3.5 w-3.5 text-[var(--fiori-brand)]" />
                {label}
            </label>
            <div className="flex gap-2">
                <Input
                    type="text"
                    disabled={readOnly}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitChargeInput(key, draft)}
                    placeholder="dd/mm/aaaa hh:mm:ss"
                    autoComplete="off"
                    aria-label={`Data e hora de ${label.toLowerCase()} da carga`}
                    className="fiori-input min-w-0 flex-1 font-mono tabular-nums shadow-none"
                />
                <Popover>
                    <FioriPopoverIconButtonHint
                        hint={`Abrir calendário — ${label.toLowerCase()} da carga`}
                        disabled={readOnly}
                        className="fiori-icon-btn fiori-icon-btn-bordered"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <CalendarDays className="h-4 w-4" />
                    </FioriPopoverIconButtonHint>
                    <PopoverContent variant="fiori" className="w-auto max-h-[85vh] overflow-y-auto p-3" align="start">
                        <div className="space-y-3">
                            <Calendar
                                mode="single"
                                selected={valid && date ? date : undefined}
                                onSelect={(d) => updateDatePart(key, d)}
                                locale={ptBR}
                                initialFocus
                            />
                            <div className="grid grid-cols-3 gap-2">
                                <Select
                                    value={String((valid && date ? date : new Date()).getHours()).padStart(2, "0")}
                                    onValueChange={(v) => updateTimePart(key, "hour", v)}
                                >
                                    <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                    <SelectContent side="top" className="fiori-select-content max-h-40">
                                        {hourOptions.map((h) => <SelectItem key={h} value={h} className="fiori-select-item">{h}h</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={String((valid && date ? date : new Date()).getMinutes()).padStart(2, "0")}
                                    onValueChange={(v) => updateTimePart(key, "minute", v)}
                                >
                                    <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                    <SelectContent side="top" className="fiori-select-content max-h-40">
                                        {minuteSecondOptions.map((m) => <SelectItem key={m} value={m} className="fiori-select-item">{m}m</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={String((valid && date ? date : new Date()).getSeconds()).padStart(2, "0")}
                                    onValueChange={(v) => updateTimePart(key, "second", v)}
                                >
                                    <SelectTrigger className="fiori-select-trigger"><SelectValue /></SelectTrigger>
                                    <SelectContent side="top" className="fiori-select-content max-h-40">
                                        {minuteSecondOptions.map((s) => <SelectItem key={s} value={s} className="fiori-select-item">{s}s</SelectItem>)}
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
        <Dialog open={open} onOpenChange={(v) => !isSaving && onOpenChange(v)} {...dialogRootProps}>
            <DialogContent
                open={open}
                overlayClassName={preserveScroll ? undefined : "fiori-dialog-overlay"}
                className="fiori-dialog !flex h-[min(36rem,calc(100dvh-2rem))] w-[calc(100vw-1rem)] max-w-[480px] flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)] [&>button]:hidden"
                {...dialogContentProps}
            >
                <DialogHeader className="fiori-dialog-header shrink-0 space-y-0">
                    <DialogDescription className="sr-only">
                        {readOnly
                            ? "Consulta dos dados de ciclo de carga do objeto selecionado."
                            : "Edição rápida dos dados de ciclo de carga do objeto selecionado."}
                    </DialogDescription>
                    <div className="flex items-center gap-3">
                        <div className="fiori-dialog-icon shrink-0">
                            <Zap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="fiori-dialog-title-row">
                                <DialogTitle className="fiori-dialog-title shrink-0">
                                    {readOnly ? "Detalhamento da execução" : "Edição rápida de ciclo"}
                                </DialogTitle>
                                <FioriDialogContextFields empresa={empresa} projectName={projectName} mockName={mockName} />
                            </div>
                            {quickEditObject?.name && (
                                <DialogDescription className="fiori-dialog-subtitle truncate">
                                    {quickEditObject.name}
                                </DialogDescription>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-4 px-5 py-4">
                        <div className="fiori-object-exec-summary">
                            <div className="fiori-object-exec-name">
                                <div className="fiori-object-exec-icon">
                                    <Database className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="fiori-field-label">{isMock ? "Objeto" : "Objeto técnico"}</span>
                                    <p className="truncate text-sm font-semibold uppercase text-[var(--fiori-text)]">
                                        {quickEditObject?.name}
                                    </p>
                                </div>
                            </div>
                            {isMock ? (
                                <span className="fiori-chip bg-[var(--fiori-brand-light)] text-[var(--fiori-brand)] border-[var(--fiori-brand-light)]">
                                    Ativo
                                </span>
                            ) : (
                                <div className="fiori-object-exec-field">
                                    <span className="fiori-field-label">Grupo / ordem</span>
                                    <span className="fiori-chip bg-[var(--fiori-brand-light)] text-[var(--fiori-brand)] border-[var(--fiori-brand-light)]">
                                        {quickEditObject?.chargeOrder || "G1 - 01.00"}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="fiori-section-title">
                                <Timer className="h-3.5 w-3.5" />
                                Monitoramento da carga
                            </h3>
                            <div className={isMock ? "space-y-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
                                {renderDateTimeField("chargeStartTime", "Início", chargeStartDraft, setChargeStartDraft, startDate, startValid, isMock)}
                                {renderDateTimeField("chargeEndTime", "Término", chargeEndDraft, setChargeEndDraft, endDate, endValid, isMock)}
                            </div>
                        </div>

                        <div>
                            <h3 className="fiori-section-title">
                                <Database className="h-3.5 w-3.5" />
                                Quantidades
                            </h3>
                            {isMock ? (
                                <>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label className="fiori-field-label">Qtd. target</label>
                                            <Input
                                                type="text"
                                                value={targetStr}
                                                onChange={(e) => handleMockNumberChange(e.target.value, "target")}
                                                onBlur={() => handleMockBlur("target")}
                                                className="fiori-input tabular-nums shadow-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="fiori-field-label">
                                                Qtd. carregada
                                                <span className="font-normal text-[var(--fiori-label)]"> (Target − Erro)</span>
                                            </label>
                                            <Input
                                                type="text"
                                                readOnly
                                                tabIndex={-1}
                                                value={formatNumber(computedCarregada)}
                                                title="Calculado automaticamente: Qtd. Target − Qtd. Erro"
                                                aria-label="Quantidade carregada, igual a Target menos Erro"
                                                className="fiori-input tabular-nums bg-[#f5f6f7] shadow-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3 space-y-1.5">
                                        <label className="fiori-field-label">Qtd. erro</label>
                                        <Input
                                            type="text"
                                            value={errorStr}
                                            onChange={(e) => handleMockNumberChange(e.target.value, "error")}
                                            onBlur={() => handleMockBlur("error")}
                                            className="fiori-input fiori-input-error tabular-nums shadow-none"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label className="fiori-field-label">Total target</label>
                                            <Input
                                                type="text"
                                                disabled={readOnly}
                                                value={targetStr}
                                                onChange={(e) => handleDashboardNumberChange(e.target.value, "target")}
                                                onBlur={() => setTargetStr(formatNumber(unformatNumber(targetStr)))}
                                                className="fiori-input tabular-nums shadow-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="fiori-field-label">Total processado</label>
                                            <Input
                                                type="text"
                                                disabled={readOnly}
                                                value={processedStr}
                                                onChange={(e) => handleDashboardNumberChange(e.target.value, "processed")}
                                                onFocus={() => {
                                                    if (readOnly) return;
                                                    if (processedStr.replace(/\D/g, "") === "") {
                                                        const t = unformatNumber(targetStr);
                                                        setProcessedStr(formatNumber(t));
                                                        setFormData((prev) => ({ ...prev, processedRecordsCount: t }));
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (readOnly) return;
                                                    if (processedStr.trim() === "") {
                                                        const t = unformatNumber(targetStr);
                                                        setProcessedStr(formatNumber(t));
                                                        setFormData((prev) => ({ ...prev, processedRecordsCount: t }));
                                                    } else {
                                                        setProcessedStr(formatNumber(unformatNumber(processedStr)));
                                                    }
                                                }}
                                                className="fiori-input tabular-nums shadow-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div className="space-y-1.5">
                                            <label className="fiori-field-label">Sucesso (auto)</label>
                                            <Input
                                                type="text"
                                                readOnly
                                                tabIndex={-1}
                                                value={formatNumber(successValue)}
                                                className="fiori-input fiori-input-success tabular-nums shadow-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="fiori-field-label">Total erro</label>
                                            <Input
                                                type="text"
                                                disabled={readOnly}
                                                value={errorStr}
                                                onChange={(e) => handleDashboardNumberChange(e.target.value, "error")}
                                                onBlur={() => setErrorStr(formatNumber(unformatNumber(errorStr)))}
                                                className="fiori-input fiori-input-error tabular-nums shadow-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="fiori-field-label">Duração</label>
                                            <Input
                                                type="text"
                                                readOnly
                                                tabIndex={-1}
                                                value={getDurationDisplay()}
                                                className="fiori-input font-mono tabular-nums bg-[#f5f6f7] shadow-none"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {!isMock && (
                            <div className="border-t border-[var(--fiori-border-light)] pt-4">
                                <h3 className="fiori-section-title">
                                    <Clock className="h-3.5 w-3.5" />
                                    Histórico do ciclo anterior
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="fiori-field-label">Volume anterior</label>
                                        <Input
                                            type="text"
                                            readOnly
                                            tabIndex={-1}
                                            value={formatNumber(quickEditObject?.targetRecordsCount || 0)}
                                            className="fiori-input tabular-nums bg-[#f5f6f7] shadow-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="fiori-field-label">Duração anterior</label>
                                        <Input
                                            type="text"
                                            readOnly
                                            tabIndex={-1}
                                            value={quickEditObject?.currentChargeDurationMs ? getDurationDisplay() : "00H 01M 00S"}
                                            className="fiori-input font-mono tabular-nums bg-[#f5f6f7] shadow-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        className="fiori-btn-ghost"
                    >
                        {readOnly ? "Fechar" : "Cancelar"}
                    </Button>
                    {!readOnly && (
                        <Button
                            type="button"
                            onClick={onSave}
                            disabled={isSaving}
                            className="fiori-btn-emphasized"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    Salvando…
                                </>
                            ) : (
                                "Salvar ciclo"
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
