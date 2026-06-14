"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as FocusScope from "@radix-ui/react-focus-scope";
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
import { Loader2, Zap, Database, Timer } from "lucide-react";
import { FioriDialogContextFields } from "@/components/ui/fiori-dialog-context-fields";
import { formatNumber, unformatNumber, formatNumberInput } from "@/lib/migration/format-utils";
import { cn } from "@/lib/utils";
import {
    QuickEditDateTimeField,
    type QuickEditDateTimeFieldHandle,
} from "@/components/migration/quick-edit-datetime-field";

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
};

type MockQuickEditProps = BaseQuickEditProps & {
    mode: "mock";
    /** Valores iniciais ao abrir o diálogo (não precisa atualizar durante a digitação). */
    quickFormData: QuickFormData;
    onSave: (data: QuickFormData) => void;
};

export type QuickEditDialogProps = DashboardQuickEditProps | MockQuickEditProps;

function getCurrentLocalISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - offset);
    return localNow.toISOString().slice(0, 16);
}

function buildInitialFormData(
    quickEditObject: QuickEditObject,
    mockSeed?: QuickFormData,
): QuickFormData {
    if (mockSeed) return { ...mockSeed };

    const now = getCurrentLocalISO();
    const initialStart = quickEditObject.chargeStartTime || now;
    const initialEnd = quickEditObject.chargeEndTime || "";
    const initialTarget = quickEditObject.targetRecordsCount || 0;
    const initialError = quickEditObject.errorRecordsCount || 0;
    let initialProcessed = quickEditObject.processedRecordsCount || 0;
    if (initialProcessed === 0 && initialTarget > 0) {
        initialProcessed = initialTarget;
    }
    return {
        targetRecordsCount: initialTarget,
        processedRecordsCount: initialProcessed,
        errorRecordsCount: initialError,
        chargeStartTime: initialStart,
        chargeEndTime: initialEnd,
    };
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
    const wasOpenRef = useRef(false);

    const [formData, setFormData] = useState<QuickFormData>({
        targetRecordsCount: 0,
        processedRecordsCount: 0,
        errorRecordsCount: 0,
        chargeStartTime: "",
        chargeEndTime: "",
    });

    const [targetStr, setTargetStr] = useState("");
    const [processedStr, setProcessedStr] = useState("");
    const [errorStr, setErrorStr] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const firstFieldRef = useRef<HTMLInputElement>(null);
    const chargeStartFieldRef = useRef<QuickEditDateTimeFieldHandle>(null);
    const chargeEndFieldRef = useRef<QuickEditDateTimeFieldHandle>(null);

    useEffect(() => {
        if (!open) {
            wasOpenRef.current = false;
            return;
        }
        if (wasOpenRef.current || !quickEditObject) return;
        wasOpenRef.current = true;

        const mockSeed = isMock ? (props as MockQuickEditProps).quickFormData : undefined;
        const initialData = buildInitialFormData(quickEditObject, mockSeed);

        setFormData(initialData);
        setTargetStr(formatNumber(initialData.targetRecordsCount));
        setProcessedStr(formatNumber(initialData.processedRecordsCount));
        setErrorStr(formatNumber(initialData.errorRecordsCount));
        setIsSaving(false);
        // quickFormData lido só na abertura; omitido das deps de propósito
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, quickEditObject, isMock]);

    const patchFormData = useCallback((patch: Partial<QuickFormData>) => {
        setFormData((prev) => ({ ...prev, ...patch }));
    }, []);

    const handleChargeStartIsoChange = useCallback(
        (iso: string) => patchFormData({ chargeStartTime: iso }),
        [patchFormData],
    );
    const handleChargeEndIsoChange = useCallback(
        (iso: string) => patchFormData({ chargeEndTime: iso }),
        [patchFormData],
    );

    const handleDashboardNumberChange = (val: string, field: "target" | "processed" | "error") => {
        const formatted = formatNumberInput(val);
        const numVal = formatted ? unformatNumber(formatted) : 0;

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
                if (!formatted) {
                    setProcessedStr("");
                    nextProcessed = 0;
                } else {
                    nextProcessed = numVal;
                    setProcessedStr(formatted);
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
        const formatted = formatNumberInput(val);
        const numVal = formatted ? unformatNumber(formatted) : 0;

        if (field === "target") {
            setTargetStr(formatted);
            setFormData((prev) => {
                const errorCount = Math.max(0, prev.errorRecordsCount);
                return {
                    ...prev,
                    targetRecordsCount: numVal,
                    processedRecordsCount: Math.max(0, numVal - errorCount),
                };
            });
        } else {
            setErrorStr(formatted);
            setFormData((prev) => {
                const target = Math.max(0, prev.targetRecordsCount);
                return {
                    ...prev,
                    errorRecordsCount: numVal,
                    processedRecordsCount: Math.max(0, target - numVal),
                };
            });
        }
    };

    const handleMockBlur = (field: "target" | "error") => {
        if (field === "target") {
            const target = Math.max(0, unformatNumber(targetStr));
            setTargetStr(formatNumber(target));
            setFormData((prev) => {
                const errorCount = Math.max(0, prev.errorRecordsCount);
                return {
                    ...prev,
                    targetRecordsCount: target,
                    processedRecordsCount: Math.max(0, target - errorCount),
                };
            });
        } else {
            const errorCount = Math.max(0, unformatNumber(errorStr));
            setErrorStr(formatNumber(errorCount));
            setFormData((prev) => {
                const target = Math.max(0, prev.targetRecordsCount);
                return {
                    ...prev,
                    errorRecordsCount: errorCount,
                    processedRecordsCount: Math.max(0, target - errorCount),
                };
            });
        }
    };

    const successValue = Math.max(0, formData.processedRecordsCount - formData.errorRecordsCount);
    const computedCarregada = Math.max(0, formData.targetRecordsCount - formData.errorRecordsCount);

    const getDurationDisplay = () => {
        if (!formData.chargeStartTime || !formData.chargeEndTime) return "00H 00M 00S";
        const start = new Date(formData.chargeStartTime).getTime();
        const end = new Date(formData.chargeEndTime).getTime();
        if (isNaN(start) || isNaN(end) || end < start) return "00H 00M 00S";
        const diff = end - start;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${h.toString().padStart(2, "0")}H ${m.toString().padStart(2, "0")}M ${s.toString().padStart(2, "0")}S`;
    };

    const collectFormDataForSave = (): QuickFormData => ({
        ...formData,
        chargeStartTime: chargeStartFieldRef.current?.commit() ?? formData.chargeStartTime,
        chargeEndTime: chargeEndFieldRef.current?.commit() ?? formData.chargeEndTime,
    });

    const onSave = async () => {
        const data = collectFormDataForSave();
        setFormData(data);

        if (isMock) {
            props.onSave(data);
            return;
        }
        if (!props.handleSaveQuick) return;
        setIsSaving(true);
        try {
            await props.handleSaveQuick(data);
        } catch (err) {
            console.error("Erro no dialog ao salvar:", err);
            setIsSaving(false);
        }
    };

    return (
        <Dialog preserveDashboardScroll open={open} onOpenChange={(v) => !isSaving && onOpenChange(v)}>
            <DialogContent
                open={open}
                onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    requestAnimationFrame(() => {
                        firstFieldRef.current?.focus({ preventScroll: true });
                    });
                }}
                onCloseAutoFocus={(e) => {
                    e.preventDefault();
                }}
                className={cn(
                    "fiori-dialog fiori-dialog--quick-edit-form !flex w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)] [&>button]:hidden",
                    isMock
                        ? "max-h-[min(92vh,32rem)] max-w-2xl"
                        : "h-[min(34rem,calc(100dvh-2rem))] max-w-lg",
                )}
            >
                <FocusScope.Root trapped={open} loop className="flex min-h-0 flex-1 flex-col">
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

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="fiori-quick-edit-form-body">
                        <section className="fiori-quick-edit-section">
                            <h3 className="fiori-section-title">
                                <Timer className="h-3 w-3" />
                                Monitoramento da carga
                            </h3>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <QuickEditDateTimeField
                                    ref={chargeStartFieldRef}
                                    label="Início"
                                    isoValue={formData.chargeStartTime}
                                    onIsoChange={handleChargeStartIsoChange}
                                    readOnly={readOnly}
                                    inputRef={firstFieldRef}
                                    inputId="quick-edit-charge-start"
                                />
                                <QuickEditDateTimeField
                                    ref={chargeEndFieldRef}
                                    label="Término"
                                    isoValue={formData.chargeEndTime}
                                    onIsoChange={handleChargeEndIsoChange}
                                    readOnly={readOnly}
                                />
                            </div>
                        </section>

                        <section className="fiori-quick-edit-section">
                            <h3 className="fiori-section-title">
                                <Database className="h-3 w-3" />
                                Quantidades
                            </h3>
                            {isMock ? (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                    <div className="fiori-quick-edit-field">
                                        <label className="fiori-field-label">Qtd. target</label>
                                        <Input
                                            type="text"
                                            value={targetStr}
                                            onChange={(e) => handleMockNumberChange(e.target.value, "target")}
                                            onBlur={() => handleMockBlur("target")}
                                            className="fiori-input tabular-nums shadow-none"
                                        />
                                    </div>
                                    <div className="fiori-quick-edit-field">
                                        <label
                                            className="fiori-field-label"
                                            title="Calculado: Target − Erro"
                                        >
                                            Qtd. carregada
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
                                    <div className="fiori-quick-edit-field">
                                        <label className="fiori-field-label">Qtd. erro</label>
                                        <Input
                                            type="text"
                                            value={errorStr}
                                            onChange={(e) => handleMockNumberChange(e.target.value, "error")}
                                            onBlur={() => handleMockBlur("error")}
                                            className="fiori-input fiori-input-error tabular-nums shadow-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <div className="fiori-quick-edit-field">
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
                                        <div className="fiori-quick-edit-field">
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
                                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        <div className="fiori-quick-edit-field">
                                            <label className="fiori-field-label">Sucesso (auto)</label>
                                            <Input
                                                type="text"
                                                readOnly
                                                tabIndex={-1}
                                                value={formatNumber(successValue)}
                                                className="fiori-input fiori-input-success tabular-nums shadow-none"
                                            />
                                        </div>
                                        <div className="fiori-quick-edit-field">
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
                                        <div className="fiori-quick-edit-field">
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
                        </section>

                        {!isMock && (
                            <section className="fiori-quick-edit-section">
                                <h3 className="fiori-section-title">
                                    <Timer className="h-3 w-3" />
                                    Histórico do ciclo anterior
                                </h3>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div className="fiori-quick-edit-field">
                                        <label className="fiori-field-label">Volume anterior</label>
                                        <Input
                                            type="text"
                                            readOnly
                                            tabIndex={-1}
                                            value={formatNumber(quickEditObject?.targetRecordsCount || 0)}
                                            className="fiori-input tabular-nums bg-[#f5f6f7] shadow-none"
                                        />
                                    </div>
                                    <div className="fiori-quick-edit-field">
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
                            </section>
                        )}
                    </div>
                </div>

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
                </FocusScope.Root>
            </DialogContent>
        </Dialog>
    );
}

