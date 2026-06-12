"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useFirestore, useUser } from "@/supabase/provider";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Layers,
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
import { CARD_TOOLBAR_BTN } from "./constants";
import { GroupDialog } from "./group-dialog";
import { ObjectAssignDialog } from "./object-assign-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

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
