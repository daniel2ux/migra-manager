"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useDb, useUser, useMemoDb, useDoc } from "@/supabase";
import { doc } from "@/supabase/compat-db-shim";
import { PageHeader } from "@/components/layout/page-header";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { getProjectCompanyName } from "@/lib/migration/project-company";
import type { Project } from "@/types/migration";
import {
  Mail,
  Loader2,
  ShieldAlert,
  Trash2,
  Plus,
  Tag,
  Check,
  Inbox,
  Pencil,
} from "lucide-react";
import {
  useEmailContacts,
  useEmailGroups,
} from "@/hooks/use-email-contacts";
import type { EmailContact, EmailGroup } from "@/types/email";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CARD_TOOLBAR_BTN =
  "fiori-card-toolbar-btn !rounded-[0.25rem] !size-[1.375rem] min-h-0 min-w-0";

export default function EmailsPage() {
  const db = useDb() as any;
  const { user } = useUser();
  const { toast } = useToast();

  const { projectId } = useActiveProjectId();

  const userDocRef = useMemoDb(
    () => (user ? doc(db, "users", user.uid) : null),
    [db, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<any>(userDocRef);

  const projectRef = useMemoDb(
    () => (db && projectId ? doc(db, "projects", projectId) : null),
    [db, projectId],
  );
  const { data: projectData } = useDoc<Project>(projectRef);

  const isMaster =
    userProfile?.role?.toLowerCase() === "master" ||
    userProfile?.isMaster === true;

  const { contacts, isLoading: isLoadingContacts, upsertContact, deleteContact } = useEmailContacts();
  const { groups, isLoading: isLoadingGroups, upsertGroup, deleteGroup } = useEmailGroups();

  const [isSaving, setIsSaving] = useState(false);

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmailContact | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EmailGroup | null>(null);
  const [groupFormName, setGroupFormName] = useState("");
  const [deleteConfirmContact, setDeleteConfirmContact] = useState<EmailContact | null>(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<EmailGroup | null>(null);

  const resetContactForm = () => {
    setEditingContact(null);
    setContactName("");
    setContactEmail("");
    setSelectedGroupIds([]);
  };

  const openCreateContactDialog = () => {
    resetContactForm();
    setContactDialogOpen(true);
  };

  const openEditContactDialog = (contact: EmailContact) => {
    setEditingContact(contact);
    setContactName(contact.name);
    setContactEmail(contact.email);
    setSelectedGroupIds(contact.groupIds || []);
    setContactDialogOpen(true);
  };

  const handleSaveContact = async () => {
    if (!contactName.trim() || !contactEmail.trim()) {
      toast({ variant: "destructive", description: "Preencha nome e e-mail obrigatórios." });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail.trim())) {
      toast({ variant: "destructive", description: "E-mail inválido." });
      return;
    }
    setIsSaving(true);
    try {
      await upsertContact({
        id: editingContact?.id,
        name: contactName.trim(),
        email: contactEmail.trim(),
        groupIds: selectedGroupIds,
      });
      setContactDialogOpen(false);
      resetContactForm();
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar contato." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteConfirmContact) return;
    try {
      await deleteContact(deleteConfirmContact.id);
      setDeleteConfirmContact(null);
    } catch {
      toast({ variant: "destructive", description: "Erro ao excluir contato." });
    }
  };

  const openCreateGroupDialog = () => {
    setEditingGroup(null);
    setGroupFormName("");
    setGroupDialogOpen(true);
  };

  const openEditGroupDialog = (group: EmailGroup) => {
    setEditingGroup(group);
    setGroupFormName(group.name);
    setGroupDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupFormName.trim()) {
      toast({ variant: "destructive", description: "Informe um nome para o agrupador." });
      return;
    }
    try {
      const groupId = await upsertGroup({
        id: editingGroup?.id,
        name: groupFormName.trim(),
      });
      if (!editingGroup) {
        setSelectedGroupIds((prev) => [...prev, groupId]);
      }
      setGroupFormName("");
      setEditingGroup(null);
      setGroupDialogOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err?.message || `Erro ao ${editingGroup ? "atualizar" : "criar"} agrupador.`,
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteConfirmGroup) return;
    try {
      await deleteGroup(deleteConfirmGroup.id);
      setSelectedGroupIds((prev) => prev.filter((id) => id !== deleteConfirmGroup.id));
      setDeleteConfirmGroup(null);
    } catch {
      toast({ variant: "destructive", description: "Erro ao excluir agrupador." });
    }
  };

  const toggleGroupId = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const getGroupName = (id: string) => {
    return groups.find(g => g.id === id)?.name || id;
  };

  if (isLoadingProfile) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-SkyBlue-500" />
        </div>
      </DashboardShell>
    );
  }

  if (!isMaster) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full">
          <PageHeader
            variant="fiori"
            title="Cadastrar e-mails"
            subtitle="Acesso restrito"
            icon={<Mail className="w-5 h-5" aria-hidden />}
            empresa={getProjectCompanyName(projectData) ?? undefined}
            projectName={projectData?.name}
            backHref="/"
          />
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-5 max-w-md w-full">
              <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Acesso Restrito</p>
                <p className="text-[10px] text-red-600 mt-1">Disponível apenas para usuários Master.</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell noPadding>
      <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 w-full flex-col overflow-hidden">
        <PageHeader
          variant="fiori"
          title="Cadastrar e-mails"
          subtitle="Gestão de contatos e agrupadores para envio de e-mails"
          icon={<Mail className="w-5 h-5" aria-hidden />}
          empresa={getProjectCompanyName(projectData) ?? undefined}
          projectName={projectData?.name}
          backHref="/"
        />

        <div className="fiori-emails-page">
          <div className="fiori-emails-page-content custom-scrollbar">
            <div className="fiori-emails-page-grid">
              <div className="fiori-emails-panel fiori-emails-panel--form fiori-emails-panel--groups">
                <div className="fiori-emails-panel-header">
                  <div className="fiori-emails-panel-header-main">
                    <div className="fiori-emails-panel-icon" aria-hidden>
                      <Tag className="h-4 w-4" />
                    </div>
                    <div className="fiori-emails-panel-heading">
                      <span className="fiori-emails-panel-title-text">Agrupadores</span>
                      <span className="fiori-emails-panel-subtitle fiori-emails-panel-subtitle--hint">
                        Vincule o contato aos agrupadores de envio
                      </span>
                    </div>
                  </div>
                  <div className="fiori-emails-panel-header-actions">
                    {!isLoadingGroups && (
                      <span className="fiori-emails-panel-count">
                        {groups.length} {groups.length === 1 ? "agrupador" : "agrupadores"}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={openCreateGroupDialog}
                      className="fiori-btn-emphasized fiori-emails-panel-header-btn"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      <span>Novo</span>
                    </button>
                  </div>
                </div>

                <div className="fiori-emails-form-body fiori-emails-groups-picker-shell">
                  {isLoadingGroups ? (
                    <div className="fiori-emails-picker-loading" aria-hidden />
                  ) : (
                    <>
                      <div className="fiori-emails-group-toolbar">
                        <span className="fiori-emails-selection-hint fiori-emails-selection-hint--empty">
                          Gerencie os agrupadores de envio de e-mails
                        </span>
                      </div>

                      <TooltipProvider delayDuration={0}>
                        <div className="fiori-emails-group-list custom-scrollbar">
                            {groups.map((group) => (
                                <div
                                  key={group.id}
                                  className="fiori-emails-group-item group"
                                >
                                  <div className="fiori-emails-group-item-select fiori-emails-group-item-label-only">
                                    <span className="fiori-emails-group-item-label">{group.name}</span>
                                  </div>
                                  <div className="fiori-emails-group-item-actions">
                                    <div className="fiori-card-toolbar">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className={CARD_TOOLBAR_BTN}
                                            onClick={() => openEditGroupDialog(group)}
                                            aria-label={`Editar agrupador ${group.name}`}
                                          >
                                            <Pencil className="h-3 w-3" aria-hidden />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" variant="fiori">
                                          Editar agrupador
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn-danger")}
                                            onClick={() => setDeleteConfirmGroup(group)}
                                            aria-label={`Excluir agrupador ${group.name}`}
                                          >
                                            <Trash2 className="h-3 w-3" aria-hidden />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" variant="fiori">
                                          Excluir agrupador
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                </div>
                            ))}
                          {groups.length === 0 && (
                            <p className="fiori-emails-picker-empty">Nenhum agrupador disponível</p>
                          )}
                        </div>
                      </TooltipProvider>
                    </>
                  )}
                </div>
              </div>

              <div className="fiori-emails-panel fiori-emails-panel--form fiori-emails-panel--contacts">
                <div className="fiori-emails-panel-header">
                  <div className="fiori-emails-panel-header-main">
                    <div className="fiori-emails-panel-icon" aria-hidden>
                      <Inbox className="h-4 w-4" />
                    </div>
                    <div className="fiori-emails-panel-heading">
                      <span className="fiori-emails-panel-title-text">Catálogo de contatos</span>
                      <span className="fiori-emails-panel-subtitle fiori-emails-panel-subtitle--hint">
                        Contatos cadastrados para envio de e-mails
                      </span>
                    </div>
                  </div>
                  <div className="fiori-emails-panel-header-actions">
                    {!isLoadingContacts && (
                      <span className="fiori-emails-panel-count">
                        {contacts.length} {contacts.length === 1 ? "contato" : "contatos"}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={openCreateContactDialog}
                      className="fiori-btn-emphasized fiori-emails-panel-header-btn"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      <span>Novo</span>
                    </button>
                  </div>
                </div>

                <div className="fiori-emails-table-scroll custom-scrollbar" role="table">
                  <div className="fiori-emails-scroll-head">
                    <div className="fiori-emails-list-header fiori-emails-list-header--contacts" role="row">
                      <div className="fiori-emails-list-cell" role="columnheader">Nome do contato</div>
                      <div className="fiori-emails-list-cell" role="columnheader">E-mail</div>
                      <div className="fiori-emails-list-cell" role="columnheader">Agrupadores</div>
                      <div className="fiori-emails-list-cell fiori-emails-list-cell--actions" role="columnheader">
                        Ações
                      </div>
                    </div>
                  </div>

                <TooltipProvider delayDuration={0}>
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="fiori-emails-list-row fiori-emails-list-row--contacts group"
                      role="row"
                    >
                      <div className="fiori-emails-list-cell fiori-emails-contact-name" role="cell">
                        {contact.name}
                      </div>
                      <div className="fiori-emails-list-cell fiori-emails-contact-email" role="cell">
                        {contact.email}
                      </div>
                      <div className="fiori-emails-list-cell" role="cell">
                        <div className="fiori-emails-tags">
                          {contact.groupIds?.map((gid) => (
                            <span key={gid} className="fiori-emails-tag">
                              {getGroupName(gid)}
                            </span>
                          ))}
                          {(!contact.groupIds || contact.groupIds.length === 0) && (
                            <span className="fiori-emails-tag fiori-emails-tag--empty">
                              Nenhum vínculo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="fiori-emails-list-cell fiori-emails-list-cell--actions" role="cell">
                        <div className="fiori-card-toolbar">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={CARD_TOOLBAR_BTN}
                                onClick={() => openEditContactDialog(contact)}
                                aria-label={`Editar contato ${contact.name}`}
                              >
                                <Pencil className="h-3 w-3" aria-hidden />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" variant="fiori">
                              Editar contato
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn-danger")}
                                onClick={() => setDeleteConfirmContact(contact)}
                                aria-label={`Excluir contato ${contact.name}`}
                              >
                                <Trash2 className="h-3 w-3" aria-hidden />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" variant="fiori">
                              Excluir contato
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  ))}
                </TooltipProvider>

                {contacts.length === 0 && !isLoadingContacts && (
                  <div className="fiori-emails-empty" role="row">
                    <Inbox className="fiori-emails-empty-icon h-6 w-6" aria-hidden />
                    Nenhum contato cadastrado
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>

        <Dialog
          open={contactDialogOpen}
          onOpenChange={(open) => {
            setContactDialogOpen(open);
            if (!open) resetContactForm();
          }}
        >
          <DialogContent
            variant="fiori"
            overlayClassName="fiori-dialog-overlay"
            className="fiori-dialog fiori-dialog--form fiori-emails-contact-dialog flex h-[min(92vh,560px)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
          >
            <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
              <DialogDescription className="sr-only">
                {editingContact ? "Editar contato de e-mails" : "Cadastrar novo contato de e-mails"}
              </DialogDescription>
              <div className="fiori-dialog-header-row">
                <div className="fiori-dialog-icon shrink-0">
                  {editingContact ? (
                    <Pencil className="h-4 w-4" aria-hidden />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="fiori-dialog-title">
                    {editingContact ? "Editar contato" : "Novo contato"}
                  </DialogTitle>
                  <p className="fiori-dialog-subtitle">
                    {editingContact
                      ? editingContact.email
                      : "Cadastre um contato para envio de e-mails"}
                  </p>
                </div>
              </div>
            </DialogHeader>
            <div className="fiori-dialog-body fiori-emails-contact-dialog-body">
              <section className="fiori-form-section fiori-emails-contact-dialog-fields space-y-4">
                <div className="space-y-1.5">
                  <label className="fiori-field-label" htmlFor="email-contact-dialog-name">
                    Nome <span className="text-[var(--fiori-negative)]">*</span>
                  </label>
                  <Input
                    id="email-contact-dialog-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value.toUpperCase())}
                    placeholder="Ex.: JOÃO SILVA"
                    disabled={isSaving}
                    className="fiori-input uppercase shadow-none"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="fiori-field-label" htmlFor="email-contact-dialog-email">
                    E-mail <span className="text-[var(--fiori-negative)]">*</span>
                  </label>
                  <Input
                    id="email-contact-dialog-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Ex.: joao@empresa.com"
                    disabled={isSaving}
                    className="fiori-input shadow-none"
                    autoComplete="email"
                  />
                </div>
              </section>

              <section className="fiori-form-section fiori-emails-contact-dialog-groups">
                <div className="fiori-master-picker-header">
                  <h3 className="fiori-section-title mb-0">
                    <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Agrupadores
                  </h3>
                  <button
                    type="button"
                    onClick={openCreateGroupDialog}
                    className="fiori-btn-transparent fiori-btn-compact fiori-emails-contact-dialog-outline-btn inline-flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    <span>Novo agrupador</span>
                  </button>
                </div>
                {isLoadingGroups ? (
                  <div className="fiori-emails-picker-loading fiori-emails-contact-dialog-picker-loading" aria-hidden />
                ) : (
                  <div className="fiori-emails-group-picker fiori-emails-contact-dialog-picker">
                    <div className="fiori-emails-group-toolbar">
                      {selectedGroupIds.length > 0 ? (
                        <span className="fiori-emails-selection-hint">
                          {selectedGroupIds.length} selecionado{selectedGroupIds.length !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="fiori-emails-selection-hint fiori-emails-selection-hint--empty">
                          Nenhum agrupador selecionado
                        </span>
                      )}
                    </div>
                    <div className="fiori-emails-group-list custom-scrollbar fiori-emails-group-list--dialog">
                      {groups.map((group) => {
                        const isSelected = selectedGroupIds.includes(group.id);
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => toggleGroupId(group.id)}
                            className={cn(
                              "fiori-emails-group-item fiori-emails-group-item--dialog",
                              isSelected && "fiori-emails-group-item--selected"
                            )}
                            aria-pressed={isSelected}
                          >
                            <div
                              className={cn(
                                "fiori-object-row-checkbox",
                                isSelected && "fiori-object-row-checkbox-checked"
                              )}
                              aria-hidden
                            >
                              {isSelected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                            </div>
                            <span className="fiori-emails-group-item-label">{group.name}</span>
                          </button>
                        );
                      })}
                      {groups.length === 0 && (
                        <p className="fiori-emails-picker-empty">Nenhum agrupador disponível</p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
            <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
              <button
                type="button"
                onClick={() => {
                  setContactDialogOpen(false);
                  resetContactForm();
                }}
                disabled={isSaving}
                className="fiori-btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveContact()}
                disabled={isSaving}
                className="fiori-btn-emphasized"
              >
                {isSaving
                  ? "Salvando…"
                  : editingContact
                    ? "Salvar alterações"
                    : "Cadastrar contato"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={groupDialogOpen}
          onOpenChange={(open) => {
            setGroupDialogOpen(open);
            if (!open) {
              setEditingGroup(null);
              setGroupFormName("");
            }
          }}
        >
          <DialogContent
            variant="fiori"
            overlayClassName="fiori-dialog-overlay"
            className="fiori-dialog fiori-dialog--form flex w-[calc(100vw-1rem)] max-w-md flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
          >
            <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
              <DialogDescription className="sr-only">
                {editingGroup ? "Editar agrupador de e-mails" : "Criar novo agrupador de e-mails"}
              </DialogDescription>
              <div className="fiori-dialog-header-row">
                <div className="fiori-dialog-icon shrink-0">
                  <Tag className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="fiori-dialog-title">
                    {editingGroup ? "Editar agrupador" : "Novo agrupador"}
                  </DialogTitle>
                  <p className="fiori-dialog-subtitle">Identificação do agrupador de contatos</p>
                </div>
              </div>
            </DialogHeader>
            <div className="fiori-dialog-body">
              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="email-group-form-name">
                  Nome do agrupador
                </label>
                <Input
                  id="email-group-form-name"
                  value={groupFormName}
                  onChange={(e) => setGroupFormName(e.target.value.toUpperCase())}
                  placeholder="Ex.: FINANCEIRO, TI, OPERACIONAL"
                  className="fiori-input uppercase shadow-none"
                />
              </div>
            </div>
            <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
              <button
                type="button"
                onClick={() => {
                  setGroupDialogOpen(false);
                  setEditingGroup(null);
                  setGroupFormName("");
                }}
                className="fiori-btn-ghost"
              >
                Cancelar
              </button>
              <button type="button" onClick={handleSaveGroup} className="fiori-btn-emphasized">
                {editingGroup ? "Salvar alterações" : "Criar agrupador"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteConfirmGroup} onOpenChange={(open) => !open && setDeleteConfirmGroup(null)}>
          <DialogContent
            variant="fiori"
            overlayClassName="fiori-dialog-overlay"
            className="fiori-dialog fiori-message-box flex max-w-md flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
          >
            <DialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
              <div className="flex items-center gap-3">
                <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="fiori-dialog-title">Excluir agrupador</DialogTitle>
                  <p className="fiori-dialog-subtitle truncate">{deleteConfirmGroup?.name}</p>
                </div>
              </div>
            </DialogHeader>
            <div className="fiori-message-box-body">
              <p className="fiori-message-box-text">
                Tem certeza que deseja excluir este agrupador? Contatos vinculados perderão essa associação.
              </p>
            </div>
            <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
              <button type="button" onClick={() => setDeleteConfirmGroup(null)} className="fiori-btn-ghost">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
                className="fiori-btn-emphasized fiori-btn-emphasized--negative"
              >
                Excluir agrupador
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteConfirmContact} onOpenChange={(open) => !open && setDeleteConfirmContact(null)}>
          <DialogContent
            variant="fiori"
            overlayClassName="fiori-dialog-overlay"
            className="fiori-dialog fiori-message-box flex max-w-md flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
          >
            <DialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
              <div className="flex items-center gap-3">
                <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="fiori-dialog-title">Excluir contato</DialogTitle>
                  <p className="fiori-dialog-subtitle truncate">{deleteConfirmContact?.name}</p>
                </div>
              </div>
            </DialogHeader>
            <div className="fiori-message-box-body">
              <p className="fiori-message-box-text">
                Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
              </p>
              {deleteConfirmContact?.email && (
                <p className="fiori-message-box-context">{deleteConfirmContact.email}</p>
              )}
            </div>
            <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
              <button type="button" onClick={() => setDeleteConfirmContact(null)} className="fiori-btn-ghost">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteContact}
                className="fiori-btn-emphasized fiori-btn-emphasized--negative"
              >
                Excluir contato
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
