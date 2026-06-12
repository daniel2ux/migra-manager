"use client";

import { useState, useRef } from "react";
import { Loader2, UserPlus, Search, Users, X } from "lucide-react";
import { useFirestore, useStorage, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { getProjectCompanyName } from "@/lib/migration/project-company";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/migration";
import type { UserProfile, UserFormData, CreateUserData, ResetPasswordResult } from "@/types/usuarios";
import {
  UserCard,
  AccessDeniedScreen,
  UserGridEmptyState,
  EditUserDialog,
  CreateUserDialog,
  RoleChangeDialog,
  ResetPasswordConfirmDialog,
  ResetPasswordResultDialog,
  DeleteUserConfirmDialog,
  EmailSignaturesDialog,
} from "@/components/usuarios";
import { useUsersData, useUserPermissions } from "@/hooks/use-users-data";
import { useUserActions } from "@/hooks/use-user-actions";

const PAGE_TOOLBAR_BTN =
  "fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0";

export default function UsuariosPage() {
  const db = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();
  const { projectId } = useActiveProjectId();
  const areServicesAvailable = !!db && !!storage;

  const projectRef = useMemoFirebase(
    () => (db && projectId ? doc(db, "projects", projectId) : null),
    [db, projectId],
  );
  const { data: projectData } = useDoc<Project>(projectRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReadOnlyDialog, setIsReadOnlyDialog] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<UserFormData>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [roleDialogTarget, setRoleDialogTarget] = useState<UserProfile | null>(null);
  const [roleDialogNewRole, setRoleDialogNewRole] = useState<UserProfile["role"]>("membro");
  const [roleDialogReason, setRoleDialogReason] = useState("");
  const [roleDialogProfileName, setRoleDialogProfileName] = useState("");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSignaturesDialogOpen, setIsSignaturesDialogOpen] = useState(false);

  // Email inline editing
  const [emailEditUserId, setEmailEditUserId] = useState<string | null>(null);
  const [emailEditValue, setEmailEditValue] = useState("");

  // Avatar upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data hooks
  const {
    currentUserProfile,
    isProfileLoading,
    isUsersLoading,
    filteredUsers,
    isMaster,
    isAdmin,
  } = useUsersData(searchTerm);

  const { canEditSelectedUser } = useUserPermissions(
    selectedUser,
    user?.uid,
    isMaster,
    isAdmin,
  );

  // Actions hook
  const actions = useUserActions({ user, isMaster, isAdmin });

  // Safety: if services are not yet available, show loader
  if (!areServicesAvailable || !db || !storage) {
    return (
      <DashboardShell noPadding>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-SkyBlue-500" />
        </div>
      </DashboardShell>
    );
  }

  if (!isProfileLoading && !isAdmin) {
    return (
      <DashboardShell noPadding>
        <div className="flex flex-col h-full">
          <PageHeader
            variant="fiori"
            title="Recursos humanos"
            subtitle="Diretório de profissionais"
            backHref="/"
          />
          <AccessDeniedScreen />
        </div>
      </DashboardShell>
    );
  }

  // Handlers for orchestration
  const handleEditUser = (userToEdit: UserProfile) => {
    setIsReadOnlyDialog(false);
    setSelectedUser(userToEdit);
    setEditFormData({
      name: userToEdit.name || "",
      phone: userToEdit.phone || "",
      company: userToEdit.company || "",
      position: userToEdit.position || "",
      department: userToEdit.department || "",
      manager: userToEdit.manager || "",
      startDate: userToEdit.startDate || "",
      endDate: userToEdit.endDate || "",
      notes: userToEdit.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleViewUser = (userToView: UserProfile) => {
    setIsReadOnlyDialog(true);
    setSelectedUser(userToView);
    setEditFormData({
      name: userToView.name || "",
      phone: userToView.phone || "",
      company: userToView.company || "",
      position: userToView.position || "",
      department: userToView.department || "",
      manager: userToView.manager || "",
      startDate: userToView.startDate || "",
      endDate: userToView.endDate || "",
      notes: userToView.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    await actions.handleSaveEdit(selectedUser, editFormData);
    setIsEditDialogOpen(false);
  };

  const handleOpenRoleDialog = (targetUser: UserProfile) => {
    setRoleDialogTarget(targetUser);
    setRoleDialogNewRole(targetUser.role);
    setRoleDialogReason("");
    setRoleDialogProfileName(targetUser.position || "");
    setIsRoleDialogOpen(true);
  };

  const handleChangeRole = async () => {
    const success = await actions.handleChangeRole(
      roleDialogTarget,
      roleDialogNewRole,
      roleDialogReason,
      roleDialogProfileName,
    );
    if (success) setIsRoleDialogOpen(false);
  };

  const handleOpenResetConfirm = (targetUser: UserProfile) => {
    setResetTarget(targetUser);
    setIsResetConfirmOpen(true);
  };

  const handleOpenDeleteConfirm = (targetUser: UserProfile) => {
    setDeleteTarget(targetUser);
    setIsDeleteConfirmOpen(true);
  };

  const handleResetPassword = async () => {
    const result = await actions.handleResetPassword(resetTarget);
    if (result) {
      setIsResetConfirmOpen(false);
      setResetResult(result);
    }
  };

  const handleDeleteUser = async () => {
    const success = await actions.handleDeleteUser(deleteTarget);
    if (success) {
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleCreateUser = async (data: CreateUserData): Promise<boolean> => {
    const tempPassword = await actions.handleCreateUser(data);
    if (tempPassword) {
      setIsCreateDialogOpen(false);
      setResetResult({ name: data.name, tempPassword });
      return true;
    }
    return false;
  };

  const handleCopyPassword = async () => {
    const success = await actions.handleCopyPassword(resetResult);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEmail = async (targetUid: string) => {
    const success = await actions.handleSaveEmail(targetUid, emailEditValue);
    if (success) setEmailEditUserId(null);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro no upload",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    const success = await actions.handleAvatarUpload(file, user, storage, db);
    if (success && fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSigImageUpload = async (file: File) => {
    return await actions.handleSigImageUpload(file, user, storage);
  };

  return (
    <DashboardShell noPadding>
      <div className="flex flex-col flex-1 min-h-[calc(100dvh-4rem)] relative w-full">
        <PageHeader
          variant="fiori"
          title="Recursos humanos"
          subtitle="Diretório de profissionais"
          icon={<Users className="w-5 h-5" aria-hidden />}
          badge={filteredUsers.length}
          empresa={getProjectCompanyName(projectData) ?? undefined}
          projectName={projectData?.name}
          backHref="/"
          actions={
            <TooltipProvider delayDuration={0}>
              <div className="fiori-toolbar">
                <div className={cn("fiori-toolbar-search", isSearchOpen && "fiori-toolbar-search--open")}>
                  <div className="fiori-search-shell">
                    <Search className="fiori-search-icon" aria-hidden />
                    <input
                      type="search"
                      autoFocus={isSearchOpen}
                      placeholder="Pesquisar profissionais..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="fiori-search-input"
                      aria-label="Pesquisar profissionais"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="fiori-search-clear"
                        onClick={() => setSearchTerm("")}
                        aria-label="Limpar busca"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        PAGE_TOOLBAR_BTN,
                        (isSearchOpen || searchTerm) && "fiori-toolbar-btn-active",
                      )}
                      onClick={() => setIsSearchOpen(!isSearchOpen)}
                      aria-label={isSearchOpen ? "Fechar busca" : "Pesquisar profissionais"}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" variant="fiori">
                    {isSearchOpen ? "Fechar busca" : "Pesquisar profissionais"}
                  </TooltipContent>
                </Tooltip>

                {isMaster && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsCreateDialogOpen(true)}
                        className={PAGE_TOOLBAR_BTN}
                        aria-label="Novo profissional"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" variant="fiori">
                      Novo profissional
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          }
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="fiori-wizard-inner py-4 md:py-6">
            {isUsersLoading ? (
              <div className="fiori-wizard-empty min-h-[12rem]">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--fiori-brand)]" aria-hidden />
                <p>Carregando profissionais…</p>
              </div>
            ) : (
              <div className="fiori-user-card-grid">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <UserCard
                      key={u.uid}
                      user={u}
                      isMe={user?.uid === u.uid}
                      isMaster={isMaster}
                      isAdmin={isAdmin}
                      isUploadingAvatar={actions.isUploadingAvatar}
                      emailEditUserId={emailEditUserId}
                      emailEditValue={emailEditValue}
                      isSavingEmail={actions.isSavingEmail}
                      onAvatarUpload={handleAvatarUpload}
                      onEmailEditStart={() => { setEmailEditValue(u.email || ""); setEmailEditUserId(u.uid); }}
                      onEmailEditSave={() => handleSaveEmail(u.uid)}
                      onEmailEditCancel={() => setEmailEditUserId(null)}
                      onEmailChange={setEmailEditValue}
                      onViewUser={() => handleViewUser(u)}
                      onEditUser={() => handleEditUser(u)}
                      onToggleBlock={() => actions.handleToggleBlock(u)}
                      onOpenRoleDialog={() => handleOpenRoleDialog(u)}
                      onOpenResetConfirm={() => handleOpenResetConfirm(u)}
                      onOpenDeleteConfirm={() => handleOpenDeleteConfirm(u)}
                      onOpenSettings={() => handleEditUser(u)}
                      onOpenSignatures={() => setIsSignaturesDialogOpen(true)}
                    />
                  ))
                ) : (
                  <UserGridEmptyState hasSearch={searchTerm.length > 0} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <EditUserDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setIsReadOnlyDialog(false);
          }}
          user={selectedUser}
          formData={editFormData}
          onFormDataChange={setEditFormData}
          onSave={handleSaveEdit}
          canEdit={!isReadOnlyDialog && canEditSelectedUser}
          isSaving={false}
        />

        <CreateUserDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreate={handleCreateUser}
          isCreating={actions.isCreatingUser}
        />

        <RoleChangeDialog
          open={isRoleDialogOpen}
          onOpenChange={setIsRoleDialogOpen}
          targetUser={roleDialogTarget}
          newRole={roleDialogNewRole}
          onRoleChange={setRoleDialogNewRole}
          reason={roleDialogReason}
          onReasonChange={setRoleDialogReason}
          profileName={roleDialogProfileName}
          onProfileNameChange={setRoleDialogProfileName}
          onSubmit={handleChangeRole}
          isChanging={actions.isChangingRole}
        />

        <ResetPasswordConfirmDialog
          open={isResetConfirmOpen}
          onOpenChange={setIsResetConfirmOpen}
          targetUser={resetTarget}
          onConfirm={handleResetPassword}
          isResetting={actions.isResetting}
        />

        <DeleteUserConfirmDialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          targetUser={deleteTarget}
          onConfirm={handleDeleteUser}
          isDeleting={actions.isDeletingUser}
        />

        <ResetPasswordResultDialog
          open={!!resetResult}
          onOpenChange={(open) => { if (!open) setResetResult(null); }}
          result={resetResult}
          onCopy={handleCopyPassword}
          copied={copied}
        />

        <EmailSignaturesDialog
          open={isSignaturesDialogOpen}
          onOpenChange={setIsSignaturesDialogOpen}
          signatures={currentUserProfile?.emailSignatures || []}
          onAdd={actions.handleAddSignature}
          onDelete={actions.handleDeleteSignature}
          onImageUpload={handleSigImageUpload}
          isSaving={actions.isSavingSig}
          isUploadingImage={actions.isUploadingSigImage}
        />

      </div>
    </DashboardShell>
  );
}
