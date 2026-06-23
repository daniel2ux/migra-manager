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
} from "@/supabase/compat-db-shim";
import { useDb, useUser } from "@/supabase/provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Layers,
  PackageOpen,
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
import { CARD_TOOLBAR_BTN, suggestedCreateGroupColor, nextAvailableDisplayOrder, reindexActivityGroupDisplayOrders } from "./constants";
import { GroupDialog } from "./group-dialog";
import { ObjectAssignDialog } from "./object-assign-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { ActivityGroupOrderCell } from "./order-cell";
import {
  reconcileActivityGroupsObjectIds,
  resolveActivityGroupMemberIds,
} from "@/lib/migration/activity-group-sync";
import { masterObjectsQueryForProject, collectionQueryForProject } from "@/lib/migration/master-objects-query";

export function ActivityGroupsManager({
  empresa,
  projectName,
  projectId,
  searchTerm = "",
}: {
  empresa?: string;
  projectName?: string;
  projectId?: string | null;
  searchTerm?: string;
} = {}) {
  const db = useDb();
  const { user } = useUser();

  const [groups, setGroups] = useState<ActivityGroup[]>([]);
  const [allObjects, setAllObjects] = useState<MasterObject[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  function applyDisplayOrders(nextGroups: ActivityGroup[]) {
    setGroups((prev) => {
      const orderById = new Map(nextGroups.map((g) => [g.id, g.displayOrder]));
      return prev.map((g) => {
        const order = orderById.get(g.id);
        return order === undefined ? g : { ...g, displayOrder: order };
      });
    });
  }

  const [groupDialog, setGroupDialog] = useState<{ open: boolean; initial?: ActivityGroup | null }>({ open: false });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; group?: ActivityGroup }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; group?: ActivityGroup | null }>({ open: false });
  const [orderSavingId, setOrderSavingId] = useState<string | null>(null);

  const createColorSuggestion = useMemo(
    () => suggestedCreateGroupColor(groups),
    [groups],
  );

  const createOrderSuggestion = useMemo(
    () => nextAvailableDisplayOrder(groups),
    [groups],
  );

  function openAssignDialog(group: ActivityGroup) {
    setAssignDialog({ open: true, group });
  }

  function closeAssignDialog() {
    setAssignDialog({ open: false, group: undefined });
  }

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load quando db ou projeto mudam
  }, [db, projectId]);

  async function load(): Promise<ActivityGroup[]> {
    if (!db) return [];
    try {
      const groupsQuery = projectId
        ? collectionQueryForProject(db, "activityGroups", projectId, orderBy("name"))
        : null;
      const groupsSnap = groupsQuery
        ? await getDocs(groupsQuery)
        : { docs: [] as Awaited<ReturnType<typeof getDocs>>["docs"] };
      const loadedGroups = groupsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityGroup, "id">) }));

      let loadedObjects: MasterObject[] = [];
      const projectCatalogQuery = projectId ? masterObjectsQueryForProject(db, projectId) : null;
      if (projectCatalogQuery) {
        const objectsSnap = await getDocs(projectCatalogQuery);
        loadedObjects = objectsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MasterObject, "id">) }));
      }

      const reconciledGroups = await reconcileActivityGroupsObjectIds(db, loadedGroups, loadedObjects);
      setGroups(reconciledGroups);
      setAllObjects(loadedObjects);
      return reconciledGroups;
    } finally {
      setIsInitialLoad(false);
    }
  }

  async function handleSaveGroup(data: Omit<ActivityGroup, "id" | "objectIds" | "createdAt" | "updatedAt" | "createdBy">) {
    if (!db || !projectId) return;
    if (groupDialog.initial) {
      const groupId = groupDialog.initial.id;
      await updateDoc(doc(db, "activityGroups", groupId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, ...data } : g)),
      );
      return;
    }

    const createdRef = await addDoc(collection(db, "activityGroups"), {
      ...data,
      projectId,
      objectIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user?.uid ?? "",
    });
    const newGroup: ActivityGroup = {
      id: createdRef.id,
      ...data,
      projectId,
      objectIds: [],
      createdBy: user?.uid ?? "",
    };
    const nextGroups = [...groups, newGroup];
    setGroups(nextGroups);
    setGroupDialog({ open: true, initial: null });
    return nextAvailableDisplayOrder(nextGroups);
  }

  async function handleAssignObjects(objectIds: string[]) {
    if (!db || !assignDialog.group) return;
    const groupId = assignDialog.group.id;
    const prev = new Set(resolveActivityGroupMemberIds(assignDialog.group, allObjects));
    const next = new Set(objectIds);

    const batch = writeBatch(db);

    // Update group
    batch.update(doc(db, "activityGroups", groupId), {
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
          batch.update(doc(db, "masterObjects", id), {
            activityGroupIds: [...current, groupId],
            updatedAt: serverTimestamp(),
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
        batch.update(doc(db, "masterObjects", id), {
          activityGroupIds: current.filter((g) => g !== groupId),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();

    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, objectIds } : g)),
    );
    setAllObjects((prev) =>
      prev.map((obj) => {
        const ids = obj.activityGroupIds ?? [];
        const shouldHave = next.has(obj.id);
        const has = ids.includes(groupId);
        if (shouldHave === has) return obj;
        return {
          ...obj,
          activityGroupIds: shouldHave
            ? [...ids, groupId]
            : ids.filter((id) => id !== groupId),
        };
      }),
    );
    setAssignDialog((prev) =>
      prev.group?.id === groupId
        ? { ...prev, group: { ...prev.group, objectIds } }
        : prev,
    );
  }

  async function handleDeleteGroup() {
    if (!db || !deleteDialog.group) return;
    const group = deleteDialog.group;
    const groupId = group.id;
    const batch = writeBatch(db);

    const memberIds = resolveActivityGroupMemberIds(group, allObjects);
    for (const objId of memberIds) {
      const obj = allObjects.find((o) => o.id === objId);
      if (!obj) continue;
      batch.update(doc(db, "masterObjects", objId), {
        activityGroupIds: (obj.activityGroupIds ?? []).filter((g) => g !== groupId),
        updatedAt: serverTimestamp(),
      });
    }

    batch.delete(doc(db, "activityGroups", groupId));

    const remaining = groups.filter((g) => g.id !== groupId);
    const reindexed = reindexActivityGroupDisplayOrders(remaining);
    for (const g of reindexed) {
      const previous = remaining.find((row) => row.id === g.id);
      if ((previous?.displayOrder ?? 0) === g.displayOrder) continue;
      batch.update(doc(db, "activityGroups", g.id), {
        displayOrder: g.displayOrder,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    setGroups(reindexed);
    setAllObjects((prev) =>
      prev.map((obj) => {
        const ids = obj.activityGroupIds ?? [];
        if (!ids.includes(groupId)) return obj;
        return { ...obj, activityGroupIds: ids.filter((id) => id !== groupId) };
      }),
    );
  }

  async function handleUpdateDisplayOrder(groupId: string, displayOrder: number) {
    if (!db) return;
    const fromIdx = sortedGroups.findIndex((g) => g.id === groupId);
    if (fromIdx < 0) return;

    const reordered = [...sortedGroups];
    const [moved] = reordered.splice(fromIdx, 1);
    const toIdx = Math.min(Math.max(displayOrder - 1, 0), reordered.length);
    reordered.splice(toIdx, 0, moved);
    const withOrders = reindexActivityGroupDisplayOrders(reordered);

    setOrderSavingId(groupId);
    try {
      const batch = writeBatch(db);
      for (const g of withOrders) {
        const previous = groups.find((row) => row.id === g.id);
        if ((previous?.displayOrder ?? 0) === g.displayOrder) continue;
        batch.update(doc(db, "activityGroups", g.id), {
          displayOrder: g.displayOrder,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      applyDisplayOrders(withOrders);
    } finally {
      setOrderSavingId(null);
    }
  }

  async function handleSwapDisplayOrder(group: ActivityGroup, direction: "up" | "down") {
    if (!db) return;
    const idx = sortedGroups.findIndex((g) => g.id === group.id);
    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || neighborIdx < 0 || neighborIdx >= sortedGroups.length) return;

    const reordered = [...sortedGroups];
    [reordered[idx], reordered[neighborIdx]] = [reordered[neighborIdx], reordered[idx]];
    const withOrders = reindexActivityGroupDisplayOrders(reordered);

    setOrderSavingId(group.id);
    try {
      const batch = writeBatch(db);
      for (const g of withOrders) {
        const previous = groups.find((row) => row.id === g.id);
        if ((previous?.displayOrder ?? 0) === g.displayOrder) continue;
        batch.update(doc(db, "activityGroups", g.id), {
          displayOrder: g.displayOrder,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      applyDisplayOrders(withOrders);
    } finally {
      setOrderSavingId(null);
    }
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

  const filteredGroups = useMemo(() => {
    const query = searchTerm.trim().toUpperCase();
    if (!query) return sortedGroups;
    return sortedGroups.filter(
      (g) =>
        g.name.toUpperCase().includes(query) ||
        (g.description ?? "").toUpperCase().includes(query),
    );
  }, [sortedGroups, searchTerm]);

  const hasSearch = searchTerm.trim().length > 0;

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
              {!isInitialLoad && (
                <span className="fiori-activity-groups-panel-count">
                  {filteredGroups.length} {filteredGroups.length === 1 ? "grupo" : "grupos"}
                  {hasSearch && sortedGroups.length !== filteredGroups.length
                    ? ` de ${sortedGroups.length}`
                    : ""}
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
                  {isInitialLoad ? (
                    <div className="fiori-activity-groups-empty" role="row">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[var(--fiori-brand)]" aria-hidden />
                      Carregando grupos…
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="fiori-activity-groups-empty" role="row">
                      <div className="fiori-activity-groups-empty-icon">
                        <Layers className="h-6 w-6" aria-hidden />
                      </div>
                      {hasSearch ? "Nenhum grupo encontrado para a busca" : "Nenhum grupo cadastrado"}
                    </div>
                  ) : (
                    filteredGroups.map((g) => {
                      const objectCount = resolveActivityGroupMemberIds(g, allObjects).length;
                      const fullIndex = sortedGroups.findIndex((row) => row.id === g.id);
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
                            <ActivityGroupOrderCell
                              order={g.displayOrder ?? fullIndex + 1}
                              canMoveUp={fullIndex > 0}
                              canMoveDown={fullIndex < sortedGroups.length - 1}
                              saving={orderSavingId === g.id}
                              onMoveUp={() => handleSwapDisplayOrder(g, "up")}
                              onMoveDown={() => handleSwapDisplayOrder(g, "down")}
                              onCommit={(displayOrder) => handleUpdateDisplayOrder(g.id, displayOrder)}
                            />
                          </div>
                          <div className="fiori-activity-groups-list-cell fiori-activity-groups-list-cell--actions" role="cell">
                            <div className="fiori-card-toolbar">
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={CARD_TOOLBAR_BTN}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAssignDialog(g);
                                    }}
                                    aria-label={`Gerenciar objetos do grupo ${g.name}`}
                                  >
                                    <PackageOpen className="h-3 w-3" aria-hidden />
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
        onClose={() => setGroupDialog({ open: false, initial: null })}
        onSave={handleSaveGroup}
        initial={groupDialog.initial}
        suggestedCreateColor={createColorSuggestion}
        suggestedCreateOrder={createOrderSuggestion}
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
