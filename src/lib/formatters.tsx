import React from "react";

// ─── Pure utility functions (no component state) ──────────────────────────

export function formatNumber(val: number | string, abbreviate: boolean = true): string {
    if (val === undefined || val === null || val === "") return "";
    const num =
        typeof val === "string"
            ? parseInt(val.replace(/\D/g, ""), 10)
            : val;
    if (isNaN(num)) return "0";

    // Design System Rule 7: Abbreviate values >= 1,000,000
    if (abbreviate && num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1).replace(".", ",")}M`;
    }

    return num.toLocaleString("pt-BR");
}

export function unformatNumber(val: string): number {
    return parseInt(val.replace(/\D/g, ""), 10) || 0;
}

/** Ex.: `(35) 98452-8545` — máscara celular/fixo BR (10 ou 11 dígitos). */
export function formatBrazilianPhone(value: string | undefined | null): string {
    const digits = String(value ?? "").replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";

    let formatted = `(${digits.slice(0, 2)}`;
    if (digits.length > 2) {
        formatted += `) ${digits.slice(2, digits.length > 10 ? 7 : 6)}`;
    }
    if (digits.length > 6) {
        formatted += digits.length > 10 ? `-${digits.slice(7, 11)}` : `-${digits.slice(6, 10)}`;
    }
    return formatted;
}

export function formatPercentage(
    pct: number,
    formatType?: "success" | "error" | "default",
    hasErrors: boolean = false,
): string {
    if (!pct || pct === 0) {
        if (formatType === "error" && hasErrors) return "0,01";
        return "0,00";
    }
    const formatted = pct.toFixed(2);
    if (formatType === "error" && hasErrors && formatted === "0.00")
        return "0,01";
    if (
        formatType === "success" &&
        hasErrors &&
        (pct >= 100 || formatted === "100.00")
    )
        return "99,99";
    if (pct >= 100) return "100,00";
    return formatted.replace(".", ",");
}

export function renderDuration(ms: number) {
    // Regra: Tempo mínimo 1m se houver duração > 0
    let sanitizedMs = ms || 0;
    if (sanitizedMs > 0 && sanitizedMs < 60000) {
        sanitizedMs = 60000;
    }

    const totalMinutes = Math.floor(sanitizedMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return (
        <span className="font-mono font-bold whitespace-nowrap">
            {hours.toString().padStart(2, "0")}h {minutes.toString().padStart(2, "0")}m
        </span>
    );
}

export function formatCommentDate(date: unknown): string {
    if (!date) return "...";
    const d = (date as any)?.toDate ? (date as any).toDate() : new Date(date as any);
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(d);
}

export function formatDateTime(dateString: string | undefined | null): string {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    } catch {
        return dateString;
    }
}

// Formata segundos para rótulos de barra:
// < 60s → "Xs"  |  < 3600s → "Xmin"  |  >= 3600s → "HHhMMm"
export function formatDurLabel(seconds: number): string {
    const s = Number(seconds || 0);
    if (s <= 0) return '0m';

    // Regra: Tempo mínimo 1 minuto (60s)
    const effectiveSeconds = Math.max(60, s);

    if (effectiveSeconds >= 3300) { // Mostra horas se for próximo a 1h (55min+)
        const h = Math.floor((effectiveSeconds + 30) / 3600);
        const m = Math.floor((effectiveSeconds % 3600) / 60);
        return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
    }

    return `${Math.round(effectiveSeconds / 60)}m`;
}

export function formatSecondsToHM(seconds: number): string {
    const s = Number(seconds || 0);
    if (s <= 0) return "00h 00m";

    // Regra: Tempo mínimo 1 minuto (60s)
    const effectiveSeconds = Math.max(60, s);

    const h = Math.floor(effectiveSeconds / 3600);
    const m = Math.floor((effectiveSeconds % 3600) / 60);
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
}

export function slugify(text: string): string {
    if (!text) return "";
    return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-")
        .substring(0, 50);
}
