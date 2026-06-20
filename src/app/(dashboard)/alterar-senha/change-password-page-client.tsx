"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  ShieldAlert,
  Loader2,
  KeyRound,
  LogOut,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, useDb, useDoc, useMemoDb } from "@/supabase";
import { signOutAndRedirect } from "@/lib/auth/sign-out";
import { doc } from "@/supabase/compat-db-shim";
import type { UserProfile } from "@/types/migration";
import { PASSWORD_MIN_LENGTH, validatePasswordPolicy } from "@/lib/security/password-policy";
import { FioriIconButtonHint } from "@/components/ui/fiori-icon-button-hint";

export function ChangePasswordPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useDb();
  const { user, isUserLoading } = useUser();

  const userDocRef = useMemoDb(
    () => (user && db && !isUserLoading ? doc(db, "users", user.uid) : null),
    [db, user, isUserLoading],
  );
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!user || isUserLoading || profileLoading || !userProfile) return;
    if (userProfile.mustChangePassword !== true) {
      router.replace("/");
    }
  }, [user, isUserLoading, profileLoading, userProfile, router]);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOutAndRedirect(auth, router);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const policyError = validatePasswordPolicy(newPassword);
    if (policyError) {
      toast({
        variant: "destructive",
        title: "Senha fraca",
        description: policyError,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Divergência",
        description: "As senhas não coincidem.",
      });
      return;
    }

    setLoading(true);

    try {
      if (!auth) throw new Error("Autenticação não disponível.");
      if (!user) throw new Error("Usuário não autenticado.");

      const token = await user.getIdToken(true);
      if (!token) throw new Error("Sessão inválida. Faça login novamente.");
      const res = await fetch("/api/user/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, callerToken: token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: "Sua nova senha foi definida.",
      });

      router.replace("/");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Não foi possível alterar a senha no momento.";
      if (message === "Sessão inválida. Faça login novamente.") {
        if (auth) await signOutAndRedirect(auth, router);
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar",
          description: message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading || profileLoading) {
    return (
      <div className="fiori-login-page">
        <Loader2 className="relative z-10 h-8 w-8 animate-spin text-white/80" aria-hidden />
      </div>
    );
  }

  if (!user || userProfile?.mustChangePassword !== true) {
    return null;
  }

  return (
    <div className="fiori-login-page">
      <div className="fiori-login-page-bg" aria-hidden>
        <div className="fiori-login-page-bg-grid" />
        <div className="fiori-login-page-bg-glow fiori-login-page-bg-glow--top" />
        <div className="fiori-login-page-bg-glow fiori-login-page-bg-glow--bottom" />
      </div>

      <div className="fiori-login-layout">
      <aside className="fiori-login-brand">
        <div className="fiori-login-brand-content">
          <div className="fiori-login-brand-head">
            <div className="fiori-login-brand-icon">
              <Zap className="h-7 w-7" aria-hidden />
            </div>
            <div className="fiori-login-brand-lockup">
              <h1 className="fiori-login-brand-title">Migra</h1>
              <p className="fiori-login-brand-subtitle">Gestão técnica de migração</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="fiori-login-panel">
      <div className="fiori-login-card">
        <div className="fiori-login-header">
          <h2 className="fiori-login-title">Definir nova senha</h2>
          <p className="fiori-field-hint fiori-login-header-hint">Primeiro acesso — troca obrigatória</p>
        </div>

        <form onSubmit={handleChangePassword} className="fiori-login-form" noValidate>
          <div className="fiori-login-message fiori-login-message--warning" role="status">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              Escolha uma senha definitiva com no mínimo {PASSWORD_MIN_LENGTH} caracteres,
              diferente da temporária e que não conste em vazamentos conhecidos.
            </p>
          </div>

          <div className="fiori-login-field">
            <label htmlFor="new-password" className="fiori-login-label">
              Nova senha
            </label>
            <p className="fiori-field-hint">Mínimo {PASSWORD_MIN_LENGTH} caracteres</p>
            <div className="fiori-login-input-shell">
              <Lock className="fiori-login-input-icon" aria-hidden />
              <input
                id="new-password"
                name="new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="fiori-login-input"
              />
              <FioriIconButtonHint
                hint={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                side="left"
                className="fiori-login-input-action"
                onClick={() => setShowNewPassword((v) => !v)}
                disabled={loading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </FioriIconButtonHint>
            </div>
          </div>

          <div className="fiori-login-field">
            <label htmlFor="confirm-password" className="fiori-login-label">
              Confirmar nova senha
            </label>
            <p className="fiori-field-hint">Repita a nova senha para confirmar</p>
            <div className="fiori-login-input-shell">
              <KeyRound className="fiori-login-input-icon" aria-hidden />
              <input
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="fiori-login-input"
              />
              <FioriIconButtonHint
                hint={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                side="left"
                className="fiori-login-input-action"
                onClick={() => setShowConfirmPassword((v) => !v)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </FioriIconButtonHint>
            </div>
          </div>

          <div className="fiori-login-actions">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={loading}
              className="fiori-login-btn-secondary"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sair
            </button>
            <button type="submit" disabled={loading} className="fiori-login-submit">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Salvando…
                </>
              ) : (
                "Atualizar senha"
              )}
            </button>
          </div>
        </form>

        <div className="fiori-login-footer">
          <p>Acesso restrito</p>
        </div>
      </div>
      </div>
      </div>

      <footer className="fiori-login-credit">
        Migra Tecnologia <span className="fiori-login-credit-by">by</span> H2D Consultoria
      </footer>
    </div>
  );
}
