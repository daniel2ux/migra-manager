"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/supabase";
import { doc, updateDoc, arrayUnion, arrayRemove, Firestore } from "firebase/firestore";
import type { EmailSignature } from "@/types/migration";
import { User, Save, Loader2, CheckCircle2, Mail, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

export default function PerfilPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(
    () => (user && db ? doc(db as Firestore, "users", user.uid) : null),
    [db, user]
  );
  const { data: userProfile } = useDoc<any>(userDocRef);

  const signatures: EmailSignature[] = userProfile?.emailSignatures ?? [];

  // Migrador
  const [migradorInput, setMigradorInput] = useState("");
  const [isSavingMigrador, setIsSavingMigrador] = useState(false);
  const [savedMigrador, setSavedMigrador] = useState(false);

  useEffect(() => {
    if (userProfile?.migradorName !== undefined) {
      setMigradorInput(userProfile.migradorName);
    }
  }, [userProfile?.migradorName]);

  const handleSaveMigrador = async () => {
    if (!user) return;
    setIsSavingMigrador(true);
    setSavedMigrador(false);
    try {
      await updateDoc(doc(db as Firestore, "users", user.uid), {
        migradorName: migradorInput.trim().toUpperCase(),
      });
      setSavedMigrador(true);
      // toast({ description: "Migrador salvo." });
      setTimeout(() => setSavedMigrador(false), 3000);
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar migrador." });
    } finally {
      setIsSavingMigrador(false);
    }
  };

  // E-mail de origem
  const [fromEmailInput, setFromEmailInput] = useState("");
  const [isSavingFrom, setIsSavingFrom] = useState(false);
  const [savedFrom, setSavedFrom] = useState(false);

  useEffect(() => {
    if (userProfile?.fromEmail !== undefined) {
      setFromEmailInput(userProfile.fromEmail);
    }
  }, [userProfile?.fromEmail]);

  const handleSaveFromEmail = async () => {
    if (!user) return;
    setIsSavingFrom(true);
    setSavedFrom(false);
    try {
      await updateDoc(doc(db as Firestore, "users", user.uid), { fromEmail: fromEmailInput.trim() });
      setSavedFrom(true);
      // toast({ description: "E-mail de origem salvo." });
      setTimeout(() => setSavedFrom(false), 3000);
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar e-mail de origem." });
    } finally {
      setIsSavingFrom(false);
    }
  };

  // Assinaturas
  const [newSigName, setNewSigName] = useState("");
  const [newSigContent, setNewSigContent] = useState("");
  const [newSigImageUrl, setNewSigImageUrl] = useState("");
  const [isSavingSig, setIsSavingSig] = useState(false);

  const handleAddSignature = async () => {
    if (!newSigName.trim() || (!newSigContent.trim() && !newSigImageUrl.trim()) || !user) return;
    setIsSavingSig(true);
    try {
      const sig: any = {
        id: crypto.randomUUID(),
        name: newSigName.trim(),
        content: newSigContent.trim(),
      };
      if (newSigImageUrl.trim()) {
        sig.imageUrl = newSigImageUrl.trim();
      }
      await updateDoc(doc(db as Firestore, "users", user.uid), { emailSignatures: arrayUnion(sig) });
      setNewSigName("");
      setNewSigContent("");
      setNewSigImageUrl("");
      // toast({ description: "Assinatura salva." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar assinatura." });
    } finally {
      setIsSavingSig(false);
    }
  };

  const handleDeleteSignature = async (sig: EmailSignature) => {
    if (!user) return;
    try {
      await updateDoc(doc(db as Firestore, "users", user.uid), { emailSignatures: arrayRemove(sig) });
      // toast({ description: "Assinatura removida." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao remover assinatura." });
    }
  };

  // Removemos a restrição de Admin/Master para que qualquer usuário possa
  // gerenciar suas próprias assinaturas e nome de migrador.

  return (
    <DashboardShell noPadding>
      <div className="flex flex-col w-full min-h-screen bg-slate-50/30">
        <PageHeader
          title="PERFIL"
          subtitle="Configurações pessoais"
          icon={<User className="w-5 h-5 text-white" />}
          backHref="/configuracoes"
        />

        <div className="px-4 md:px-8 py-8 max-w-2xl space-y-6">
          {/* Migrador */}
          <div className="bg-white border border-slate-200 shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-SkyBlue-500" />
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                Identificação do Migrador
              </span>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Nome preenchido automaticamente na coluna <span className="font-bold text-slate-700">Migrador</span> ao exportar ou enviar estatísticas de carga.
              </p>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Nome do migrador
                </label>
                <div className="flex gap-2">
                  <Input
                    value={migradorInput}
                    onChange={e => setMigradorInput(e.target.value.toUpperCase())}
                    placeholder="Ex: DANIEL PAULINO"
                    className="font-normal text-[11px]! bg-slate-100/80 border-slate-300 rounded-none focus:border-SkyBlue-500 focus-visible:ring-1 focus-visible:ring-SkyBlue-500/30 uppercase"
                  />
                  <Button
                    onClick={handleSaveMigrador}
                    disabled={isSavingMigrador || !migradorInput.trim()}
                    className="rounded-none bg-SkyBlue-500 hover:bg-SkyBlue-600 text-white border-0 text-[10px] font-bold uppercase tracking-widest h-9 px-5 shrink-0"
                  >
                    {isSavingMigrador ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
                    ) : savedMigrador ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Salvo</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Salvar</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* E-mail de origem */}
          <div className="bg-white border border-slate-200 shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-SkyBlue-500" />
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                E-mail de Origem
              </span>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Endereço utilizado automaticamente no campo <span className="font-bold text-slate-700">De:</span> ao compor e-mails de estatística de carga.
              </p>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Endereço de e-mail
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={fromEmailInput}
                    onChange={e => setFromEmailInput(e.target.value)}
                    placeholder="Ex: daniel.paulino@empresa.com"
                    className="font-normal text-[11px]! bg-slate-100/80 border-slate-300 rounded-none focus:border-SkyBlue-500 focus-visible:ring-1 focus-visible:ring-SkyBlue-500/30"
                  />
                  <Button
                    onClick={handleSaveFromEmail}
                    disabled={isSavingFrom || !fromEmailInput.trim()}
                    className="rounded-none bg-SkyBlue-500 hover:bg-SkyBlue-600 text-white border-0 text-[10px] font-bold uppercase tracking-widest h-9 px-5 shrink-0"
                  >
                    {isSavingFrom ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
                    ) : savedFrom ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Salvo</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Salvar</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Assinaturas */}
          <div className="bg-white border border-slate-200 shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-SkyBlue-500" />
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                Assinaturas de E-mail
              </span>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Cadastre assinaturas pessoais para usar ao compor e-mails de estatística de carga.
              </p>

              {signatures.length > 0 && (
                <div className="space-y-2">
                  {signatures.map(sig => (
                    <div key={sig.id} className="flex items-start gap-3 bg-slate-50 border border-slate-200 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">{sig.name}</p>
                          {sig.imageUrl && (
                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-1.5 h-4 border-SkyBlue-100 bg-SkyBlue-50 text-SkyBlue-600">COM IMAGEM</Badge>
                          )}
                        </div>
                        <pre className="mt-1.5 text-[10px] text-slate-500 font-sans whitespace-pre-wrap line-clamp-3 leading-relaxed">{sig.content}</pre>
                        {sig.imageUrl && (
                          <div className="mt-2 p-2 bg-white border border-slate-100 w-fit">
                            {/* eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do usuário */}
                            <img src={sig.imageUrl} alt="Assinatura" className="max-h-16 object-contain" />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => handleDeleteSignature(sig)}
                        className="h-7 w-7 shrink-0 rounded-none border-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        title="Remover assinatura"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nova assinatura</label>
                <Input
                  value={newSigName}
                  onChange={e => setNewSigName(e.target.value)}
                  placeholder="Nome da assinatura (ex: Padrão, Formal)"
                  className="font-normal text-[11px]! bg-slate-100/80 border-slate-300 rounded-none focus:border-SkyBlue-500 focus-visible:ring-1 focus-visible:ring-SkyBlue-500/30"
                />
                <Textarea
                  value={newSigContent}
                  onChange={e => setNewSigContent(e.target.value)}
                  placeholder={"Nome Sobrenome\nCargo | Empresa\n+55 00 00000-0000"}
                  rows={4}
                  className="font-normal text-[11px]! bg-slate-100/80 border-slate-300 rounded-none resize-none focus:border-SkyBlue-500 focus-visible:ring-1 focus-visible:ring-SkyBlue-500/30"
                />
                <Input
                  value={newSigImageUrl}
                  onChange={e => setNewSigImageUrl(e.target.value)}
                  placeholder="URL da Imagem de Assinatura (opcional)"
                  className="font-normal text-[11px]! bg-slate-100/80 border-slate-300 rounded-none focus:border-SkyBlue-500 focus-visible:ring-1 focus-visible:ring-SkyBlue-500/30"
                />
                <Button
                  onClick={handleAddSignature}
                  disabled={isSavingSig || !newSigName.trim() || (!newSigContent.trim() && !newSigImageUrl.trim())}
                  className="rounded-none bg-SkyBlue-500 hover:bg-SkyBlue-600 text-white border-0 text-[10px] font-bold uppercase tracking-widest h-9 px-5 gap-1.5"
                >
                  {isSavingSig ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
                  ) : (
                    <><Plus className="w-3.5 h-3.5" /> Adicionar</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
