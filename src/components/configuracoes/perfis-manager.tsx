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
  where,
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
import { PermissionsEditor } from "@/components/configuracoes/permissions-editor";
import {
  buildDefaultPermissions,
  normalizePermissions,
  permissionsToArray,
  SYSTEM_PROFILE_NAMES,
  type PermissionKey,
} from "@/lib/auth/permissions";

export interface AccessProfile {
  id: string;
  name: string;
  description: string;
  permissions?: string[];
  isSystem?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
}

function ProfileDialog({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    permissions: PermissionKey[];
  }) => Promise<void>;
  initial?: AccessProfile | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const profileName = initial?.name ?? "MEMBRO";
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setPermissions(
        normalizePermissions(initial?.permissions, profileName),
      );
    }
  }, [open, initial]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim().toUpperCase(),
        description: description.trim(),
        permissions: permissionsToArray(permissions),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const isSystem = initial
    ? SYSTEM_PROFILE_NAMES.includes(initial.name as (typeof SYSTEM_PROFILE_NAMES)[number])
    : false;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="fiori-dialog w-[min(720px,95vw)] max-h-[90vh] flex flex-col gap-0 p-0 [&>button]:hidden">
        <DialogHeader className="fiori-dialog-header shrink-0 px-5 pt-4 pb-3 border-b border-[var(--fiori-border-light)]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0070f2]" />
            <DialogTitle className="fiori-dialog-title">
              {initial ? "Editar perfil de acesso" : "Novo perfil de acesso"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="fiori-dialog-body flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="fiori-field-label">Nome do perfil</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="EX: ANALISTA"
                readOnly={isSystem}
                className={cn("fiori-input shadow-none uppercase", isSystem && "readable-disabled")}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="fiori-field-label">Descrição</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resumo do que este perfil pode executar..."
                className="fiori-textarea shadow-none min-h-[4rem] resize-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="fiori-section-title text-[0.8125rem]">Permissões</h3>
            <PermissionsEditor
              value={permissions}
              onChange={setPermissions}
              profileName={name}
            />
          </div>
        </div>

        <div className="fiori-dialog-footer shrink-0 px-5 py-3 border-t border-[var(--fiori-border-light)] flex justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="fiori-wizard-btn fiori-wizard-btn--ghost"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="fiori-wizard-btn fiori-wizard-btn--emphasized"
            onClick={handleSave}
            disabled={!name.trim() || saving}
          >
            {saving ? "Salvando…" : initial ? "Salvar alterações" : "Criar perfil"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
              Excluir perfil
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 py-5 space-y-2">
          <p className="text-[14px] text-slate-600">
            Excluir o perfil <span className="font-bold">{profile.name}</span>?
          </p>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 flex justify-between">
          <Button onClick={onClose} variant="ghost">Cancelar</Button>
          <Button onClick={handleConfirm} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
            {deleting ? "Excluindo…" : "Excluir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface PerfisManagerRef {
  openNewProfile: () => void;
}

export const PerfisManager = forwardRef<PerfisManagerRef, object>((_props, ref) => {
  const db = useDb();
  const { user } = useUser();

  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileDialog, setProfileDialog] = useState<{ open: boolean; initial?: AccessProfile | null }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; profile?: AccessProfile | null }>({ open: false });

  useImperativeHandle(ref, () => ({
    openNewProfile: () => setProfileDialog({ open: true, initial: null }),
  }));

  async function load() {
    if (!db) return;
    setLoading(true);
    const snap = await getDocs(query(collection(db, "accessProfiles"), orderBy("name")));

    const systemDefaults: AccessProfile[] = SYSTEM_PROFILE_NAMES.map((name) => ({
      id: `sys-${name.toLowerCase()}`,
      name,
      description: "",
      permissions: buildDefaultPermissions(name),
      isSystem: true,
    }));

    const fetched = snap.docs.map((d) => {
      const data = d.data() as Omit<AccessProfile, "id">;
      return {
        id: d.id,
        ...data,
        permissions: data.permissions ?? buildDefaultPermissions(data.name),
      };
    });

    const mergedSystem = systemDefaults.map((sp) => {
      const dbProfile = fetched.find((fp) => fp.name.toUpperCase() === sp.name);
      return dbProfile
        ? { ...sp, ...dbProfile, isSystem: true }
        : sp;
    });

    const customProfiles = fetched.filter(
      (p) => !SYSTEM_PROFILE_NAMES.includes(p.name.toUpperCase() as (typeof SYSTEM_PROFILE_NAMES)[number]),
    );

    setProfiles([...mergedSystem, ...customProfiles].sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [db]);

  async function upsertSystemProfile(
    systemName: string,
    data: { name: string; description: string; permissions: PermissionKey[] },
  ) {
    if (!db) return;
    const snap = await getDocs(
      query(collection(db, "accessProfiles"), where("name", "==", systemName)),
    );
    const payload = {
      name: systemName,
      description: data.description,
      permissions: data.permissions,
      isSystem: true,
      updatedAt: serverTimestamp(),
    };
    if (snap.empty) {
      await addDoc(collection(db, "accessProfiles"), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: user?.uid ?? "",
      });
    } else {
      await setDoc(doc(db, "accessProfiles", snap.docs[0].id), payload, { merge: true });
    }
  }

  async function handleSaveProfile(data: {
    name: string;
    description: string;
    permissions: PermissionKey[];
  }) {
    if (!db) return;
    const isSystem = SYSTEM_PROFILE_NAMES.includes(
      (profileDialog.initial?.name ?? data.name) as (typeof SYSTEM_PROFILE_NAMES)[number],
    );

    if (profileDialog.initial) {
      if (isSystem) {
        await upsertSystemProfile(profileDialog.initial.name, data);
      } else {
        await setDoc(
          doc(db, "accessProfiles", profileDialog.initial.id),
          {
            name: data.name,
            description: data.description,
            permissions: data.permissions,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    } else {
      await addDoc(collection(db, "accessProfiles"), {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isSystem: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid ?? "",
      });
    }
    await load();
  }

  async function handleDeleteProfile() {
    if (!db || !deleteDialog.profile) return;
    if (SYSTEM_PROFILE_NAMES.includes(deleteDialog.profile.name as (typeof SYSTEM_PROFILE_NAMES)[number])) return;
    if (deleteDialog.profile.id.startsWith("sys-")) return;
    await deleteDoc(doc(db, "accessProfiles", deleteDialog.profile.id));
    await load();
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="relative flex-1 min-h-0 flex flex-col border-t border-slate-200">
        <Table wrapperClassName="h-full overflow-auto" className="text-[11px]!">
          <colgroup>
            <col className="w-12" />
            <col className="w-1/4" />
            <col />
            <col className="w-32" />
            <col className="w-40" />
          </colgroup>
          <TableHeader>
            <TableRow className="h-8 border-none hover:bg-transparent">
              {["", "Perfil", "Descrição", "Permissões", "Ações"].map((h, index, arr) => (
                <TableHead
                  key={h || "icon"}
                  className={cn(
                    "py-0 text-[10px] font-bold uppercase tracking-widest text-slate-900 sticky top-0 z-20 bg-slate-200 border-b border-slate-300/40",
                    index === 0 ? "pl-4 md:pl-8 pr-2 text-center" : index === arr.length - 1 ? "pr-4 md:pr-8 pl-4" : "px-4",
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
                <TableCell colSpan={5} className="h-40 text-center text-slate-400">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((p, i) => (
                <TableRow
                  key={p.id}
                  className={cn("h-8 border-b border-slate-100", i % 2 === 0 ? "bg-white" : "bg-slate-50/30")}
                >
                  <TableCell className="pl-4 md:pl-8 pr-2 py-0 text-center align-middle">
                    <Shield className="w-3.5 h-3.5 text-slate-400 inline-block" />
                  </TableCell>
                  <TableCell className="px-4 py-0 font-bold text-slate-900 truncate align-middle">
                    {p.name}
                    {p.isSystem && (
                      <span className="ml-2 text-[9px] font-black uppercase text-slate-400 border border-slate-200 px-1">
                        Padrão
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-0 text-slate-500 truncate align-middle">
                    {p.description || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-0 text-slate-600 align-middle tabular-nums">
                    {normalizePermissions(p.permissions, p.name).size}
                  </TableCell>
                  <TableCell className="pr-4 md:pr-8 pl-4 py-0 align-middle">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setProfileDialog({ open: true, initial: p })}
                        className="h-6 px-3 text-[9px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600"
                      >
                        Permissões
                      </button>
                      {!p.isSystem && !p.id.startsWith("sys-") && (
                        <button
                          type="button"
                          onClick={() => setDeleteDialog({ open: true, profile: p })}
                          className="h-6 px-3 text-[9px] font-black uppercase tracking-widest bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
