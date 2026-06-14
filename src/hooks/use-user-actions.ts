"use client";

import { useDb, useStorage } from "@/supabase";
import type { UserProfile, UserFormData, CreateUserData, ResetPasswordResult, EmailSignature } from "@/types/usuarios";
import { useUserCrud } from "./user/use-user-crud";
import { useUserSettings } from "./user/use-user-settings";
import { useUserUploads } from "./user/use-user-uploads";

interface UseUserActionsProps {
  user: any;
  isMaster: boolean;
  isAdmin: boolean;
  canChangeAccessProfile?: boolean;
}

interface UseUserActionsReturn {
  handleEditUser: (userToEdit: UserProfile) => void;
  handleSaveEdit: (selectedUser: UserProfile | null, editFormData: Partial<UserFormData>) => Promise<boolean>;
  handleToggleBlock: (targetUser: UserProfile) => Promise<void>;
  handleOpenRoleDialog: (targetUser: UserProfile) => void;
  handleChangeRole: (
    roleDialogTarget: UserProfile | null,
    roleDialogNewRole: UserProfile["role"],
    roleDialogReason: string,
    roleDialogProfileName: string,
    accessProfileId?: string | null,
  ) => Promise<boolean>;
  handleOpenResetConfirm: (targetUser: UserProfile) => void;
  handleResetPassword: (resetTarget: UserProfile | null) => Promise<ResetPasswordResult | null>;
  handleDeleteUser: (target: UserProfile | null) => Promise<boolean>;
  handleCopyPassword: (resetResult: ResetPasswordResult | null) => Promise<boolean>;
  handleResendCredentials: (result: ResetPasswordResult | null) => Promise<ResetPasswordResult | null>;
  handleCreateUser: (createFormData: CreateUserData) => Promise<ResetPasswordResult | null>;
  handleSaveEmail: (targetUid: string, emailEditValue: string) => Promise<boolean>;
  handleSaveMigrador: (migradorInput: string) => Promise<void>;
  handleSaveFromEmail: (fromEmailInput: string) => Promise<void>;
  handleAddSignature: (newSigName: string, newSigContent: string, newSigImageUrl: string) => Promise<boolean>;
  handleDeleteSignature: (sig: EmailSignature) => Promise<void>;
  handleSigImageUpload: (file: File, user: any, storage: any) => Promise<string | null>;
  handleAvatarUpload: (file: File, user: any, storage: any, db: any) => Promise<boolean>;
  isSavingEmail: boolean;
  isChangingRole: boolean;
  isResetting: boolean;
  isResendingEmail: boolean;
  isDeletingUser: boolean;
  isCreatingUser: boolean;
  isSavingMigrador: boolean;
  isSavingFrom: boolean;
  isSavingSig: boolean;
  isUploadingSigImage: boolean;
  isUploadingAvatar: boolean;
}

/**
 * Hook composto que agrega 3 hooks especializados:
 * - useUserCrud: CRUD, role, password, block, email
 * - useUserSettings: migrador, fromEmail, signatures
 * - useUserUploads: avatar, signature image
 */
export function useUserActions({ user, isMaster, isAdmin, canChangeAccessProfile = false }: UseUserActionsProps): UseUserActionsReturn {
  const db = useDb();
  const storage = useStorage();

  const crud = useUserCrud({ user, isMaster, isAdmin, canChangeAccessProfile });
  const settings = useUserSettings({ user });
  const uploads = useUserUploads({ user, storage, db });

  // Placeholder handlers mantidos para compatibilidade
  const handleEditUser = () => { };
  const handleOpenRoleDialog = () => { };
  const handleOpenResetConfirm = () => { };

  return {
    handleEditUser,
    handleSaveEdit: crud.handleSaveEdit,
    handleToggleBlock: crud.handleToggleBlock,
    handleOpenRoleDialog,
    handleChangeRole: crud.handleChangeRole,
    handleOpenResetConfirm,
    handleResetPassword: crud.handleResetPassword,
    handleDeleteUser: crud.handleDeleteUser,
    handleCopyPassword: crud.handleCopyPassword,
    handleResendCredentials: crud.handleResendCredentials,
    handleCreateUser: crud.handleCreateUser,
    handleSaveEmail: crud.handleSaveEmail,
    handleSaveMigrador: settings.handleSaveMigrador,
    handleSaveFromEmail: settings.handleSaveFromEmail,
    handleAddSignature: settings.handleAddSignature,
    handleDeleteSignature: settings.handleDeleteSignature,
    handleSigImageUpload: uploads.handleSigImageUpload,
    handleAvatarUpload: uploads.handleAvatarUpload,
    isSavingEmail: crud.isSavingEmail,
    isChangingRole: crud.isChangingRole,
    isResetting: crud.isResetting,
    isResendingEmail: crud.isResendingEmail,
    isDeletingUser: crud.isDeletingUser,
    isCreatingUser: crud.isCreatingUser,
    isSavingMigrador: settings.isSavingMigrador,
    isSavingFrom: settings.isSavingFrom,
    isSavingSig: settings.isSavingSig,
    isUploadingSigImage: uploads.isUploadingSigImage,
    isUploadingAvatar: uploads.isUploadingAvatar,
  };
}
