
"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Mail, Lock, Loader2, Zap, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useDb } from '@/supabase';
import { isSupabaseEnvComplete } from '@/supabase/env';
import { signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence, Auth } from '@/supabase/auth-shim';
import { doc, getDoc, type CompatDb } from '@/supabase/compat-db-shim';


function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useDb();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'session_ended') {
      setInfoMessage('Sessão encerrada com sucesso.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Informe um e-mail válido.');
      setLoading(false);
      return;
    }

    if (!isSupabaseEnvComplete) {
      setError('Supabase não configurado. Preencha .env.local e reinicie o servidor (npm run dev).');
      setLoading(false);
      return;
    }

    try {
      await signOut(auth as Auth).catch(() => { });

      await setPersistence(auth as Auth, browserSessionPersistence);

      const userCredential = await signInWithEmailAndPassword(auth as Auth, normalizedEmail, password);
      const signedInUser = userCredential.user;

      const { data: sessionData } = await (auth as Auth).getSession();
      if (!sessionData.session) {
        setError('Sessão não iniciada. Reinicie o navegador e tente novamente.');
        return;
      }

      await signedInUser.getIdToken(true);

      const userDocRef = doc(db as CompatDb, 'users', signedInUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as { isDisabled?: boolean; mustChangePassword?: boolean } | undefined;

        if (userData?.isDisabled === true) {
          await signOut(auth as Auth);
          setError("Esta conta está bloqueada.");
          return;
        }

        if (userData?.mustChangePassword === true) {
          toast({
            title: "Primeiro Acesso",
            description: "Por favor, defina sua senha definitiva."
          });
          router.replace('/alterar-senha');
          return;
        }
      }

      router.replace('/');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const message = err instanceof Error ? err.message : String(err);
      console.error("[LoginPage] Erro de autenticação:", code ?? message);

      const errorMap: Record<string, string> = {
        'auth/invalid-credential':
          'E-mail ou senha incorretos. Se a senha foi resetada pelo administrador, use a senha temporária exibida no painel de usuários.',
        'auth/invalid-email': 'Formato de e-mail inválido.',
        'auth/user-disabled': 'Esta conta foi desativada.',
        'auth/user-not-found': 'E-mail não encontrado neste projeto.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/too-many-requests': 'Muitas tentativas falhas. Aguarde alguns minutos e tente novamente.',
        'auth/network-request-failed': 'Falha de rede. Verifique sua conexão.',
        'auth/weak-password': 'Senha não atende aos requisitos de segurança (mín. 10 caracteres, não pode estar em vazamentos conhecidos).',
        'permission-denied': 'Sem permissão para acessar o perfil. Contate o administrador.',
      };

      setError(errorMap[code ?? ''] ?? message ?? 'Falha ao entrar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fiori-login-brand">
        <div className="fiori-login-brand-icon">
          <Zap className="w-7 h-7" aria-hidden />
        </div>
        <h1 className="fiori-login-brand-title">Migra</h1>
        <p className="fiori-login-brand-subtitle">Gestão técnica de migração</p>
      </div>

      <div className="fiori-login-card">
        <div className="fiori-login-header">
          <h2 className="fiori-login-title">Entrar na plataforma</h2>
          <p className="fiori-login-subtitle">Use suas credenciais de acesso</p>
        </div>

        <form onSubmit={handleLogin} className="fiori-login-form">
          <div className="fiori-login-field">
            <label htmlFor="login-email" className="fiori-login-label">E-mail</label>
            <div className="fiori-login-input-shell">
              <Mail className="fiori-login-input-icon" aria-hidden />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="fiori-login-input"
              />
            </div>
          </div>

          <div className="fiori-login-field">
            <label htmlFor="login-password" className="fiori-login-label">Senha</label>
            <div className="fiori-login-input-shell">
              <Lock className="fiori-login-input-icon" aria-hidden />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="fiori-login-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="fiori-login-input-action"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {infoMessage && (
            <div className="fiori-login-message fiori-login-message--info" role="status">
              <Info className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <p>{infoMessage}</p>
            </div>
          )}

          {error && (
            <div className="fiori-login-message fiori-login-message--error" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="fiori-login-submit"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Entrando…
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="fiori-login-footer">
          <p>Acesso restrito</p>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="fiori-login-page">
      <div className="fiori-login-page-bg" aria-hidden>
        <div className="fiori-login-page-bg-glow fiori-login-page-bg-glow--top" />
        <div className="fiori-login-page-bg-glow fiori-login-page-bg-glow--bottom" />
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <p className="fiori-login-credit">H2D Consultoria</p>
    </div>
  );
}
