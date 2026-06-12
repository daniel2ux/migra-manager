
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FormIconField } from '@/components/ui/form-icon-field';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ShieldAlert, Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha Fraca",
        description: "A senha deve ter no mínimo 6 caracteres."
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Divergência",
        description: "As senhas não coincidem."
      });
      return;
    }

    setLoading(true);

    try {
      if (!auth) throw new Error("Autenticação não disponível.");
      if (!auth.currentUser) throw new Error("Usuário não autenticado.");

      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/user/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, callerToken: token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Sucesso!",
        description: "Sua nova senha foi definida."
      });

      router.push('/');
    } catch (error: any) {
      if (error.message === 'Sessão inválida. Faça login novamente.') {
        if (auth) await signOut(auth);
        router.push('/login');
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar",
          description: error.message || "Não foi possível alterar a senha no momento."
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-SkyBlue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-SkyBlue-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[50%] bg-emerald-500 rounded-full blur-[120px]" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-none border border-slate-100 bg-white rounded-none overflow-hidden">
        <CardHeader className="space-y-1 text-center pb-2 px-8 pt-8">
          <div className="mx-auto bg-amber-50 w-16 h-16 rounded-3xl flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900 uppercase">Definir Nova Senha</CardTitle>
          <CardDescription className="font-bold uppercase text-[10px] tracking-widest text-slate-400">
            Segurança Técnica • Migra V1.0
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 px-8 pb-8">
          <div className="p-4 bg-amber-50 rounded-none border border-dashed  mb-6 flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 leading-relaxed font-bold uppercase tracking-widest">
              Por favor, escolha uma senha definitiva para garantir a integridade do seu acesso técnico ao sistema.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <FormIconField
              id="new-password"
              label="Nova senha"
              icon={Lock}
              name="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
            <FormIconField
              id="confirm-password"
              label="Confirmar nova senha"
              icon={Lock}
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />

            <div className="flex gap-2 pt-4">
              {!loading && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.back()}
                    className="flex-1 font-bold uppercase text-[10px] tracking-widest h-10 px-6 transition-all active:scale-95"
                  >
                    CANCELAR
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    className="flex-1 font-bold uppercase text-[10px] tracking-widest h-10 px-8 transition-all active:scale-95"
                  >
                    ATUALIZAR
                  </Button>
                </>
              )}
              {loading && (
                <div className="flex w-full items-center justify-center font-black uppercase text-[10px] tracking-widest h-10 border text-slate-400 bg-white">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> PROCESSANDO...
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
