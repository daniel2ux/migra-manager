
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FormIconField } from '@/components/ui/form-icon-field';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Mail,
  Lock,
  UserPlus,
  Loader2,
  User,
  AlertCircle,
  ChevronLeft,
  Phone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp, type CompatDb } from '@/supabase/compat-db-shim';
import { ref, uploadBytes, getDownloadURL, type CompatStorage } from '@/supabase/storage-shim';
import Link from 'next/link';
import { useDb, useUser, useDoc, useMemoDb, useStorage } from '@/supabase';
import { Camera, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useDb();
  const { user: currentUser, isUserLoading } = useUser();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'membro' as 'admin' | 'membro',
    phone: '',
    position: '',
    company: '',
    startDate: '',
    endDate: '',
    manager: '',
    alternativeEmail: '',
    department: '',
    projectIds: [] as string[]
  });

  const storage = useStorage();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Imagem muito grande",
          description: "O tamanho máximo permitido é 2MB."
        });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const currentUserRef = useMemoDb(() => currentUser ? doc(db as CompatDb, 'users', currentUser.uid) : null, [db, currentUser]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc(currentUserRef);
  const isAdmin = !isProfileLoading && (
    (currentUserProfile as any)?.role === 'admin' ||
    currentUser?.uid === '9sTbj0ERgMMVfaqDEZGluQ75EmG2'
  );
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);

    let formattedValue = "";
    if (value.length > 0) {
      formattedValue = "(" + value.slice(0, 2);
      if (value.length > 2) {
        formattedValue += ") " + value.slice(2, 7);
      }
      if (value.length > 7) {
        formattedValue += "-" + value.slice(7, 11);
      }
    }
    setFormData(prev => ({ ...prev, phone: formattedValue }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        variant: "destructive",
        title: "E-mail inválido",
        description: "Por favor, insira um endereço de e-mail válido."
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha Curta",
        description: "A senha deve ter no mínimo 6 caracteres."
      });
      return;
    }

    setLoading(true);
    const finalRole = formData.role;

    try {
      let newUserUid: string;

      try {
        if (!currentUser || !isAdmin) {
          throw new Error('Cadastro público desabilitado. Solicite acesso ao administrador.');
        }

        const token = await currentUser.getIdToken();
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            name: formData.name,
            role: finalRole,
            reason: 'Registro via painel admin',
            callerToken: token,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Falha ao criar usuário');
        newUserUid = json.uid;

        let photoURL = "";
        if (photoFile) {
          const storageRef = ref(storage as CompatStorage, `avatars/${newUserUid}`);
          await uploadBytes(storageRef, photoFile);
          photoURL = await getDownloadURL(storageRef);
        }

        await setDoc(doc(db as CompatDb, 'users', newUserUid), {
          uid: newUserUid,
          name: formData.name.toUpperCase(),
          email: formData.email,
          role: finalRole,
          photoURL,
          phone: formData.phone,
          position: formData.position.toUpperCase(),
          company: formData.company.toUpperCase(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          manager: formData.manager.toUpperCase(),
          alternativeEmail: formData.alternativeEmail,
          department: formData.department.toUpperCase(),
          projectIds: formData.projectIds,
          isDisabled: false,
          mustChangePassword: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        toast({
          title: "Sucesso!",
          description: "Usuário cadastrado com sucesso."
        });

        router.push('/usuarios');

      } catch (innerError) {
        throw innerError;
      }

    } catch (error: any) {
      const isKnownError = error.code === 'auth/email-already-in-use' || error.code === 'auth/weak-password' || error.code === 'auth/invalid-email';

      if (!isKnownError) {
        console.error("Erro inesperado no cadastro:", error);
      }

      let message = "Não foi possível criar a conta no momento.";
      if (error.code === 'auth/email-already-in-use') message = "Este e-mail já está em uso.";
      if (error.code === 'auth/weak-password') message = "A senha deve ter no mínimo 6 caracteres.";
      if (error.code === 'auth/invalid-email') message = "Endereço de e-mail inválido.";

      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: message
      });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-SkyBlue-500" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-amber-100 bg-amber-50 rounded-none">
          <CardHeader>
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
            <CardTitle className="text-amber-900 font-black uppercase tracking-tight">Cadastro Restrito</CardTitle>
            <CardDescription className="text-amber-700 font-bold uppercase text-[10px] tracking-widest">
              Novas contas são criadas apenas por administradores. Solicite acesso ao responsável do sistema.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-SkyBlue-600 hover:text-SkyBlue-600 font-black uppercase text-[10px] tracking-widest gap-2 h-10 px-4 hover:bg-SkyBlue-50 rounded-none transition-all active:scale-95 ">
                Fazer Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (currentUser && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-amber-100 bg-amber-50 rounded-none">
          <CardHeader>
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
            <CardTitle className="text-amber-900 font-black uppercase tracking-tight">Acesso Restrito</CardTitle>
            <CardDescription className="text-amber-700 font-bold uppercase text-[10px] tracking-widest">
              Apenas administradores podem cadastrar novos usuários.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-SkyBlue-600 hover:text-SkyBlue-600 font-black uppercase text-[10px] tracking-widest gap-2 h-10 px-4 hover:bg-SkyBlue-50 rounded-none transition-all active:scale-95 ">
                <ChevronLeft className="w-4 h-4" /> <span>VOLTAR PARA O INÍCIO</span>
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-SkyBlue-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[50%] bg-emerald-500 rounded-full blur-[120px]" />
      </div>

      <Card className="w-full max-w-2xl relative z-10 shadow-none border  rounded-none overflow-hidden">
        <CardHeader className="space-y-1 text-center relative">
          {currentUser && (
            <Link href="/usuarios" className="absolute left-6 top-6">
              <Button
                variant="ghost"
                size="sm"
                className="text-SkyBlue-600 hover:text-SkyBlue-600 font-bold uppercase text-[10px] tracking-widest gap-2 h-10 px-4 hover:bg-SkyBlue-50 rounded-none transition-all active:scale-95  -ml-4"
              >
                <ChevronLeft className="w-4 h-4" /> <span>VOLTAR PARA USUÁRIOS</span>
              </Button>
            </Link>
          )}
          <div className="mx-auto bg-SkyBlue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-SkyBlue-500" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tight">
            Novo Usuário
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Gestão Técnica • Migra V1.0
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 border border-dashed border-slate-200 mb-6 group/avatar relative">
              <Avatar className="w-24 h-24 border-4 border-white shadow-xl rounded-2xl">
                <AvatarImage src={photoPreview || ""} className="object-cover" />
                <AvatarFallback className="bg-slate-200 text-slate-400 rounded-none">
                  <User className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                id="photo-upload"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => document.getElementById("photo-upload")?.click()}
                  className="text-[10px] font-black uppercase tracking-widest text-SkyBlue-600 hover:bg-SkyBlue-50 gap-2 h-8 rounded-none transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {photoFile ? "Alterar Foto" : "Adicionar Foto"}
                </Button>
                {photoFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-none shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                Opcional • Máximo 2MB
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormIconField
                id="name"
                label="Nome completo"
                icon={User}
                name="name"
                placeholder="SEU NOME"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                disabled={loading}
                inputClassName="uppercase"
              />

              <FormIconField
                id="email"
                label="E-mail principal"
                icon={Mail}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nome@empresa.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />

              <FormIconField
                id="password"
                label="Senha provisória"
                icon={Lock}
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
              />

              <FormIconField
                id="phone"
                label="Telefone"
                icon={Phone}
                name="phone"
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={handlePhoneChange}
                disabled={loading}
              />
            </div>



            {!loading && (
              <Button
                type="submit"
                variant="outline"
                className="w-full font-black uppercase text-[10px] tracking-widest h-12  text-SkyBlue-600 hover:bg-SkyBlue-50 hover:text-SkyBlue-600 rounded-none transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Usuário
              </Button>
            )}
            {loading && (
              <div className="flex w-full items-center justify-center font-black uppercase text-[10px] tracking-widest h-12 border  text-slate-400 bg-white rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cadastrando...
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
