"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Mail, Copy, ExternalLink, Send, Loader2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { doc, Firestore } from "firebase/firestore";
import type { EmailSignature } from "@/types/migration";
import { EmailMultiSelect } from "@/components/email/email-multi-select";
import type { EmailRecipientSelection } from "@/types/email";
import { useEmailRecipients } from "@/hooks/use-email-contacts";
import { cn } from "@/lib/utils";

export type { EmailSignature };

export interface StatEmailRow {
    migrador: string;
    dataMigr: string;
    hrExecMig: string;
    empresa: string;
    objeto: string;
    isInProgress: boolean;
    ok: number;
    erro: number | string;
    processados: number;
    pctOk: string;
    pctErro: string;
    dataModif: string;
    horaModif: string;
    tempTrab: string;
}

export interface ErrorEmailRow {
    migrador: string;
    dataMigr: string;
    hrExecMig: string;
    empresa: string;
    objeto: string;
    errorId: string;
    errorNumber: string;
    count: number;
    message: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    rows: StatEmailRow[];
    mockName: string;
    signatures: EmailSignature[];
    fromEmail?: string;
    /**
     * @deprecated Usar recipientSelections no lugar de toSuggestions
     */
    toSuggestions?: string[];
    /** Seleções de destinatários (contatos e/ou agrupadores) */
    recipientSelections?: EmailRecipientSelection[];
    /** Callback quando as seleções mudam */
    onRecipientSelectionsChange?: (selections: EmailRecipientSelection[]) => void;
    errorRows?: ErrorEmailRow[];
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
}

const HEADERS = [
    "Data migr.", "Hora exec.", "Objeto",
    "OK", "Erro", "Processados", "% OK", "% erro",
    "Modificado", "Hora mod.", "Tempo trab.",
];
const RIGHT_COLS = new Set([3, 4, 5, 6, 7]);
const CENTER_COLS = new Set([0, 1, 8, 9, 10]);

const EMAIL_TABLE_STYLE = {
    headerBg: "#f5f6f7",
    headerColor: "#6a6d70",
    textColor: "#32363a",
    border: "#e5e5e5",
    zebra: "#fafafa",
};

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function rowToArray(r: StatEmailRow): string[] {
    return [
        r.dataMigr,
        r.hrExecMig,
        r.objeto,
        typeof r.ok === "number" ? r.ok.toLocaleString("pt-BR") : String(r.ok),
        typeof r.erro === "number" ? r.erro.toLocaleString("pt-BR") : String(r.erro),
        typeof r.processados === "number" ? r.processados.toLocaleString("pt-BR") : String(r.processados),
        r.pctOk,
        r.pctErro,
        r.dataModif,
        r.horaModif,
        r.tempTrab,
    ];
}

function buildHtmlTable(rows: StatEmailRow[]) {
    const thStyle = `background:${EMAIL_TABLE_STYLE.headerBg};color:${EMAIL_TABLE_STYLE.headerColor};font-weight:600;font-size:10pt;padding:4px 8px;border:1px solid ${EMAIL_TABLE_STYLE.border};text-align:center;white-space:nowrap;`;
    const headerCells = HEADERS.map(
        h => `<th style="${thStyle}">${escapeHtml(h)}</th>`
    ).join("");
    const dataRows = rows.map((r, ri) => {
        const bg = ri % 2 === 1 ? `background:${EMAIL_TABLE_STYLE.zebra};` : "";
        const cells = rowToArray(r).map((c, i) => {
            const align = RIGHT_COLS.has(i) ? "right" : CENTER_COLS.has(i) ? "center" : "left";
            return `<td style="font-size:10pt;padding:4px 8px;border:1px solid ${EMAIL_TABLE_STYLE.border};text-align:${align};color:${EMAIL_TABLE_STYLE.textColor};${bg}">${escapeHtml(c)}</td>`;
        }).join("");
        return `<tr>${cells}</tr>`;
    }).join("");
    return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Calibri,sans-serif;font-size:10pt;"><thead><tr>${headerCells}</tr></thead><tbody>${dataRows}</tbody></table>`;
}

function buildPlainTable(rows: StatEmailRow[]) {
    const lines = [HEADERS.join("\t")];
    rows.forEach(r => lines.push(rowToArray(r).join("\t")));
    return lines.join("\n");
}

const ERROR_HEADERS = ["Data migr.", "Hora exec.", "Objeto", "Erro ID", "Cód. erro", "Ocorrências", "Mensagem"];
const ERROR_RIGHT_COLS = new Set([5]);
const ERROR_CENTER_COLS = new Set([0, 1]);

function buildErrorHtmlTable(rows: ErrorEmailRow[]) {
    const thStyle = `background:${EMAIL_TABLE_STYLE.headerBg};color:${EMAIL_TABLE_STYLE.headerColor};font-weight:600;font-size:10pt;padding:4px 8px;border:1px solid ${EMAIL_TABLE_STYLE.border};text-align:center;white-space:nowrap;`;
    const headerCells = ERROR_HEADERS.map(
        h => `<th style="${thStyle}">${escapeHtml(h)}</th>`
    ).join("");
    const dataRows = rows.map((r, ri) => {
        const bg = ri % 2 === 1 ? `background:${EMAIL_TABLE_STYLE.zebra};` : "";
        const cells = [r.dataMigr, r.hrExecMig, r.objeto, r.errorId, r.errorNumber, r.count.toLocaleString("pt-BR"), r.message]
            .map((c, i) => {
                const align = ERROR_RIGHT_COLS.has(i) ? "right" : ERROR_CENTER_COLS.has(i) ? "center" : "left";
                return `<td style="font-size:10pt;padding:4px 8px;border:1px solid ${EMAIL_TABLE_STYLE.border};text-align:${align};color:${EMAIL_TABLE_STYLE.textColor};${bg}">${escapeHtml(c)}</td>`;
            }).join("");
        return `<tr>${cells}</tr>`;
    }).join("");
    return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Calibri,sans-serif;font-size:10pt;"><thead><tr>${headerCells}</tr></thead><tbody>${dataRows}</tbody></table>`;
}

export function EmailComposeDialog({ open, onClose, rows, mockName, signatures, fromEmail, toSuggestions: _toSuggestions = [], recipientSelections: externalRecipientSelections, onRecipientSelectionsChange, errorRows = [] }: Props) {
    const { toast } = useToast();
    const db = useFirestore();
    const { user: authUser } = useUser();
    const smtpDocRef = useMemoFirebase(() => (db ? doc(db as Firestore, "appConfig", "smtpConfig") : null), [db]);
    const { data: smtpData } = useDoc<any>(smtpDocRef);
    const smtpUser = smtpData?.user ?? "";
    const { resolveEmails } = useEmailRecipients();

    const isSingle = rows.length === 1;
    const greeting = getGreeting();

    const defaultSubject = () =>
        isSingle ? `carga ${rows[0]?.objeto} - ${mockName}` : `carga - ${mockName}`;

    const bodyIntro = isSingle
        ? `Segue status da carga do ${rows[0]?.objeto} - ${mockName}.`
        : `Segue status da carga dos objetos - ${mockName}.`;

    const [from, setFrom] = useState(authUser?.email || fromEmail || smtpUser || "");
    // Estado interno para seleções de destinatários
    const [internalRecipientSelections, setInternalRecipientSelections] = useState<EmailRecipientSelection[]>([]);
    // Usa estado externo se fornecido, senão usa o interno
    const recipientSelections = externalRecipientSelections ?? internalRecipientSelections;
    const setRecipientSelections = onRecipientSelectionsChange ?? setInternalRecipientSelections;
    // Campo "to" agora é derivado das seleções
    const to = resolveEmails(recipientSelections).join("; ");

    const [subject, setSubject] = useState("");
    const [selectedSigId, setSelectedSigId] = useState("__none__");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (open) {
            setSubject(defaultSubject());
            setRecipientSelections([]);
            setFrom(authUser?.email || fromEmail || smtpUser || "");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intencionalmente omite defaultSubject/fromEmail para evitar loops; reage via open + authUser + smtpUser
    }, [open, authUser, smtpUser]);

    useEffect(() => {
        if (authUser?.email) setFrom(authUser.email);
        else if (fromEmail) setFrom(fromEmail);
        else if (smtpUser) setFrom(smtpUser);
    }, [authUser, fromEmail, smtpUser]);

    useEffect(() => {
        if (signatures.length > 0 && selectedSigId === "__none__") {
            setSelectedSigId(signatures[0].id);
        }
    }, [signatures, selectedSigId]);

    const selectedSig = selectedSigId !== "__none__"
        ? (signatures.find(s => s.id === selectedSigId) ?? null)
        : null;

    const SIG_FONT = '"72 Condensed", Calibri, Arial, sans-serif';

    const buildPlainBody = () => {
        const parts = [`${greeting}.`, "", bodyIntro, "", buildPlainTable(rows)];
        if (selectedSig) parts.push("", selectedSig.content);
        return parts.join("\n");
    };

    const errorTableHtml = errorRows.length > 0
        ? `<p style="margin:16px 0 6px 0;font-family:Calibri,sans-serif;font-size:10pt;font-weight:600;color:${EMAIL_TABLE_STYLE.textColor};">Erros de carga</p>${buildErrorHtmlTable(errorRows)}`
        : "";

    const handleCopyHtml = async () => {
        const sigHtml = buildSigHtml(selectedSig);
        const html = `<div style="font-family:Calibri,sans-serif;font-size:11pt;"><p>${escapeHtml(greeting)}.</p><p>${escapeHtml(bodyIntro)}</p>${buildHtmlTable(rows)}${errorTableHtml}${sigHtml}</div>`;
        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/html": new Blob([html], { type: "text/html" }),
                    "text/plain": new Blob([buildPlainBody()], { type: "text/plain" }),
                }),
            ]);
            toast({ description: "Corpo copiado — cole no cliente de e-mail." });
        } catch {
            await navigator.clipboard.writeText(buildPlainBody());
            toast({ description: "Texto copiado (sem formatação HTML)." });
        }
    };

    const buildSigHtml = (sig: typeof selectedSig) => {
        if (!sig) return "";
        const [nameLine, ...rest] = sig.content.split("\n");
        const nameHtml = `<p style="margin:0 0 2px 0;padding:0;"><strong style="font-family:${SIG_FONT};font-size:12pt;font-weight:bold;color:#1e293b;">${escapeHtml(nameLine)}</strong></p>`;
        const restHtml = rest.length
            ? `<p style="margin:0;padding:0;font-family:${SIG_FONT};font-size:10pt;color:#475569;">${rest.map(l => (l ? escapeHtml(l) : "&nbsp;")).join("<br>")}</p>`
            : "";

        const imgHtml = sig.imageUrl
            ? `<div style="margin-top:12px;"><img src="${escapeHtml(sig.imageUrl)}" alt="${escapeHtml(sig.name)}" style="display:block;max-height:60px;width:auto;height:auto;border:0;"></div>`
            : "";

        return `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;">${nameHtml}${restHtml}${imgHtml}</div>`;
    };

    const handleSend = async () => {
        if (recipientSelections.length === 0) {
            toast({ variant: "destructive", description: "Selecione pelo menos um destinatário." });
            return;
        }
        if (!to.trim()) {
            toast({ variant: "destructive", description: "Nenhum e-mail resolvido para os destinatários selecionados." });
            return;
        }
        setIsSending(true);
        try {
            const token = await (async () => {
              const session = await (await import("@/supabase/client")).createSupabaseBrowserClient().auth.getSession();
              const t = session.data.session?.access_token;
              if (!t) throw new Error("Não autenticado.");
              return t;
            })();

            const sigHtml = buildSigHtml(selectedSig);
            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:16px;background:#ffffff;font-family:Calibri,sans-serif;font-size:11pt;color:#1e293b;"><p style="margin:0 0 8px 0;">${escapeHtml(greeting)}.</p><p style="margin:0 0 16px 0;">${escapeHtml(bodyIntro)}</p>${buildHtmlTable(rows)}${errorTableHtml}${sigHtml}</body></html>`;

            const res = await fetch("/api/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    callerToken: token,
                    from: from || undefined,
                    fromName: authUser?.displayName || undefined,
                    to: to.trim(),
                    subject,
                    html,
                    text: buildPlainBody()
                }),
            });
            let data: any = {};
            try { data = await res.json(); } catch { /* resposta não-JSON */ }
            if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}: ${res.statusText}`);
            toast({ description: "E-mail enviado com sucesso." });
            onClose();
        } catch (err: any) {
            console.error("[EmailSend]", err);
            const msg = typeof err?.message === "string" ? err.message : JSON.stringify(err);
            toast({ variant: "destructive", description: msg || "Erro ao enviar e-mail." });
        } finally {
            setIsSending(false);
        }
    };

    const handleOpenClient = async () => {
        // Copia o HTML para área de transferência para colar no cliente (sem assinatura)
        const html = `<div style="font-family:Calibri,sans-serif;font-size:11pt;"><p>${escapeHtml(greeting)}.</p><p>${escapeHtml(bodyIntro)}</p>${buildHtmlTable(rows)}${errorTableHtml}</div>`;
        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/html": new Blob([html], { type: "text/html" }),
                    "text/plain": new Blob([buildPlainBody()], { type: "text/plain" }),
                }),
            ]);
        } catch {
            const plainNoSig = [`${greeting}.`, "", bodyIntro, "", buildPlainTable(rows)].join("\n");
            await navigator.clipboard.writeText(plainNoSig);
        }
        toast({ description: "Corpo copiado — apague o texto do cliente e cole (Ctrl+V) para manter a formatação." });
        const fromPart = from ? `from=${encodeURIComponent(from)}&` : "";
        const mailtoUrl = `mailto:${encodeURIComponent(to)}?${fromPart}subject=${encodeURIComponent(subject)}`;
        window.location.href = mailtoUrl;
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="fiori-dialog fiori-dialog-fullscreen !flex p-0 flex-col gap-0 shadow-lg [&>button]:hidden">
                <DialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
                    <div className="fiori-dialog-header-row">
                        <div className="fiori-dialog-header-main">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="fiori-dialog-back-btn"
                                aria-label="Voltar"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <div className="fiori-dialog-icon shrink-0">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="fiori-dialog-title">Compor e-mail</DialogTitle>
                                <DialogDescription className="fiori-dialog-subtitle">
                                    {rows.length === 1 ? "1 objeto" : `${rows.length} objetos`} · {mockName}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="fiori-dialog-header-actions">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyHtml}
                                className="fiori-btn-transparent fiori-stat-action-btn shadow-none"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Copiar corpo
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleOpenClient}
                                className="fiori-btn-transparent fiori-stat-action-btn shadow-none"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Abrir no cliente
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSend}
                                disabled={isSending}
                                className="fiori-btn-emphasized fiori-stat-action-btn shadow-none"
                            >
                                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                {isSending ? "Enviando…" : "Enviar"}
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Compose fields */}
                <div className="fiori-email-compose-fields">
                    <FieldRow label="De">
                        <input
                            value={from}
                            onChange={e => setFrom(e.target.value)}
                            placeholder="seu@email.com"
                            className="fiori-email-field-inline-input"
                        />
                    </FieldRow>
                    <FieldRow label="Para" tall>
                        <EmailMultiSelect
                            variant="fiori"
                            value={recipientSelections}
                            onChange={setRecipientSelections}
                            placeholder="Selecione contatos ou agrupadores..."
                            className="w-full"
                        />
                    </FieldRow>
                    <FieldRow label="Assunto">
                        <input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="fiori-email-field-inline-input"
                        />
                    </FieldRow>
                    <FieldRow label="Assinatura">
                        <Select value={selectedSigId} onValueChange={setSelectedSigId}>
                            <SelectTrigger className="fiori-select-trigger w-full max-w-xs shadow-none">
                                <SelectValue placeholder="Nenhuma" />
                            </SelectTrigger>
                            <SelectContent className="fiori-select-content">
                                <SelectItem value="__none__" className="fiori-select-item">Nenhuma</SelectItem>
                                {signatures.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="fiori-select-item">{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FieldRow>
                </div>

                {/* Email preview */}
                <div className="fiori-email-preview custom-scrollbar">
                    <div className="fiori-email-preview-body">
                        <p className="fiori-email-preview-text">{greeting}.</p>
                        <p className="fiori-email-preview-text">{bodyIntro}</p>
                        <div className="fiori-email-preview-table-wrap" dangerouslySetInnerHTML={{ __html: buildHtmlTable(rows) + errorTableHtml }} />
                        {selectedSig && (
                            <div className="fiori-email-preview-signature" style={{ fontFamily: SIG_FONT }}>
                                {selectedSig.content && selectedSig.content.trim() && selectedSig.content.split("\n").map((line, i) =>
                                    i === 0 ? (
                                        <p key={i} className="fiori-email-preview-signature-name">{line}</p>
                                    ) : (
                                        <p key={i} className="fiori-email-preview-signature-line">{line || "\u00A0"}</p>
                                    )
                                )}
                                {selectedSig.imageUrl && (
                                    <div className={cn("block", selectedSig.content && selectedSig.content.trim() ? "mt-3" : "mt-0")}>
                                        {/* eslint-disable-next-line @next/next/no-img-element -- URL da assinatura (Storage) */}
                                        <img
                                            src={selectedSig.imageUrl}
                                            alt={selectedSig.name}
                                            className="fiori-email-preview-signature-img"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function FieldRow({ label, children, tall }: { label: string; children: React.ReactNode; tall?: boolean }) {
    return (
        <div className={cn("fiori-email-field-row", tall && "fiori-email-field-row--tall")}>
            <span className="fiori-email-field-label">{label}</span>
            <div className="fiori-email-field-control">{children}</div>
        </div>
    );
}
