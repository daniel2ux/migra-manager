"use client";

import { useState } from "react";
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
import { Sparkles, Search, X, Users, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingProject: any | null;
    formData: { name: string; company: string; description: string; isLocked: boolean; memberUids: string[] };
    onFormChange: (data: any) => void;
    onSave: () => void | Promise<void>;
    filteredUsers: any[];
    userSearchTerm: string;
    onUserSearchChange: (term: string) => void;
    onToggleMember: (uid: string) => void;
    onAiGenerate: () => void;
    isGenerating: boolean;
    isAdmin: boolean;
}

export function ProjectFormDialog({
    open,
    onOpenChange,
    editingProject,
    formData,
    onFormChange,
    onSave,
    filteredUsers,
    userSearchTerm,
    onUserSearchChange,
    onToggleMember,
    onAiGenerate,
    isGenerating,
    isAdmin,
}: ProjectFormDialogProps) {
    const [saving, setSaving] = useState(false);
    const isProjectLocked = editingProject?.isLocked ?? false;

    const getTitle = () => {
        if (isProjectLocked) return "Projeto bloqueado";
        if (!editingProject && isAdmin) return "Novo projeto";
        if (editingProject && isAdmin) return "Configurar projeto";
        return "Detalhes do projeto";
    };

    const readonly = !isAdmin || isProjectLocked;
    const canSave = formData.name.trim().length > 0
        && !(isProjectLocked && formData.isLocked === editingProject?.isLocked);

    async function handleSaveClick() {
        if (!canSave || saving) return;
        setSaving(true);
        try {
            await onSave();
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                variant="fiori"
                overlayClassName="fiori-dialog-overlay"
                className="fiori-dialog fiori-dialog--form flex h-[min(92vh,640px)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
            >
                <DialogHeader className="fiori-dialog-header shrink-0 space-y-0">
                    <DialogDescription className="sr-only">
                        Formulário de configuração de projeto.
                    </DialogDescription>
                    <DialogTitle className="fiori-dialog-title">{getTitle()}</DialogTitle>
                </DialogHeader>

                {isProjectLocked && (
                    <div className="fiori-message-warning shrink-0">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <p>Este projeto está bloqueado. Nenhuma informação pode ser alterada.</p>
                    </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="fiori-field-label">Nome</label>
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                    onFormChange({ ...formData, name: e.target.value })
                                }
                                placeholder="Nome do projeto"
                                disabled={readonly}
                                className="fiori-input readable-disabled shadow-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="fiori-field-label">Empresa</label>
                            <Input
                                value={formData.company}
                                onChange={(e) =>
                                    onFormChange({ ...formData, company: e.target.value })
                                }
                                placeholder="Nome da empresa"
                                disabled={readonly}
                                className="fiori-input readable-disabled shadow-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <label className="fiori-field-label">
                                <Sparkles className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                                Descrição
                            </label>
                            {isAdmin && !readonly && (
                                <button
                                    type="button"
                                    onClick={onAiGenerate}
                                    disabled={isGenerating || !formData.name}
                                    className="fiori-icon-btn"
                                >
                                    <Sparkles className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                                    Gerar com IA
                                </button>
                            )}
                        </div>
                        <Textarea
                            value={formData.description}
                            onChange={(e) =>
                                onFormChange({ ...formData, description: e.target.value })
                            }
                            placeholder="Escopo e objetivos do projeto..."
                            disabled={readonly}
                            className="fiori-textarea readable-disabled shadow-none min-h-[80px] resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <label className="fiori-field-label">
                                <Users className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                                Membros
                            </label>
                            {formData.memberUids.length > 0 && (
                                <span className="ml-auto text-[0.6875rem] font-semibold text-[var(--fiori-brand)]">
                                    {formData.memberUids.length} selecionado{formData.memberUids.length !== 1 ? "s" : ""}
                                </span>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="fiori-search-shell">
                                <Search className="fiori-search-icon" aria-hidden />
                                <Input
                                    value={userSearchTerm}
                                    onChange={(e) => onUserSearchChange(e.target.value)}
                                    placeholder="Buscar usuário..."
                                    className="fiori-search-input shadow-none"
                                />
                            </div>
                        )}

                        <div className="fiori-picker-zone">
                            {filteredUsers.length === 0 ? (
                                <p className="fiori-field-hint text-center py-2">
                                    Nenhum usuário encontrado
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {filteredUsers.map((user) => {
                                        const isMember = formData.memberUids.includes(user.uid);
                                        const isCommitted = user.projectIds && user.projectIds.length > 0;

                                        return (
                                            <button
                                                key={user.uid}
                                                type="button"
                                                onClick={() => isAdmin && onToggleMember(user.uid)}
                                                disabled={readonly}
                                                className={cn(
                                                    "fiori-chip",
                                                    isMember && "fiori-chip--outline",
                                                    readonly && "cursor-not-allowed opacity-60"
                                                )}
                                            >
                                                {user.name}
                                                {isCommitted && (
                                                    <span className="text-[#e76500] font-normal">(Alocado)</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {formData.memberUids.length > 0 && isAdmin && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {formData.memberUids.map((uid) => {
                                    const user = filteredUsers.find((u) => u.uid === uid);
                                    if (!user) return null;
                                    return (
                                        <button
                                            key={uid}
                                            type="button"
                                            onClick={() => onToggleMember(uid)}
                                            className="fiori-chip fiori-chip--outline gap-1"
                                        >
                                            {user.name}
                                            <X className="w-3 h-3 opacity-80" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                        <div className="fiori-lock-row">
                            <div>
                                <label className="fiori-field-label">Bloquear projeto</label>
                                <p className="fiori-field-hint mt-0.5">
                                    {formData.isLocked
                                        ? "Projeto bloqueado para edição"
                                        : "Projeto disponível para edição"}
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
                            onClick={handleSaveClick}
                            disabled={!canSave || saving}
                            className="fiori-btn-emphasized"
                        >
                            {saving
                                ? "Salvando…"
                                : editingProject
                                  ? "Salvar alterações"
                                  : "Criar projeto"}
                        </button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
