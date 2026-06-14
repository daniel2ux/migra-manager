"use client";

import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "@/supabase/compat-db-shim";
import { useDb } from "@/supabase";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, UserFormData, CreateUserData, ResetPasswordResult } from "@/types/usuarios";

interface UseUserCrudProps {
  user: any;
  isMaster: boolean;
  isAdmin: boolean;
}

export function useUserCrud({ user, isMaster, isAdmin }: UseUserCrudProps) {
  const db = useDb();
  const { toast } = useToast();

  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // ── Toggle Block ──────────────────────────────────────────────────────
  const handleToggleBlock = async (targetUser: UserProfile) => {
    if (!db || !isAdmin) return;

    const targetIsMaster = targetUser.role === 'master' || targetUser.isMaster;
    if (targetIsMaster && !isMaster) {
      toast({ variant: "destructive", description: "Apenas usuários MASTER podem bloquear outros MASTER." });
      return;
    }

    try {
      await updateDoc(doc(db, "users", targetUser.uid), {
        isDisabled: !targetUser.isDisabled,
        updatedAt: serverTimestamp(),
      });
      toast({ description: `Usuário ${targetUser.isDisabled ? "REATIVADO" : "BLOQUEADO"} com sucesso.` });
    } catch {
      toast({ variant: "destructive", description: "Erro ao atualizar status do usuário." });
    }
  };

  // ── Role Change ───────────────────────────────────────────────────────
  const handleChangeRole = async (
    target: UserProfile | null,
    newRole: UserProfile["role"],
    reason: string,
    profileName: string,
  ): Promise<boolean> => {
    if (!user || !target || !reason.trim() || !isMaster) return false;

    setIsChangingRole(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/change-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: target.uid, newRole, reason, callerToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (profileName.trim() && db) {
        await updateDoc(doc(db, "users", target.uid), {
          position: profileName.trim().toUpperCase(),
        });
      }

      toast({ description: `Perfil de ${target.name} alterado para ${newRole.toUpperCase()}.` });
      return true;
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error ? e.message : "Erro ao alterar perfil." });
      return false;
    } finally {
      setIsChangingRole(false);
    }
  };

  // ── Edit User ─────────────────────────────────────────────────────────
  const handleSaveEdit = async (selectedUser: UserProfile | null, editFormData: Partial<UserFormData>): Promise<boolean> => {
    if (!db || !selectedUser) return false;

    const isSelf = selectedUser.uid === user?.uid;
    const targetIsMaster = selectedUser.role === 'master' || selectedUser.isMaster;
    if (targetIsMaster && !isMaster && !isSelf) return false;
    if (!isAdmin && !isSelf) return false;

    const payload: Partial<UserFormData> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
      name: editFormData.name?.trim() || selectedUser.name,
      phone: editFormData.phone?.trim() ?? '',
      company: editFormData.company?.trim() ?? '',
      position: editFormData.position?.trim() ?? '',
      department: editFormData.department?.trim() ?? '',
      manager: editFormData.manager?.trim() ?? '',
      startDate: editFormData.startDate?.trim() ?? '',
      endDate: editFormData.endDate?.trim() ?? '',
      notes: editFormData.notes?.trim() ?? '',
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(doc(db, "users", selectedUser.uid), payload);
      toast({ description: "Perfil técnico atualizado com sucesso." });
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao salvar alterações.";
      console.error("[handleSaveEdit]", e);
      toast({ variant: "destructive", description: message });
      return false;
    }
  };

  // ── Reset Password ────────────────────────────────────────────────────
  const handleResetPassword = async (resetTarget: UserProfile | null): Promise<ResetPasswordResult | null> => {
    if (!user || !resetTarget || !isMaster) return null;

    setIsResetting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: resetTarget.uid, callerToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const emailSent = data.emailSent === true;
      if (emailSent) {
        toast({
          description: `Senha redefinida. E-mail enviado para ${resetTarget.email}.`,
        });
      } else {
        toast({
          variant: 'destructive',
          description: `Senha redefinida, mas o e-mail não foi enviado${data.emailError ? `: ${data.emailError}` : ' — configure SMTP em Configurações.'}`,
        });
      }
      return {
        name: resetTarget.name,
        email: data.sentTo ?? resetTarget.email,
        tempPassword: data.tempPassword,
        emailSent,
        emailError: data.emailError,
        messageId: data.messageId,
      };
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error ? e.message : "Erro ao resetar senha." });
      return null;
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async (target: UserProfile | null): Promise<boolean> => {
    if (!user || !target || (!isMaster && !isAdmin)) return false;
    if (target.uid === user.uid) {
      toast({ variant: "destructive", description: "Não é permitido excluir o próprio usuário." });
      return false;
    }
    const targetIsMaster = target.role === "master" || target.isMaster;
    if (targetIsMaster && !isMaster) {
      toast({ variant: "destructive", description: "Não é permitido excluir usuários com perfil MASTER." });
      return false;
    }
    if (!isMaster && target.role === "admin") {
      toast({ variant: "destructive", description: "Apenas usuários MASTER podem excluir contas de governança." });
      return false;
    }

    setIsDeletingUser(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/session-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: target.uid, action: "delete", callerToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao excluir usuário.");
      toast({ description: `Usuário ${target.name} removido permanentemente.` });
      return true;
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error ? e.message : "Erro ao excluir usuário." });
      return false;
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleCopyPassword = async (resetResult: ResetPasswordResult | null): Promise<boolean> => {
    if (!resetResult) return false;
    navigator.clipboard.writeText(resetResult.tempPassword);
    return true;
  };

  const handleResendCredentials = async (result: ResetPasswordResult | null): Promise<ResetPasswordResult | null> => {
    if (!user || !result?.email || !isMaster) return null;

    setIsResendingEmail(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/resend-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.name,
          email: result.email,
          tempPassword: result.tempPassword,
          callerToken: token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.emailError ?? data.error ?? 'Falha ao reenviar e-mail.');

      toast({ description: `E-mail reenviado para ${data.sentTo ?? result.email}.` });
      return {
        ...result,
        email: data.sentTo ?? result.email,
        emailSent: true,
        emailError: undefined,
        messageId: data.messageId,
      };
    } catch (e) {
      toast({
        variant: 'destructive',
        description: e instanceof Error ? e.message : 'Erro ao reenviar e-mail.',
      });
      return null;
    } finally {
      setIsResendingEmail(false);
    }
  };

  // ── Create User ───────────────────────────────────────────────────────
  const handleCreateUser = async (createFormData: CreateUserData): Promise<ResetPasswordResult | null> => {
    if (!user || !isMaster) return null;

    setIsCreatingUser(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createFormData.name,
          email: createFormData.email,
          role: createFormData.role,
          company: createFormData.company,
          position: createFormData.position,
          reason: createFormData.reason,
          callerToken: token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const emailSent = data.emailSent === true;
      toast({
        description: emailSent
          ? `Profissional ${createFormData.name} cadastrado. E-mail de primeiro acesso enviado para ${createFormData.email}.`
          : `Profissional ${createFormData.name} cadastrado. E-mail não enviado${data.emailError ? `: ${data.emailError}` : ' — configure SMTP em Configurações.'}`,
        variant: emailSent ? 'default' : 'destructive',
      });
      return {
        name: createFormData.name,
        email: createFormData.email,
        tempPassword: data.tempPassword,
        emailSent,
        emailError: data.emailError,
      };
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error ? e.message : "Erro ao cadastrar profissional." });
      return null;
    } finally {
      setIsCreatingUser(false);
    }
  };

  // ── Save Email ────────────────────────────────────────────────────────
  const handleSaveEmail = async (targetUid: string, emailEditValue: string): Promise<boolean> => {
    if (!db || !user || !emailEditValue.trim()) return false;

    const isEditingSelf = targetUid === user.uid;
    if (!isMaster && !isEditingSelf) {
      toast({ variant: "destructive", description: "Você não tem permissão para alterar o e-mail de outros profissionais." });
      return false;
    }

    setIsSavingEmail(true);
    try {
      await updateDoc(doc(db, "users", targetUid), {
        email: emailEditValue.trim().toLowerCase(),
        updatedAt: serverTimestamp(),
      });
      toast({ description: "E-mail atualizado com sucesso." });
      return true;
    } catch {
      toast({ variant: "destructive", description: "Erro ao atualizar e-mail." });
      return false;
    } finally {
      setIsSavingEmail(false);
    }
  };

  return {
    handleToggleBlock,
    handleChangeRole,
    handleSaveEdit,
    handleResetPassword,
    handleDeleteUser,
    handleCopyPassword,
    handleResendCredentials,
    handleCreateUser,
    handleSaveEmail,
    isChangingRole,
    isResetting,
    isResendingEmail,
    isDeletingUser,
    isCreatingUser,
    isSavingEmail,
  };
}
