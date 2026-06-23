"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  writeBatch,
  serverTimestamp,
  orderBy,
} from "@/supabase/compat-db-shim";
import { useDb, useUser } from "@/supabase/provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Package,
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
import type { ChargeGroup } from "@/types/charge-group";
import type { MasterObject } from "@/types/master-object";
import {
  CARD_TOOLBAR_BTN,
  nextAvailableDisplayOrder,
  reindexChargeGroupDisplayOrders,
  suggestedChargeGroupName,
} from "./constants";
import { ChargeGroupDialog } from "./group-dialog";
import { ChargeObjectAssignDialog } from "./object-assign-dialog";
import { ChargeGroupDeleteDialog } from "./delete-confirm-dialog";
import { ActivityGroupOrderCell } from "../activity-groups/order-cell";
import {
  normalizeChargeGroupName,
  reconcileChargeGroupsObjectIds,
  resolveChargeGroupMemberIds,
  findChargeGroupNameConflict,
  isChargeGroupNameDuplicateError,
  throwChargeGroupNameConflict,
} from "@/lib/migration/charge-group-sync";
import { masterObjectsQueryForProject, collectionQueryForProject } from "@/lib/migration/master-objects-query";

export function ChargeGroupsManager({
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

  const [groups, setGroups] = useState<ChargeGroup[]>([]);
  const [allObjects, setAllObjects] = useState<MasterObject[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  function applyDisplayOrders(nextGroups: ChargeGroup[]) {
    setGroups((prev) => {
      const orderById = new Map(nextGroups.map((g) => [g.id, g.displayOrder]));
      return prev.map((g) => {
        const order = orderById.get(g.id);
        return order === undefined ? g : { ...g, displayOrder: order };
      });
    });
  }

  const [groupDialog, setGroupDialog] = useState<{ open: boolean; initial?: ChargeGroup | null }>({ open: false });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; group?: ChargeGroup }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; group?: ChargeGroup | null }>({ open: false });
  const [orderSavingId, setOrderSavingId] = useState<string | null>(null);

  const createNameSuggestion = useMemo(
    () => suggestedChargeGroupName(groups),
    [groups],
  );

  const createOrderSuggestion = useMemo(
    () => nextAvailableDisplayOrder(groups),
    [groups],
  );

  function openAssignDialog(group: ChargeGroup) {
    setAssignDialog({ open: true, group });
  }

  function closeAssignDialog() {
    setAssignDialog({ open: false, group: undefined });
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load quando db ou projeto mudam
  }, [db, projectId]);

  async function load(): Promise<ChargeGroup[]> {
    if (!db) return [];
    try {
      const groupsQuery = projectId
        ? collectionQueryForProject(db, "chargeGroups", projectId, orderBy("name"))
        : null;
      const groupsSnap = groupsQuery
        ? await getDocs(groupsQuery)
        : { docs: [] as Awaited<ReturnType<typeof getDocs>>["docs"] };
      const loadedGroups = groupsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChargeGroup, "id">) }));

      let loadedObjects: MasterObject[] = [];
      const projectCatalogQuery = projectId ? masterObjectsQueryForProject(db, projectId) : null;
      if (projectCatalogQuery) {
        const objectsSnap = await getDocs(projectCatalogQuery);
        loadedObjects = objectsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MasterObject, "id">) }));
      }

      const reconciledGroups = await reconcileChargeGroupsObjectIds(db, loadedGroups, loadedObjects);
      setGroups(reconciledGroups);
      setAllObjects(loadedObjects);
      return reconciledGroups;
    } finally {
      setIsInitialLoad(false);
    }
  }

  async function handleSaveGroup(data: Omit<ChargeGroup, "id" | "objectIds" | "createdAt" | "updatedAt" | "createdBy">) {
    if (!db || !projectId) return;

    const excludeId = groupDialog.initial?.id;
    if (findChargeGroupNameConflict(groups, data.name, excludeId)) {
      throwChargeGroupNameConflict(data.name);
    }

    try {
      if (groupDialog.initial) {
        const groupId = groupDialog.initial.id;
        const oldName = normalizeChargeGroupName(groupDialog.initial.name);
        const newName = normalizeChargeGroupName(data.name);

        const batch = writeBatch(db);
        batch.update(doc(db, "chargeGroups", groupId), {
          ...data,
          updatedAt: serverTimestamp(),
        });

        if (oldName !== newName) {
          const memberIds = resolveChargeGroupMemberIds(groupDialog.initial, allObjects);
          for (const objId of memberIds) {
            batch.update(doc(db, "masterObjects", objId), {
              chargeGroup: newName,
              updatedAt: serverTimestamp(),
            });
          }
        }

        await batch.commit();

        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, ...data } : g)),
        );
        if (oldName !== newName) {
          const memberIds = new Set(resolveChargeGroupMemberIds(groupDialog.initial, allObjects));
          setAllObjects((prev) =>
            prev.map((obj) =>
              memberIds.has(obj.id) ? { ...obj, chargeGroup: newName } : obj,
            ),
          );
        }
        return;
      }

      const createdRef = await addDoc(collection(db, "chargeGroups"), {
        ...data,
        projectId,
        objectIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid ?? "",
      });
      const newGroup: ChargeGroup = {
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
    } catch (err) {
      if (isChargeGroupNameDuplicateError(err)) {
        throwChargeGroupNameConflict(data.name);
      }
      throw err;
    }
  }

  async function handleAssignObjects(objectIds: string[]) {
    if (!db || !assignDialog.group) return;
    const group = assignDialog.group;
    const groupId = group.id;
    const groupName = normalizeChargeGroupName(group.name);
    const prevMembers = new Set(resolveChargeGroupMemberIds(group, allObjects));
    const next = new Set(objectIds);

    const batch = writeBatch(db);

    batch.update(doc(db, "chargeGroups", groupId), {
      objectIds,
      updatedAt: serverTimestamp(),
    });

    for (const id of next) {
      const obj = allObjects.find((o) => o.id === id);
      if (!obj) continue;
      if (normalizeChargeGroupName(obj.chargeGroup ?? "") !== groupName) {
        batch.update(doc(db, "masterObjects", id), {
          chargeGroup: groupName,
          updatedAt: serverTimestamp(),
        });
      }
    }

    for (const id of prevMembers) {
      if (!next.has(id)) {
        batch.update(doc(db, "masterObjects", id), {
          chargeGroup: "",
          updatedAt: serverTimestamp(),
        });
      }
    }

    for (const other of groups) {
      if (other.id === groupId) continue;
      const otherIds = [...(other.objectIds ?? [])];
      const filtered = otherIds.filter((id) => !next.has(id));
      if (filtered.length !== otherIds.length) {
        batch.update(doc(db, "chargeGroups", other.id), {
          objectIds: filtered,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) return { ...g, objectIds };
        const filtered = (g.objectIds ?? []).filter((id) => !next.has(id));
        return filtered.length === (g.objectIds ?? []).length ? g : { ...g, objectIds: filtered };
      }),
    );
    setAllObjects((prev) =>
      prev.map((obj) => {
        if (next.has(obj.id)) {
          return normalizeChargeGroupName(obj.chargeGroup ?? "") === groupName
            ? obj
            : { ...obj, chargeGroup: groupName };
        }
        if (prevMembers.has(obj.id)) {
          return { ...obj, chargeGroup: "" };
        }
        return obj;
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

    const memberIds = resolveChargeGroupMemberIds(group, allObjects);
    for (const objId of memberIds) {
      batch.update(doc(db, "masterObjects", objId), {
        chargeGroup: "",
        updatedAt: serverTimestamp(),
      });
    }

    batch.delete(doc(db, "chargeGroups", groupId));

    const remaining = groups.filter((g) => g.id !== groupId);
    const reindexed = reindexChargeGroupDisplayOrders(remaining);
    for (const g of reindexed) {
      const previous = remaining.find((row) => row.id === g.id);
      if ((previous?.displayOrder ?? 0) === g.displayOrder) continue;
      batch.update(doc(db, "chargeGroups", g.id), {
        displayOrder: g.displayOrder,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    setGroups(reindexed);
    const memberSet = new Set(memberIds);
    setAllObjects((prev) =>
      prev.map((obj) =>
        memberSet.has(obj.id) ? { ...obj, chargeGroup: "" } : obj,
      ),
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
    const withOrders = reindexChargeGroupDisplayOrders(reordered);

    setOrderSavingId(groupId);
    try {
      const batch = writeBatch(db);
      for (const g of withOrders) {
        const previous = groups.find((row) => row.id === g.id);
        if ((previous?.displayOrder ?? 0) === g.displayOrder) continue;
        batch.update(doc(db, "chargeGroups", g.id), {
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

  async function handleSwapDisplayOrder(group: ChargeGroup, direction: "up" | "down") {
    if (!db) return;
    const idx = sortedGroups.findIndex((g) => g.id === group.id);
    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || neighborIdx < 0 || neighborIdx >= sortedGroups.length) return;

    const reordered = [...sortedGroups];
    [reordered[idx], reordered[neighborIdx]] = [reordered[neighborIdx], reordered[idx]];
    const withOrders = reindexChargeGroupDisplayOrders(reordered);

    setOrderSavingId(group.id);
    try {
      const batch = writeBatch(db);
      for (const g of withOrders) {
        const previous = groups.find((row) => row.id === g.id);
        if ((previous?.displayOrder ?? 0) === g.displayOrder) continue;
        batch.update(doc(db, "chargeGroups", g.id), {
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

  useEffect(() => {
    const handleOpenNewGroup = () => setGroupDialog({ open: true, initial: null });
    window.addEventListener("open-new-charge-group-dialog", handleOpenNewGroup);
    return () => window.removeEventListener("open-new-charge-group-dialog", handleOpenNewGroup);
  }, []);

  const sortedGroups = useMemo(
    () =>
      [...groups].sort(
        (a, b) =>
          (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
          a.name.localeCompare(b.name, "pt-BR"),
      ),
    [groups],
  );

  const filteredGroups = useMemo(() => {
    const queryText = searchTerm.trim().toUpperCase();
    if (!queryText) return sortedGroups;
    return sortedGroups.filter(
      (g) =>
        g.name.toUpperCase().includes(queryText) ||
        (g.description ?? "").toUpperCase().includes(queryText),
    );
  }, [sortedGroups, searchTerm]);

  const hasSearch = searchTerm.trim().length > 0;

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
                    <Package className="h-6 w-6" aria-hidden />
                  </div>
                  {hasSearch ? "Nenhum grupo encontrado para a busca" : "Nenhum grupo cadastrado"}
                </div>
              ) : (
                filteredGroups.map((g) => {
                  const objectCount = resolveChargeGroupMemberIds(g, allObjects).length;
                  const fullIndex = sortedGroups.findIndex((row) => row.id === g.id);
                  return (
                    <div
                      key={g.id}
                      className="fiori-activity-groups-list-row group"
                      role="row"
                    >
                      <div className="fiori-activity-groups-list-cell fiori-activity-groups-list-cell--group" role="cell">
                        <div className="fiori-activity-groups-group-cell">
                          <div className="fiori-charge-group-badge fiori-charge-group-badge--table" aria-hidden>
                            {g.name}
                          </div>
                          <div className="fiori-activity-groups-group-text min-w-0">
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

      <ChargeGroupDialog
        open={groupDialog.open}
        onClose={() => setGroupDialog({ open: false, initial: null })}
        onSave={handleSaveGroup}
        initial={groupDialog.initial}
        suggestedCreateName={createNameSuggestion}
        suggestedCreateOrder={createOrderSuggestion}
      />
      {assignDialog.group && (
        <ChargeObjectAssignDialog
          open={assignDialog.open}
          onClose={closeAssignDialog}
          group={assignDialog.group}
          allObjects={allObjects}
          onSave={handleAssignObjects}
          empresa={empresa}
          projectName={projectName}
        />
      )}
      <ChargeGroupDeleteDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={handleDeleteGroup}
        group={deleteDialog.group ?? null}
        objectCount={
          deleteDialog.group
            ? resolveChargeGroupMemberIds(deleteDialog.group, allObjects).length
            : 0
        }
      />
    </div>
  );
}
