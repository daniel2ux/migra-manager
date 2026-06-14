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
import { Sparkles, Users, Lock, FolderKanban, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    ProjectMemberSelectDialog,
    type ProjectMemberOption,
} from "@/components/projetos/project-member-select-dialog";

const FIORI_INPUT = "fiori-input shadow-none";
const FIORI_INPUT_UPPER = `${FIORI_INPUT} uppercase`;
const FIORI_TEXTAREA = "fiori-textarea shadow-none min-h-[5rem] resize-none";

function fioriInputClass(readonly: boolean, uppercase = false): string {
    return cn(uppercase ? FIORI_INPUT_UPPER : FIORI_INPUT, readonly && "readable-disabled");
}

function fioriTextareaClass(readonly: boolean): string {
    return cn(FIORI_TEXTAREA, readonly && "readable-disabled");
}

interface ProjectFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingProject: any | null;
    formData: { name: string; company: string; description: string; isLocked: boolean; memberUids: string[] };
    onFormChange: (data: any) => void;
    onSave: () => void | Promise<void>;
    users: ProjectMemberOption[];
    onAiGenerate: () => void;
    isGenerating: boolean;
    canEdit: boolean;
    canCreate: boolean;
}

export function ProjectFormDialog({
    open,
    onOpenChange,
    editingProject,
    formData,
    onFormChange,
    onSave,
    users,
    onAiGenerate,
    isGenerating,
    canEdit,
    canCreate,
}: ProjectFormDialogProps) {
    const [saving, setSaving] = useState(false);
    const [isMembersOpen, setIsMembersOpen] = useState(false);
    const [memberSelectDraft, setMemberSelectDraft] = useState<string[]>([]);
    const [memberSearchTerm, setMemberSearchTerm] = useState("");
    const isProjectLocked = editingProject?.isLocked ?? false;

    const getTitle = () => {
        if (isProjectLocked) return "Projeto bloqueado";
        if (!editingProject && canCreate) return "Novo projeto";
        if (editingProject && canEdit) return "Configurar projeto";
        return "Detalhes do projeto";
    };

    const readonly = !canEdit || isProjectLocked;
    const canSave = (editingProject ? canEdit : canCreate)
        && formData.name.trim().length > 0
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

    const selectedMembers = formData.memberUids
        .map((uid) => users.find((u) => u.uid === uid))
        .filter(Boolean) as ProjectMemberOption[];

    const handleRemoveMember = (uid: string) => {
        onFormChange({
            ...formData,
            memberUids: formData.memberUids.filter((id) => id !== uid),
        });
    };

    const handleSaveMemberSelection = () => {
        onFormChange({ ...formData, memberUids: memberSelectDraft });
        setIsMembersOpen(false);
        setMemberSearchTerm("");
    };

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                variant="fiori"
                overlayClassName="fiori-dialog-overlay"
                className="fiori-dialog fiori-dialog--form flex h-[min(92vh,640px)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
            >
                <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
                    <DialogDescription className="sr-only">
                        Formulário de configuração de projeto.
                    </DialogDescription>
                    <div className="fiori-dialog-header-row">
                        <div className="fiori-dialog-icon shrink-0">
                            <FolderKanban className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="fiori-dialog-title">{getTitle()}</DialogTitle>
                            <p className="fiori-dialog-subtitle">
                                {editingProject
                                    ? "Dados e membros do projeto"
                                    : "Cadastro de novo projeto de migração"}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                {isProjectLocked && (
                    <div className="fiori-message-warning shrink-0 mx-5 mt-4">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <p>Este projeto está bloqueado. Nenhuma informação pode ser alterada.</p>
                    </div>
                )}

                <div className="fiori-dialog-body flex-1 min-h-0 overflow-y-auto">
                    <section className="fiori-form-section space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="fiori-form-field">
                            <label className="fiori-field-label" htmlFor="project-form-name">
                                Nome
                            </label>
                            <Input
                                id="project-form-name"
                                value={formData.name}
                                onChange={(e) =>
                                    onFormChange({ ...formData, name: e.target.value.toUpperCase() })
                                }
                                placeholder="Nome do projeto"
                                disabled={readonly}
                                className={fioriInputClass(readonly, true)}
                            />
                        </div>

                        <div className="fiori-form-field">
                            <label className="fiori-field-label" htmlFor="project-form-company">
                                Empresa
                            </label>
                            <Input
                                id="project-form-company"
                                value={formData.company}
                                onChange={(e) =>
                                    onFormChange({ ...formData, company: e.target.value.toUpperCase() })
                                }
                                placeholder="Nome da empresa"
                                disabled={readonly}
                                className={fioriInputClass(readonly, true)}
                            />
                        </div>
                    </div>

                    <div className="fiori-form-field">
                        <div className="flex items-center justify-between gap-2">
                            <label className="fiori-field-label" htmlFor="project-form-description">
                                <Sparkles className="w-3.5 h-3.5 text-[var(--fiori-brand)]" aria-hidden />
                                Descrição
                            </label>
                            {canEdit && !readonly && (
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
                            id="project-form-description"
                            value={formData.description}
                            onChange={(e) =>
                                onFormChange({ ...formData, description: e.target.value })
                            }
                            placeholder="Escopo e objetivos do projeto..."
                            disabled={readonly}
                            className={fioriTextareaClass(readonly)}
                        />
                    </div>

                    <div className="fiori-form-field">
                        <div className="fiori-deps-hint-row flex items-center justify-between gap-2">
                            <label className="fiori-field-label m-0 min-w-0 shrink">
                                <Users className="w-3.5 h-3.5 text-[var(--fiori-brand)]" aria-hidden />
                                Membros
                                {formData.memberUids.length > 0 && (
                                    <span className="ml-2 text-[0.6875rem] font-semibold text-[var(--fiori-brand)]">
                                        {formData.memberUids.length} selecionado
                                        {formData.memberUids.length !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </label>
                            {canEdit && !readonly && (
                                <button
                                    type="button"
                                    className="fiori-btn-transparent fiori-btn-transparent--compact shrink-0"
                                    title="Selecionar membros"
                                    onClick={() => {
                                        setMemberSelectDraft(formData.memberUids);
                                        setIsMembersOpen(true);
                                    }}
                                >
                                    Selecionar
                                </button>
                            )}
                        </div>
                        <div className="fiori-deps-zone">
                            {selectedMembers.length > 0 ? (
                                selectedMembers.map((member) => (
                                    <span key={member.uid} className="fiori-dep-chip">
                                        {member.name}
                                        {!readonly && canEdit && (
                                            <button
                                                type="button"
                                                className="fiori-dep-chip-remove"
                                                aria-label={`Remover ${member.name}`}
                                                onClick={() => handleRemoveMember(member.uid)}
                                            >
                                                <Trash2 className="w-3 h-3" aria-hidden />
                                            </button>
                                        )}
                                    </span>
                                ))
                            ) : (
                                <p className="fiori-deps-empty m-0">Nenhum membro selecionado.</p>
                            )}
                        </div>
                    </div>

                    {canEdit && (
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

        <ProjectMemberSelectDialog
            open={isMembersOpen}
            onOpenChange={setIsMembersOpen}
            projectName={formData.name.trim() || editingProject?.name}
            users={users}
            selectedUids={memberSelectDraft}
            searchTerm={memberSearchTerm}
            onSearchChange={setMemberSearchTerm}
            onToggleUid={(uid) =>
                setMemberSelectDraft((prev) =>
                    prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
                )
            }
            onSave={handleSaveMemberSelection}
            elevated
        />
        </>
    );
}
