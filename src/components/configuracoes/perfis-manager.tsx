"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  query,
  setDoc,
} from "@/supabase/compat-db-shim";
import { useDb, useUser } from "@/supabase/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AccessProfile {
  id: string;
  name: string;
  description: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

// ─── Dialog de Formulário ─────────────────────────────────────────────────────

function ProfileDialog({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<AccessProfile, "id" | "createdAt" | "updatedAt" | "createdBy">) => Promise<void>;
  initial?: AccessProfile | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
    }
  }, [open, initial]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim().toUpperCase(),
        description: description.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[480px] max-w-[95vw] rounded-none border-none shadow-2xl bg-white p-0 [&>button]:hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-SkyBlue-500" />
            <DialogTitle className="text-[10px] font-black uppercase tracking-widest text-slate-900">
              {initial ? "Editar Perfil" : "Novo Perfil"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nome do Perfil</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="EX: ANALISTA JÚNIOR"
              className="font-normal text-[14px]! bg-slate-100/80 border-slate-300 rounded-none uppercase"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que este perfil pode acessar..."
              className="font-normal text-[12px]! bg-slate-100/80 border-slate-300 rounded-none resize-none min-h-[80px]"
            />
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center">
          <Button onClick={onClose} className="rounded-none bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 text-[10px] font-bold uppercase tracking-widest h-8">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="rounded-none bg-slate-900 hover:bg-slate-800 text-white border-0 text-[10px] font-bold uppercase tracking-widest h-8 disabled:opacity-40"
          >
            {saving ? "Salvando..." : initial ? "Salvar Alterações" : "Criar Perfil"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog de Confirmação de Exclusão ────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  profile: AccessProfile | null;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try { await onConfirm(); onClose(); } finally { setDeleting(false); }
  }

  if (!profile) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[420px] max-w-[95vw] rounded-none border-none shadow-2xl bg-white p-0 [&>button]:hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <DialogTitle className="text-[10px] font-black uppercase tracking-widest text-slate-900">
              Excluir Perfil
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 py-5 space-y-2">
          <p className="text-[14px] text-slate-600">
            Tem certeza que deseja excluir o perfil <span className="font-bold">{profile.name}</span>?
          </p>
          <div className="bg-amber-50 p-3 border border-amber-200">
            <p className="text-[11px] text-amber-700">
              Esta ação removerá este perfil permanentemente da plataforma.
            </p>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 flex justify-between">
          <Button onClick={onClose} className="rounded-none bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 text-[10px] font-bold uppercase tracking-widest h-8">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-none bg-red-600 hover:bg-red-700 text-white border-0 text-[10px] font-bold uppercase tracking-widest h-8"
          >
            {deleting ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manager Principal ────────────────────────────────────────────────────────

export interface PerfisManagerRef {
  openNewProfile: () => void;
}

export const PerfisManager = forwardRef<PerfisManagerRef, {}>((props, ref) => {
  const db = useDb();
  const { user } = useUser();

  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Hardcoded default profiles that can't be deleted or edited here (except visual overrides if needed)
  const SYSTEM_PROFILES = ["MASTER", "ADMIN", "ESPECIALISTA", "MEMBRO"];

  const [profileDialog, setProfileDialog] = useState<{ open: boolean; initial?: AccessProfile | null }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; profile?: AccessProfile | null }>({ open: false });

  useImperativeHandle(ref, () => ({
    openNewProfile: () => {
      setProfileDialog({ open: true, initial: null });
    }
  }));

  // ── Load ────────────────────────────────────────────────────────────────────

  async function load() {
    if (!db) return;
    setLoading(true);
    const snap = await getDocs(query(collection(db, "accessProfiles"), orderBy("name")));

    const systemProfilesObj: AccessProfile[] = [
      { id: "sys-master", name: "MASTER", description: "Acesso total, gerencia ambiente, projetos e todos os perfis customizados." },
      { id: "sys-admin", name: "ADMIN", description: "Administrador de sistema. Acesso a todos os projetos e membros." },
      { id: "sys-especialista", name: "ESPECIALISTA", description: "Consultor com visibilidade técnica em áreas alocadas (não listado em membros)." },
      { id: "sys-membro", name: "MEMBRO", description: "Integrante padrão de projeto com acesso às funções operacionais." },
    ];

    const fetchedProfiles = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AccessProfile, "id">) }));

    const enhancedSystemProfiles = systemProfilesObj.map(sp => {
      const dbProfile = fetchedProfiles.find(fp => fp.name === sp.name);
      return dbProfile ? { ...sp, id: dbProfile.id, description: dbProfile.description } : sp;
    });

    const customProfiles = fetchedProfiles.filter((p) => !SYSTEM_PROFILES.includes(p.name));

    const allProfiles = [...enhancedSystemProfiles, ...customProfiles].sort((a, b) => a.name.localeCompare(b.name));

    setProfiles(allProfiles);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- montagem: carregar perfis uma vez
  useEffect(() => { load(); }, []);

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async function handleSaveProfile(data: Omit<AccessProfile, "id" | "createdAt" | "updatedAt" | "createdBy">) {
    if (!db) return;
    if (profileDialog.initial) {
      // Impede renomear system profile
      if (SYSTEM_PROFILES.includes(profileDialog.initial.name) && data.name !== profileDialog.initial.name) return;

      await setDoc(doc(db, "accessProfiles", profileDialog.initial.id), {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await addDoc(collection(db, "accessProfiles"), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid ?? "",
      });
    }
    await load();
  }

  async function handleDeleteProfile() {
    if (!db || !deleteDialog.profile) return;
    if (SYSTEM_PROFILES.includes(deleteDialog.profile.name)) return; // Prevents deletion of core profiles

    await deleteDoc(doc(db, "accessProfiles", deleteDialog.profile.id));
    await load();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Table */}
      <div className="relative flex-1 min-h-0 flex flex-col border-t border-slate-200">
        <Table
          wrapperClassName="h-full overflow-auto"
          className="text-[11px]!"
        >
          <colgroup>
            <col className="w-12" />
            <col className="w-1/3" />
            <col />
            <col className="w-48" />
          </colgroup>
          <TableHeader>
            <TableRow className="h-8 border-none hover:bg-transparent">
              {["", "Perfil", "Descrição", "Ações"].map((h, index, arr) => (
                <TableHead
                  key={h}
                  className={cn(
                    "py-0 text-[10px] font-bold uppercase tracking-widest text-slate-900 sticky top-0 z-20 bg-slate-200 border-b border-slate-300/40",
                    index === 0 ? "pl-4 md:pl-8 pr-2 text-center" : index === arr.length - 1 ? "pr-4 md:pr-8 pl-4" : "px-4"
                  )}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="text-[11px]!">
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-[14px] text-slate-400 font-bold uppercase tracking-widest">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-[14px] text-slate-400 font-bold uppercase tracking-widest">
                  Nenhum perfil customizado. Crie o primeiro acima.
                </TableCell>
              </TableRow>
            ) : profiles.map((p, i) => (
              <TableRow key={p.id} className={cn("h-8 border-b border-slate-100", i % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                <TableCell className="pl-4 md:pl-8 pr-2 py-0 whitespace-nowrap text-center align-middle">
                  <Shield className="w-3.5 h-3.5 text-slate-400 inline-block" />
                </TableCell>
                <TableCell className="px-4 py-0 font-bold text-slate-900 truncate text-[11px]! align-middle">
                  {p.name}
                </TableCell>
                <TableCell className="px-4 py-0 text-slate-500 truncate text-[11px]! align-middle">
                  {p.description || "—"}
                </TableCell>
                <TableCell className="pr-4 md:pr-8 pl-4 py-0 align-middle">
                  <div className="flex items-center gap-1">
                    {SYSTEM_PROFILES.includes(p.name) ? (
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 inline-block px-1.5 py-0.5 mr-1 border border-slate-200 bg-slate-50">
                        PADRÃO
                      </span>
                    ) : null}
                    <button
                      onClick={() => setProfileDialog({ open: true, initial: p })}
                      className="h-6 px-3 text-[9px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      Editar
                    </button>
                    {!SYSTEM_PROFILES.includes(p.name) && (
                      <button
                        onClick={() => setDeleteDialog({ open: true, profile: p })}
                        className="h-6 px-3 text-[9px] font-black uppercase tracking-widest bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors ml-1"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Gradient fade at the bottom for smooth scroll finish */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-linear-to-t from-white to-transparent z-10" />
      </div>

      {/* Dialogs */}
      <ProfileDialog
        open={profileDialog.open}
        onClose={() => setProfileDialog({ open: false })}
        onSave={handleSaveProfile}
        initial={profileDialog.initial}
      />
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={handleDeleteProfile}
        profile={deleteDialog.profile ?? null}
      />
    </div>
  );
});

PerfisManager.displayName = "PerfisManager";
