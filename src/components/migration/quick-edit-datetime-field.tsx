"use client";

import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Clock, CalendarDays } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { FioriPopoverIconButtonHint } from "@/components/ui/fiori-icon-button-hint";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    formatBrazilianDateTime,
    formatBrazilianDateTimeInput,
    parseBrazilianLocalDateTime,
    toIsoLocalSeconds,
} from "@/lib/migration/datetime-br";

export type QuickEditDateTimeFieldHandle = {
    commit: () => string;
};

type QuickEditDateTimeFieldProps = {
    label: string;
    isoValue: string;
    onIsoChange: (iso: string) => void;
    readOnly?: boolean;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    inputId?: string;
};

export const QuickEditDateTimeField = memo(
    forwardRef<QuickEditDateTimeFieldHandle, QuickEditDateTimeFieldProps>(function QuickEditDateTimeField(
        { label, isoValue, onIsoChange, readOnly = false, inputRef, inputId },
        ref,
    ) {
        const [draft, setDraft] = useState(() => formatBrazilianDateTime(isoValue));
        const isoValueRef = useRef(isoValue);

        useEffect(() => {
            if (isoValueRef.current === isoValue) return;
            isoValueRef.current = isoValue;
            setDraft(formatBrazilianDateTime(isoValue));
        }, [isoValue]);

        const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);
        const minuteSecondOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);

        const parsedDate = parseBrazilianLocalDateTime(isoValue);
        const valid = !!parsedDate && !Number.isNaN(parsedDate.getTime());

        const commitDraft = (rawDraft: string): string => {
            const trimmed = rawDraft.trim();
            const currentIso = isoValueRef.current;
            if (!trimmed) {
                setDraft(formatBrazilianDateTime(currentIso));
                return currentIso;
            }
            const parsed = parseBrazilianLocalDateTime(trimmed);
            if (!parsed || Number.isNaN(parsed.getTime())) {
                setDraft(formatBrazilianDateTime(currentIso));
                return currentIso;
            }
            const iso = toIsoLocalSeconds(parsed);
            const br = formatBrazilianDateTime(iso);
            if (iso !== currentIso) {
                isoValueRef.current = iso;
                onIsoChange(iso);
            }
            setDraft(br);
            return iso;
        };

        useImperativeHandle(ref, () => ({
            commit: () => commitDraft(draft),
        }));

        const updateDatePart = (date: Date | undefined) => {
            if (!date) return;
            const current = parseBrazilianLocalDateTime(isoValueRef.current) ?? new Date();
            const merged = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                current.getHours(),
                current.getMinutes(),
                current.getSeconds(),
            );
            const iso = toIsoLocalSeconds(merged);
            isoValueRef.current = iso;
            onIsoChange(iso);
            setDraft(formatBrazilianDateTime(iso));
        };

        const updateTimePart = (part: "hour" | "minute" | "second", value: string) => {
            const base = parseBrazilianLocalDateTime(isoValueRef.current) ?? new Date();
            const h = part === "hour" ? Number(value) : base.getHours();
            const m = part === "minute" ? Number(value) : base.getMinutes();
            const s = part === "second" ? Number(value) : base.getSeconds();
            const merged = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, s);
            const iso = toIsoLocalSeconds(merged);
            isoValueRef.current = iso;
            onIsoChange(iso);
            setDraft(formatBrazilianDateTime(iso));
        };

        const displayDate = valid && parsedDate ? parsedDate : new Date();

        return (
            <div className="fiori-quick-edit-field">
                <label className="fiori-field-label">
                    <Clock className="h-3 w-3 text-[var(--fiori-brand)]" />
                    {label}
                </label>
                <div className="fiori-datetime-field">
                    <Input
                        ref={inputRef}
                        id={inputId}
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        spellCheck={false}
                        disabled={readOnly}
                        value={draft}
                        onChange={(e) => setDraft(formatBrazilianDateTimeInput(e.target.value))}
                        onBlur={() => commitDraft(draft)}
                        placeholder="dd/mm/aaaa, hh:mm:ss"
                        aria-label={`Data e hora de ${label.toLowerCase()} da carga`}
                        className="fiori-input fiori-input-datetime shadow-none"
                    />
                    <Popover>
                        <FioriPopoverIconButtonHint
                            hint={`Abrir calendário — ${label.toLowerCase()} da carga`}
                            disabled={readOnly}
                            tabIndex={-1}
                            className="fiori-icon-btn fiori-icon-btn-bordered fiori-datetime-field-trigger"
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
                                selected={valid && parsedDate ? parsedDate : undefined}
                                onSelect={updateDatePart}
                                locale={ptBR}
                                initialFocus
                            />
                            <div className="fiori-datetime-time">
                                <span className="fiori-datetime-time-label">Hora</span>
                                <div className="grid grid-cols-3 gap-2">
                                    <Select
                                        value={String(displayDate.getHours()).padStart(2, "0")}
                                        onValueChange={(v) => updateTimePart("hour", v)}
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
                                        value={String(displayDate.getMinutes()).padStart(2, "0")}
                                        onValueChange={(v) => updateTimePart("minute", v)}
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
                                        value={String(displayDate.getSeconds()).padStart(2, "0")}
                                        onValueChange={(v) => updateTimePart("second", v)}
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
    }),
);

QuickEditDateTimeField.displayName = "QuickEditDateTimeField";
