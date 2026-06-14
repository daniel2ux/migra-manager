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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    ShieldCheck,
    User as UserIcon,
    CalendarClock,
    MessageSquarePlus,
    SendHorizontal,
    Trash2,
    Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCommentDate } from "@/lib/formatters";

/** Ordenação decrescente: CompatDb Timestamp, Date, ms ou ISO. */
function commentCreatedAtMs(createdAt: unknown): number {
    if (createdAt == null) return 0;
    if (typeof createdAt === "number" && !Number.isNaN(createdAt)) return createdAt;
    if (createdAt instanceof Date) return createdAt.getTime();
    if (typeof createdAt === "string") {
        const t = Date.parse(createdAt);
        return Number.isNaN(t) ? 0 : t;
    }
    if (typeof createdAt === "object") {
        const o = createdAt as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
        if (typeof o.toMillis === "function") return o.toMillis();
        if (typeof o.seconds === "number")
            return o.seconds * 1000 + (typeof o.nanoseconds === "number" ? Math.floor(o.nanoseconds / 1e6) : 0);
    }
    return 0;
}

function canEditOrDeleteComment(
    c: { authorId?: string; userId?: string },
    currentUserId: string | undefined,
    isAdmin: boolean
): boolean {
    if (!currentUserId) return false;
    const authorId = c.authorId ?? c.userId;
    if (isAdmin) return true;
    return !!authorId && authorId === currentUserId;
}

export interface CommentItem {
    id: string;
    text?: string;
    createdAt?: unknown;
    authorName?: string;
    userName?: string;
    authorRole?: string;
    authorId?: string;
    userId?: string;
    __path?: string;
}

interface CommentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    commentTargetObject: { id?: string; name?: string } | null;
    comments?: CommentItem[];
    /** Mapa por id do objeto (mock) ou por nome (dashboard). */
    commentsMap?: Record<string, CommentItem[]>;
    commentsMapByObjectName?: Record<string, CommentItem[]>;
    quickCommentText?: string;
    setQuickCommentText?: (text: string) => void;
    /** Dashboard: save async. Mock: pode retornar false para manter rascunho. */
    handleSaveQuickComment?: (text?: string) => void | Promise<void> | boolean;
    onSave?: (text: string) => void | Promise<void> | boolean;
    handleDeleteQuickComment?: (comment: { id: string; __path?: string; authorId?: string; userId?: string }) => void;
    onDeleteComment?: (comment: { id: string; __path?: string; authorId?: string; userId?: string }) => void;
    handleUpdateQuickComment?: (
        comment: { id: string; __path?: string; authorId?: string; userId?: string },
        text: string
    ) => void;
    isAdmin?: boolean;
    currentUserId?: string | undefined;
    footerMode?: "close-only" | "cancel-save";
    submitShortcut?: "ctrl-enter" | "enter";
}

export function CommentDialog({
    open,
    onOpenChange,
    commentTargetObject,
    comments = [],
    commentsMap,
    commentsMapByObjectName,
    quickCommentText = "",
    handleSaveQuickComment,
    onSave,
    handleDeleteQuickComment,
    onDeleteComment,
    handleUpdateQuickComment,
    isAdmin = false,
    currentUserId,
    footerMode = "close-only",
    submitShortcut = "ctrl-enter",
    setQuickCommentText,
}: CommentDialogProps) {
    const [draft, setDraft] = useState("");
    const [pendingDelete, setPendingDelete] = useState<{ id: string; __path?: string; authorId?: string; userId?: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");

    const saveFn = handleSaveQuickComment ?? onSave;
    const deleteFn = handleDeleteQuickComment ?? onDeleteComment;
    const confirmDelete = !!handleDeleteQuickComment;

    const displayedComments = useMemo(() => {
        let list: CommentDialogProps["comments"] = [];
        if (comments && comments.length > 0) list = comments;
        else if (!commentTargetObject) list = [];
        else {
            const map = commentsMap ?? commentsMapByObjectName;
            if (!map) list = [];
            else {
                const name = String(commentTargetObject.name ?? "").trim();
                const id = String(commentTargetObject.id ?? "").trim();
                if (id && map[id]?.length) {
                    list = map[id];
                } else {
                    const tryKey = (key: string) => {
                        if (!key) return undefined;
                        return map[key] ?? map[key.toUpperCase()];
                    };
                    let fromMap = tryKey(name);
                    if (fromMap?.length) list = fromMap;
                    else {
                        fromMap = tryKey(id);
                        if (fromMap?.length) list = fromMap;
                        else {
                            const foundKey = Object.keys(map).find(
                                (k) => k.trim().toUpperCase() === name.toUpperCase() || (id && k === id)
                            );
                            list = foundKey ? map[foundKey] ?? [] : [];
                        }
                    }
                }
            }
        }
        return [...(list ?? [])].sort(
            (a, b) => commentCreatedAtMs(b?.createdAt) - commentCreatedAtMs(a?.createdAt)
        );
    }, [comments, commentTargetObject, commentsMap, commentsMapByObjectName]);

    useEffect(() => {
        if (open && commentTargetObject) {
            setDraft(quickCommentText);
        }
    }, [open, commentTargetObject, quickCommentText]);

    useEffect(() => {
        if (!open) {
            setPendingDelete(null);
            setEditingId(null);
            setEditDraft("");
        }
    }, [open]);

    useEffect(() => {
        setEditingId(null);
        setEditDraft("");
    }, [commentTargetObject?.id]);

    if (!commentTargetObject) return null;

    const applySaveResult = (result: void | boolean | Promise<void | boolean>) => {
        if (result instanceof Promise) {
            void result.then((r) => {
                if (r !== false) {
                    setDraft("");
                    setQuickCommentText?.("");
                }
            });
        } else if (result !== false) {
            setDraft("");
            setQuickCommentText?.("");
        }
    };

    const submitDraft = () => {
        const t = draft.trim();
        if (!t || !saveFn) return;
        applySaveResult(saveFn(t));
    };

    return (
        <>
            <Dialog preserveDashboardScroll open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    open={open}
                    className="fiori-dialog !flex h-[min(36rem,calc(100dvh-2rem))] w-[calc(100vw-1rem)] max-w-[480px] flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)] [&>button]:hidden"
                >
                    <DialogHeader className="fiori-dialog-header shrink-0 space-y-0">
                        <DialogDescription className="sr-only">
                            Registrar ou consultar comentários técnicos do objeto de migração.
                        </DialogDescription>
                        <div className="flex items-center gap-3">
                            <div className="fiori-dialog-icon shrink-0">
                                <MessageSquarePlus className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="fiori-dialog-title">Registrar comentário</DialogTitle>
                                <p className="fiori-dialog-subtitle truncate">{commentTargetObject.name}</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4 pb-2">
                        <label className="fiori-field-label shrink-0 mb-1.5">
                            <CalendarClock className="h-3.5 w-3.5 text-[var(--fiori-brand)]" />
                            Histórico de comentários
                        </label>
                        <div
                            className="fiori-comment-list fiori-comment-list--fluid min-h-0"
                            role="region"
                            aria-label="Lista de comentários"
                        >
                            <div className="fiori-comment-list-header">
                                <CalendarClock className="h-3.5 w-3.5" />
                                {displayedComments.length === 0
                                    ? "Nenhum comentário registrado"
                                    : `${displayedComments.length} comentário${displayedComments.length === 1 ? "" : "s"}`}
                            </div>
                            <div className="fiori-comment-list-body min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                                {displayedComments.length > 0 ? (
                                    <div className="fiori-comment-items">
                                        {displayedComments.map((c) => (
                                            <div key={c.id} className="fiori-comment-item">
                                                <div className="fiori-comment-item-meta">
                                                    <span className="fiori-comment-item-author">
                                                        {c.authorRole === "admin" ? (
                                                            <ShieldCheck className="h-3 w-3" />
                                                        ) : (
                                                            <UserIcon className="h-3 w-3" />
                                                        )}
                                                        <span className="truncate">{c.authorName ?? c.userName ?? "—"}</span>
                                                    </span>
                                                    <div className="flex shrink-0 items-center gap-0.5">
                                                        <span className="fiori-comment-item-date">
                                                            <CalendarClock className="h-3 w-3" />
                                                            {formatCommentDate(c.createdAt)}
                                                        </span>
                                                        {deleteFn && canEditOrDeleteComment(c, currentUserId, isAdmin) && editingId !== c.id && (
                                                            <>
                                                                {handleUpdateQuickComment && (
                                                                    <button
                                                                        type="button"
                                                                        className="fiori-comment-delete-btn"
                                                                        aria-label="Editar comentário"
                                                                        onClick={() => {
                                                                            setEditingId(c.id);
                                                                            setEditDraft(String(c.text ?? ""));
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="fiori-comment-delete-btn"
                                                                    aria-label="Remover comentário"
                                                                    onClick={() => {
                                                                        if (confirmDelete) setPendingDelete(c);
                                                                        else deleteFn(c);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {editingId === c.id && handleUpdateQuickComment ? (
                                                    <div className="mt-1.5 space-y-2">
                                                        <Textarea
                                                            value={editDraft}
                                                            onChange={(e) => setEditDraft(e.target.value)}
                                                            className="fiori-textarea min-h-[72px] max-h-[200px] w-full resize-y shadow-none"
                                                        />
                                                        <div className="fiori-comment-edit-actions">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="fiori-btn-ghost fiori-btn-compact"
                                                                onClick={() => {
                                                                    setEditingId(null);
                                                                    setEditDraft("");
                                                                }}
                                                            >
                                                                Cancelar
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                disabled={!editDraft.trim()}
                                                                className="fiori-btn-emphasized fiori-btn-compact"
                                                                onClick={() => {
                                                                    const t = editDraft.trim();
                                                                    if (!t) return;
                                                                    handleUpdateQuickComment(c, t);
                                                                    setEditingId(null);
                                                                    setEditDraft("");
                                                                }}
                                                            >
                                                                Salvar
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={cn(
                                                            "fiori-comment-item-text",
                                                            c.authorRole !== "admin" && "fiori-comment-item-text--user"
                                                        )}
                                                    >
                                                        {c.text}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="fiori-comment-empty">Nenhum comentário registrado.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-[var(--fiori-border-light,#e5e5e5)] bg-white px-5 pt-3 pb-2">
                        <div className="space-y-1.5">
                            <label className="fiori-field-label" htmlFor="migration-comment-draft">
                                {footerMode === "close-only" && (
                                    <SendHorizontal className="h-3.5 w-3.5 text-[var(--fiori-brand)]" />
                                )}
                                Nova observação técnica
                            </label>
                            <Textarea
                                id="migration-comment-draft"
                                placeholder="Descreva a observação técnica…"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (submitShortcut === "ctrl-enter") {
                                        if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey)) return;
                                    } else {
                                        if (e.key !== "Enter" || e.shiftKey) return;
                                    }
                                    e.preventDefault();
                                    e.stopPropagation();
                                    submitDraft();
                                }}
                                className={cn(
                                    "fiori-textarea w-full resize-y shadow-none",
                                    footerMode === "close-only"
                                        ? "min-h-[5.5rem] max-h-[10rem]"
                                        : "min-h-[4.5rem] max-h-[6.5rem] resize-none"
                                )}
                            />
                            {submitShortcut === "ctrl-enter" ? (
                                <p className="fiori-shortcut-hint">
                                    <span>Salvar com</span>
                                    <span className="inline-flex items-center gap-0.5">
                                        <kbd className="fiori-kbd">Ctrl</kbd>
                                        <span>+</span>
                                        <kbd className="fiori-kbd">Enter</kbd>
                                    </span>
                                    <span className="text-[var(--fiori-label)]">(⌘+Enter no Mac)</span>
                                </p>
                            ) : (
                                <p className="fiori-field-hint">Enter para salvar · Shift+Enter para nova linha</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="fiori-btn-ghost"
                        >
                            {footerMode === "close-only" ? "Fechar" : "Cancelar"}
                        </Button>
                        {footerMode === "cancel-save" && (
                            <Button
                                type="button"
                                disabled={!draft.trim()}
                                onClick={submitDraft}
                                className="fiori-btn-emphasized"
                            >
                                Salvar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {confirmDelete && (
                <AlertDialog preserveDashboardScroll open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
                    <AlertDialogContent open={!!pendingDelete} className="fiori-dialog sm:max-w-sm p-0 overflow-hidden border-none shadow-lg gap-0">
                        <AlertDialogHeader className="fiori-dialog-header space-y-0 text-left">
                            <AlertDialogTitle className="fiori-dialog-title">Remover comentário</AlertDialogTitle>
                            <AlertDialogDescription className="fiori-dialog-subtitle pt-1">
                                Esta ação não pode ser desfeita. Deseja remover esta observação?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="fiori-dialog-footer gap-2">
                            <AlertDialogCancel className="fiori-btn-ghost mt-0">
                                Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                                className="fiori-btn-emphasized bg-[var(--fiori-negative,#bb0000)] border-[var(--fiori-negative,#bb0000)] hover:bg-[#a30000] hover:border-[#a30000]"
                                onClick={() => {
                                    if (pendingDelete && handleDeleteQuickComment) handleDeleteQuickComment(pendingDelete);
                                    setPendingDelete(null);
                                }}
                            >
                                Remover
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
