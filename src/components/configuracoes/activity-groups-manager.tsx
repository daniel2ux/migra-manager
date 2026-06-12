"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase/provider";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Layers,
  Search,
  X,
  Check,
  ArrowLeft,
  Hash,
  Pencil,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ActivityGroup } from "@/types/activity-group";
import type { MasterObject } from "@/types/master-object";

const CARD_TOOLBAR_BTN =
  "fiori-card-toolbar-btn !rounded-[0.25rem] !size-[1.375rem] min-h-0 min-w-0";

// ─── Palette ──────────────────────────────────────────────────────────────────

const COLOR_PALETTE = [
  // Blues & Cyans
  "#3B82F6", "#0EA5E9", "#06B6D4", "#2563EB", "#1D4ED8", "#0369A1", "#00AEEF", "#0891B2",
  // Greens & Teals
  "#10B981", "#14B8A6", "#22C55E", "#84CC16", "#28A745", "#059669", "#15803D", "#0D9488",
  // Oranges & Yellows
  "#F59E0B", "#F97316", "#FD7E14", "#EAB308", "#D97706", "#B45309", "#CA8A04", "#92400E",
  // Reds & Pinks
  "#EF4444", "#E11D48", "#DC3545", "#F43F5E", "#BE123C", "#9F1239", "#EC4899", "#881337",
  // Violets & Indigos
  "#8B5CF6", "#6366F1", "#A855F7", "#7C3AED", "#4F46E5", "#6D28D9", "#1E1B4B", "#4338CA"
];

// ─── Group Dialog ─────────────────────────────────────────────────────────────

function GroupDialog({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ActivityGroup, "id" | "objectIds" | "createdAt" | "updatedAt" | "createdBy">) => Promise<void>;
  initial?: ActivityGroup | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setColor(initial?.color ?? COLOR_PALETTE[0]);
      setDisplayOrder(initial?.displayOrder ?? 1);
    }
  }, [open, initial]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim().toUpperCase(), description: description.trim(), color, displayOrder });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        variant="fiori"
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog fiori-dialog--form flex h-[min(92vh,560px)] w-[calc(100vw-1rem)] max-w-[480px] flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)] [&>button]:hidden"
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            {initial ? "Editar grupo de atividade" : "Cadastrar novo grupo de atividade"}
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <Layers className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="fiori-dialog-title">
                {initial ? "Editar grupo" : "Novo grupo de atividade"}
              </DialogTitle>
              <p className="fiori-dialog-subtitle">
                {initial
                  ? "Altere os dados do agrupamento lógico-operacional"
                  : "Cadastre um novo agrupamento lógico-operacional"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-dialog-body">
          <section className="fiori-form-section">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="activity-group-name">
                  Nome do grupo
                </label>
                <Input
                  id="activity-group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Ex.: ESTRUTURA POSTAL"
                  disabled={saving}
                  className="fiori-input uppercase shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="activity-group-description">
                  Descrição
                </label>
                <Input
                  id="activity-group-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional"
                  disabled={saving}
                  className="fiori-input shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="activity-group-order">
                  Ordem de exibição
                </label>
                <Input
                  id="activity-group-order"
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  disabled={saving}
                  className="fiori-input w-24 shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="fiori-field-label">Cor de identificação</span>
                <div className="fiori-color-palette" role="listbox" aria-label="Cor de identificação do grupo">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      aria-selected={color === c}
                      aria-label={`Cor ${c}`}
                      onClick={() => setColor(c)}
                      disabled={saving}
                      className={cn(
                        "fiori-color-swatch",
                        color === c && "fiori-color-swatch--selected"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="fiori-btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="fiori-btn-emphasized"
          >
            {saving ? "Salvando…" : initial ? "Salvar alterações" : "Criar grupo"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Object Assignment Dialog ─────────────────────────────────────────────────

function ObjectAssignDialog({
  open,
  onClose,
  group,
  allObjects,
  onSave,
  empresa,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  group: ActivityGroup;
  allObjects: MasterObject[];
  onSave: (objectIds: string[]) => Promise<void>;
  empresa?: string;
  projectName?: string;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(group.objectIds ?? []));
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, group]);

  const filtered = useMemo(
    () =>
      allObjects
        .filter((o) => o.status !== "INATIVO")
        .filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          const aSelected = selected.has(a.id);
          const bSelected = selected.has(b.id);
          if (aSelected !== bSelected) return aSelected ? -1 : 1;
          return a.name.localeCompare(b.name, "pt-BR");
        }),
    [allObjects, search, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave([...selected]);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog fiori-dialog-fullscreen !flex max-w-none flex-col gap-0 overflow-hidden p-0 [&>button]:hidden"
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0 text-left">
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-header-main">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="fiori-dialog-back-btn"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div
                className="fiori-activity-group-swatch fiori-activity-group-swatch--dialog shrink-0"
                style={{ backgroundColor: group.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="fiori-dialog-title-row">
                  <DialogTitle className="fiori-dialog-title shrink-0">
                    Objetos — {group.name}
                  </DialogTitle>
                  {(empresa || projectName) && (
                    <>
                      <div className="fiori-dialog-title-context-divider" aria-hidden />
                      <div className="fiori-dialog-context fiori-dialog-context--inline">
                        {empresa && (
                          <div className="fiori-dialog-context-field">
                            <span className="fiori-dialog-context-label">Empresa</span>
                            <span className="fiori-dialog-context-value">{empresa}</span>
                          </div>
                        )}
                        {empresa && projectName && (
                          <div className="fiori-dialog-context-divider" aria-hidden />
                        )}
                        {projectName && (
                          <div className="fiori-dialog-context-field">
                            <span className="fiori-dialog-context-label">Projeto</span>
                            <span className="fiori-dialog-context-value">{projectName}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <p
                  className={cn(
                    "fiori-dialog-subtitle truncate",
                    !group.description?.trim() && "fiori-dialog-subtitle--empty"
                  )}
                  title={group.description?.trim() || undefined}
                >
                  {group.description?.trim() || "Sem descrição"}
                </p>
                <p className="fiori-dialog-meta">
                  {selected.size} objeto{selected.size !== 1 ? "s" : ""} selecionado{selected.size !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="fiori-dialog-header-search fiori-search-shell self-center">
              <Search className="fiori-search-icon" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar objeto..."
                className="fiori-search-input"
                aria-label="Pesquisar objeto"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="fiori-search-clear"
                  aria-label="Limpar pesquisa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-report-scroll flex-1 min-h-0">
          <table className="fiori-report-table">
            <thead>
              <tr>
                <th className="fiori-report-table-col-check" />
                <th>Nome do objeto</th>
                <th>Tipo técnico</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((obj) => {
                const isSelected = selected.has(obj.id);
                return (
                  <tr
                    key={obj.id}
                    onClick={() => toggle(obj.id)}
                    className={cn(
                      "fiori-report-table-row--clickable",
                      isSelected && "fiori-report-table-row--selected"
                    )}
                  >
                    <td className="fiori-report-table-col-check text-center">
                      <div
                        className={cn(
                          "fiori-object-row-checkbox mx-auto",
                          isSelected && "fiori-object-row-checkbox-checked"
                        )}
                        aria-hidden
                      >
                        {isSelected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                      </div>
                    </td>
                    <td className="fiori-object-col fiori-mono">{obj.name}</td>
                    <td className="fiori-mono-muted">{obj.type ?? "—"}</td>
                    <td className="max-w-[28rem] truncate text-[var(--fiori-label)]">
                      {obj.description || "—"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="!border-0 p-0">
                    <div className="fiori-report-empty">Nenhum objeto encontrado</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            className="fiori-btn-transparent shadow-none"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="fiori-btn-emphasized shadow-none"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando…" : "Confirmar seleção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DELETE_GROUP_EFFECTS = [
  "Registro do grupo de atividade",
  "Vínculos de objetos associados a este grupo",
] as const;

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  group,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  group: ActivityGroup | null;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try { await onConfirm(); onClose(); } finally { setDeleting(false); }
  }

  if (!group) return null;
  const objectCount = group.objectIds?.length ?? 0;

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o && !deleting) onClose(); }}>
      <AlertDialogContent variant="fiori" className="max-w-md">
        <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
          <div className="flex items-center gap-3">
            <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
              <Trash2 className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle variant="fiori">Excluir grupo</AlertDialogTitle>
              <AlertDialogDescription variant="fiori" className="truncate pt-0">
                {group.name}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="fiori-message-box-body">
          {group.description?.trim() ? (
            <p className="fiori-message-box-context">{group.description}</p>
          ) : null}
          <p className="fiori-message-box-text">
            Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.
          </p>

          <ul className="fiori-message-box-effects">
            {DELETE_GROUP_EFFECTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {objectCount > 0 && (
            <p className="fiori-message-box-text">
              Este grupo possui {objectCount} objeto{objectCount !== 1 ? "s" : ""} associado
              {objectCount !== 1 ? "s" : ""}. A associação será removida dos objetos.
            </p>
          )}
        </div>

        <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
          <AlertDialogCancel variant="fiori" disabled={deleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="fiori"
            disabled={deleting}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            className="fiori-btn-emphasized--negative"
          >
            {deleting ? "Excluindo…" : "Excluir grupo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main Manager ─────────────────────────────────────────────────────────────

export function ActivityGroupsManager({
  empresa,
  projectName,
}: {
  empresa?: string;
  projectName?: string;
} = {}) {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [groups, setGroups] = useState<ActivityGroup[]>([]);
  const [allObjects, setAllObjects] = useState<MasterObject[]>([]);
  const [loading, setLoading] = useState(true);

  const [groupDialog, setGroupDialog] = useState<{ open: boolean; initial?: ActivityGroup | null }>({ open: false });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; group?: ActivityGroup }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; group?: ActivityGroup | null }>({ open: false });

  // Sincronizar estado do diálogo com a URL para suportar o botão "Voltar" do browser
  useEffect(() => {
    const groupId = searchParams.get("assignGroupId");
    if (groupId && groups.length > 0) {
      const group = groups.find(g => g.id === groupId);
      if (group && (!assignDialog.open || assignDialog.group?.id !== groupId)) {
        setAssignDialog({ open: true, group });
      }
    } else if (!groupId && assignDialog.open) {
      setAssignDialog({ open: false });
    }
  }, [searchParams, groups, assignDialog.open, assignDialog.group?.id]);

  function openAssignDialog(group: ActivityGroup) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("assignGroupId", group.id);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function closeAssignDialog() {
    if (searchParams.has("assignGroupId")) {
      router.back();
    } else {
      setAssignDialog({ open: false });
    }
  }

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load quando firestore fica disponível (load não memoizado)
  }, [firestore]);

  async function load() {
    if (!firestore) return;
    setLoading(true);
    try {
      const [groupsSnap, objectsSnap] = await Promise.all([
        getDocs(query(collection(firestore, "activityGroups"), orderBy("name"))),
        getDocs(collection(firestore, "masterObjects")),
      ]);
      setGroups(groupsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityGroup, "id">) })));
      setAllObjects(objectsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MasterObject, "id">) })));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGroup(data: Omit<ActivityGroup, "id" | "objectIds" | "createdAt" | "updatedAt" | "createdBy">) {
    if (!firestore) return;
    if (groupDialog.initial) {
      await updateDoc(doc(firestore, "activityGroups", groupDialog.initial.id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(firestore, "activityGroups"), {
        ...data,
        objectIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid ?? "",
      });
    }
    await load();
  }

  async function handleAssignObjects(objectIds: string[]) {
    if (!firestore || !assignDialog.group) return;
    const groupId = assignDialog.group.id;
    const prev = new Set(assignDialog.group.objectIds ?? []);
    const next = new Set(objectIds);

    const batch = writeBatch(firestore);

    // Update group
    batch.update(doc(firestore, "activityGroups", groupId), {
      objectIds,
      updatedAt: serverTimestamp(),
    });

    // Add groupId to newly added objects
    for (const id of next) {
      if (!prev.has(id)) {
        const obj = allObjects.find((o) => o.id === id);
        if (!obj) continue;
        const current = obj.activityGroupIds ?? [];
        if (!current.includes(groupId)) {
          batch.update(doc(firestore, "masterObjects", id), {
            activityGroupIds: [...current, groupId],
          });
        }
      }
    }

    // Remove groupId from removed objects
    for (const id of prev) {
      if (!next.has(id)) {
        const obj = allObjects.find((o) => o.id === id);
        if (!obj) continue;
        const current = obj.activityGroupIds ?? [];
        batch.update(doc(firestore, "masterObjects", id), {
          activityGroupIds: current.filter((g) => g !== groupId),
        });
      }
    }

    await batch.commit();
    await load();
  }

  async function handleDeleteGroup() {
    if (!firestore || !deleteDialog.group) return;
    const group = deleteDialog.group;
    const batch = writeBatch(firestore);

    // Remove groupId from all associated objects
    for (const objId of group.objectIds ?? []) {
      const obj = allObjects.find((o) => o.id === objId);
      if (!obj) continue;
      batch.update(doc(firestore, "masterObjects", objId), {
        activityGroupIds: (obj.activityGroupIds ?? []).filter((g) => g !== group.id),
      });
    }

    batch.delete(doc(firestore, "activityGroups", group.id));
    await batch.commit();
    await load();
  }

  // Listener para evento do botão externo
  useEffect(() => {
    const handleOpenNewGroup = () => setGroupDialog({ open: true, initial: null });
    window.addEventListener('open-new-group-dialog', handleOpenNewGroup);
    return () => window.removeEventListener('open-new-group-dialog', handleOpenNewGroup);
  }, []);

  const sortedGroups = useMemo(
    () =>
      [...groups].sort(
        (a, b) =>
          (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
          a.name.localeCompare(b.name, "pt-BR")
      ),
    [groups]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="fiori-activity-groups-panel fiori-activity-groups-panel--flush" role="table">
        <div className="fiori-activity-groups-table-scroll custom-scrollbar">
          <div className="fiori-activity-groups-scroll-head">
            <div className="fiori-activity-groups-panel-header">
              <div className="fiori-activity-groups-panel-title">
                <span className="fiori-activity-groups-panel-title-text">Grupos cadastrados</span>
              </div>
              {!loading && (
                <span className="fiori-activity-groups-panel-count">
                  {sortedGroups.length} {sortedGroups.length === 1 ? "grupo" : "grupos"}
                </span>
              )}
            </div>

            <div className="fiori-activity-groups-list-header" role="row">
              <div className="fiori-activity-groups-list-cell fiori-activity-groups-list-cell--group" role="columnheader">
                Grupo
              </div>
              <div className="fiori-activity-groups-list-cell fiori-activity-groups-list-cell--numeric" role="columnheader">
                Objetos
              </div>
              <div className="fiori-activity-groups-list-cell fiori-activity-groups-list-cell--numeric" role="columnheader">
                Ordem
              </div>
              <div className="fiori-activity-groups-list-cell fiori-activity-groups-list-cell--actions" role="columnheader">
                Ações
              </div>
            </div>
          </div>

          <TooltipProvider delayDuration={0}>
            <div role="rowgroup">
                  {loading ? (
                    <div className="fiori-activity-groups-empty" role="row">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[var(--fiori-brand)]" aria-hidden />
                      Carregando grupos…
                    </div>
                  ) : sortedGroups.length === 0 ? (
                    <div className="fiori-activity-groups-empty" role="row">
                      <div className="fiori-activity-groups-empty-icon">
                        <Layers className="h-6 w-6" aria-hidden />
                      </div>
                      Nenhum grupo cadastrado
                    </div>
                  ) : (
                    sortedGroups.map((g) => {
                      const objectCount = (g.objectIds ?? []).length;
                      return (
                        <div
                          key={g.id}
                          className="fiori-activity-groups-list-row group"
                          role="row"
                        >
                          <div className="fiori-activity-groups-list-cell fiori-activity-groups-list-cell--group" role="cell">
                            <div className="fiori-activity-groups-group-cell">
                              <div
                                className="fiori-activity-group-swatch fiori-activity-group-swatch--table"
                                style={{ backgroundColor: g.color }}
                                title={g.color}
                                aria-hidden
                              />
                              <div className="fiori-activity-groups-group-text min-w-0">
                                <span className="fiori-activity-groups-name">{g.name}</span>
                                {g.description ? (
                                  <span className="fiori-activity-groups-desc" title={g.description}>
                                    {g.description}
                                  </span>
                                ) : (
                                  <span className="fiori-activity-groups-desc fiori-activity-groups-desc--empty">
                                    Sem descrição
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="fiori-activity-groups-list-cell fiori-activity-groups-list-cell--numeric" role="cell">
                            <span className="fiori-activity-groups-metric-value">{objectCount}</span>
                          </div>
                          <div className="fiori-activity-groups-list-cell fiori-activity-groups-list-cell--numeric" role="cell">
                            <span className="fiori-activity-groups-order">{g.displayOrder}</span>
                          </div>
                          <div className="fiori-activity-groups-list-cell fiori-activity-groups-list-cell--actions" role="cell">
                            <div className="fiori-card-toolbar">
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={CARD_TOOLBAR_BTN}
                                    onClick={() => openAssignDialog(g)}
                                    aria-label={`Gerenciar objetos do grupo ${g.name}`}
                                  >
                                    <Hash className="h-3 w-3" aria-hidden />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" variant="fiori">
                                  Objetos ({objectCount})
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={CARD_TOOLBAR_BTN}
                                    onClick={() => setGroupDialog({ open: true, initial: g })}
                                    aria-label={`Editar grupo ${g.name}`}
                                  >
                                    <Pencil className="h-3 w-3" aria-hidden />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" variant="fiori">
                                  Editar grupo
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn-danger")}
                                    onClick={() => setDeleteDialog({ open: true, group: g })}
                                    aria-label={`Excluir grupo ${g.name}`}
                                  >
                                    <Trash2 className="h-3 w-3" aria-hidden />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" variant="fiori">
                                  Excluir grupo
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Dialogs */}
      <GroupDialog
        open={groupDialog.open}
        onClose={() => setGroupDialog({ open: false })}
        onSave={handleSaveGroup}
        initial={groupDialog.initial}
      />
      {assignDialog.group && (
        <ObjectAssignDialog
          open={assignDialog.open}
          onClose={closeAssignDialog}
          group={assignDialog.group}
          allObjects={allObjects}
          onSave={handleAssignObjects}
          empresa={empresa}
          projectName={projectName}
        />
      )}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={handleDeleteGroup}
        group={deleteDialog.group ?? null}
      />
    </div>
  );
}
