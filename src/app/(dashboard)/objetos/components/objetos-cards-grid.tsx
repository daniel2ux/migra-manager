"use client";

import { memo, useCallback } from "react";
import type { MasterObject } from "@/types/master-object";
import type { ActivityGroup } from "@/types/activity-group";
import type { ChargeGroup } from "@/types/charge-group";
import { normalizeMasterCatalogName } from "@/lib/migration/master-catalog";
import {
  resolveDisplayChargeOrder,
} from "@/lib/migration/sequence-utils";
import {
  getConfiguredChargeGroupForObject,
  findChargeGroupIdForObject,
} from "@/lib/migration/charge-group-sync";
import { MigrationObjectCard } from "./object-card";

type PrecedenceChain = { chain: MasterObject[]; isCircular: boolean };

interface ObjetosCardsGridProps {
  objects: MasterObject[];
  sortedFilteredObjects: MasterObject[];
  sequenceContextRows: MasterObject[];
  displayChargeOrderById?: ReadonlyMap<string, string>;
  configuredChargeGroupById: ReadonlyMap<string, string>;
  duplicateMasterNameKeys: Set<string>;
  activityGroups: ActivityGroup[];
  chargeGroups: ChargeGroup[];
  chargeGroupCreateSuggestions: { name: string; order: number };
  isAdmin: boolean;
  isAdminOrMaster: boolean;
  isMockLocked: boolean;
  isExecutionSort: boolean;
  usageMap: Record<string, Set<string>>;
  precedenceMap: ReadonlyMap<string, PrecedenceChain>;
  parallelPeersByObjectId: ReadonlyMap<string, MasterObject[]>;
  selectedCardId: string | null;
  draggedObjectId: string | null;
  dragOverObjectId: string | null;
  onSelectCard: (id: string) => void;
  onEdit: (obj: MasterObject) => void;
  onView: (obj: MasterObject) => void;
  onDelete: (id: string) => void;
  onOpenPrecedence: (obj: MasterObject) => void;
  onDependencies: (obj: MasterObject) => void;
  onSelectNext: (obj: MasterObject) => void;
  onSelectParallel: (obj: MasterObject) => void;
  onDragStateChange: (state: { draggedId: string | null; dragOverId: string | null }) => void;
  performReorder: (
    obj: MasterObject,
    targetOrder: string,
    targetId?: string,
    opts?: { orderedList?: MasterObject[] },
  ) => Promise<boolean>;
  handlePatchMaster: (
    target: MasterObject,
    patch: {
      status?: string;
      activityGroupIds?: string[];
      chargeGroupId?: string | null;
      type?: string;
    },
  ) => void | Promise<void>;
  handleCreateChargeGroup?: (
    data: Omit<ChargeGroup, "id" | "objectIds" | "createdAt" | "updatedAt" | "createdBy">,
  ) => Promise<string>;
}

const ObjetosCatalogCard = memo(function ObjetosCatalogCard({
  obj,
  displayChargeOrder,
  displayChargeGroup,
  catalogDuplicateName,
  allGroups,
  allChargeGroups,
  selectedChargeGroupId,
  isAdmin,
  isAdminOrMaster,
  isExecutionSort,
  isNormalDragging,
  isNormalDragTarget,
  usageCount,
  precedenceChain,
  otherParallelObjects,
  isSelected,
  isMockLocked,
  suggestedChargeGroupName,
  suggestedChargeGroupOrder,
  onSelectCard,
  onEdit,
  onView,
  onDelete,
  onOpenPrecedence,
  onDependencies,
  onSelectNext,
  onSelectParallel,
  draggedObjectId,
  dragOverObjectId,
  sequenceContextRows,
  onDragStateChange,
  performReorder,
  handlePatchMaster,
  handleCreateChargeGroup,
  displayChargeOrderById,
  sortedFilteredObjects,
}: {
  obj: MasterObject;
  displayChargeOrder?: string;
  displayChargeGroup: string;
  catalogDuplicateName: boolean;
  allGroups: ActivityGroup[];
  allChargeGroups: ChargeGroup[];
  selectedChargeGroupId: string | null;
  isAdmin: boolean;
  isAdminOrMaster: boolean;
  isExecutionSort: boolean;
  isNormalDragging: boolean;
  isNormalDragTarget: boolean;
  usageCount: number;
  precedenceChain: PrecedenceChain;
  otherParallelObjects: MasterObject[];
  isSelected: boolean;
  isMockLocked: boolean;
  suggestedChargeGroupName: string;
  suggestedChargeGroupOrder: number;
  onSelectCard: (id: string) => void;
  onEdit: (obj: MasterObject) => void;
  onView: (obj: MasterObject) => void;
  onDelete: (id: string) => void;
  onOpenPrecedence: (obj: MasterObject) => void;
  onDependencies: (obj: MasterObject) => void;
  onSelectNext: (obj: MasterObject) => void;
  onSelectParallel: (obj: MasterObject) => void;
  draggedObjectId: string | null;
  dragOverObjectId: string | null;
  sequenceContextRows: MasterObject[];
  onDragStateChange: ObjetosCardsGridProps["onDragStateChange"];
  performReorder: ObjetosCardsGridProps["performReorder"];
  handlePatchMaster: ObjetosCardsGridProps["handlePatchMaster"];
  handleCreateChargeGroup?: ObjetosCardsGridProps["handleCreateChargeGroup"];
  displayChargeOrderById?: ReadonlyMap<string, string>;
  sortedFilteredObjects: MasterObject[];
}) {
  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", obj.id);
      onDragStateChange({ draggedId: obj.id, dragOverId: dragOverObjectId });
    },
    [obj.id, dragOverObjectId, onDragStateChange],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDragStateChange({ draggedId: draggedObjectId, dragOverId: obj.id });
    },
    [obj.id, draggedObjectId, onDragStateChange],
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDragStateChange({ draggedId: draggedObjectId, dragOverId: null });
    },
    [draggedObjectId, onDragStateChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedObjectId && sequenceContextRows.length > 0) {
        const moving = sequenceContextRows.find((o) => o.id === draggedObjectId);
        if (moving) {
          const useListPosition = Boolean(displayChargeOrderById);
          const targetDisplayOrder = useListPosition
            ? resolveDisplayChargeOrder(obj.id, obj.chargeOrder, displayChargeOrderById)
            : obj.chargeOrder;
          void performReorder(
            moving,
            String(targetDisplayOrder || ""),
            useListPosition ? undefined : obj.id,
            {
              orderedList: useListPosition ? sortedFilteredObjects : undefined,
            },
          );
        }
      }
      onDragStateChange({ draggedId: null, dragOverId: null });
    },
    [
      obj,
      draggedObjectId,
      sequenceContextRows,
      displayChargeOrderById,
      performReorder,
      sortedFilteredObjects,
      onDragStateChange,
    ],
  );

  return (
    <MigrationObjectCard
      obj={obj as any}
      displayChargeOrder={displayChargeOrder}
      displayChargeGroup={displayChargeGroup}
      allChargeGroups={allChargeGroups}
      selectedChargeGroupId={selectedChargeGroupId}
      catalogDuplicateName={catalogDuplicateName}
      allGroups={allGroups}
      isAdmin={isAdmin}
      isAdminOrMaster={isAdminOrMaster}
      isExecutionSort={isExecutionSort}
      isNormalDragging={isNormalDragging}
      isNormalDragTarget={isNormalDragTarget}
      usageCount={usageCount}
      precedenceChain={precedenceChain}
      otherParallelObjects={otherParallelObjects as any[]}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      isSelected={isSelected}
      onSelect={onSelectCard}
      onEdit={onEdit}
      onView={onView}
      onDelete={onDelete}
      onOpenPrecedence={onOpenPrecedence}
      onDependencies={onDependencies}
      onSelectNext={onSelectNext}
      onSelectParallel={onSelectParallel}
      isMockLocked={isMockLocked}
      onChargeOrderChange={(target, newOrder) => {
        if (!isAdmin || isMockLocked) return;
        const displayed = displayChargeOrderById
          ? resolveDisplayChargeOrder(target.id, target.chargeOrder, displayChargeOrderById)
          : target.chargeOrder;
        void performReorder(
          { ...target, chargeOrder: displayed ?? target.chargeOrder ?? "" },
          newOrder,
          undefined,
          {
            orderedList: displayChargeOrderById ? sortedFilteredObjects : undefined,
          },
        );
      }}
      onStatusChange={
        isAdminOrMaster
          ? (target, status) => {
              void handlePatchMaster(target, { status });
            }
          : undefined
      }
      onActivityGroupsChange={
        isAdminOrMaster
          ? (target, activityGroupIds) => {
              void handlePatchMaster(target, { activityGroupIds });
            }
          : undefined
      }
      onChargeGroupChange={
        isAdminOrMaster
          ? (target, chargeGroupId) => {
              void handlePatchMaster(target, { chargeGroupId });
            }
          : undefined
      }
      onCreateChargeGroup={isAdminOrMaster ? handleCreateChargeGroup : undefined}
      suggestedChargeGroupName={suggestedChargeGroupName}
      suggestedChargeGroupOrder={suggestedChargeGroupOrder}
      onTypeChange={
        isAdminOrMaster
          ? (target, type) => {
              void handlePatchMaster(target, { type });
            }
          : undefined
      }
    />
  );
});

export const ObjetosCardsGrid = memo(function ObjetosCardsGrid({
  objects: _objects,
  sortedFilteredObjects,
  sequenceContextRows,
  displayChargeOrderById,
  configuredChargeGroupById,
  duplicateMasterNameKeys,
  activityGroups,
  chargeGroups,
  chargeGroupCreateSuggestions,
  isAdmin,
  isAdminOrMaster,
  isMockLocked,
  isExecutionSort,
  usageMap,
  precedenceMap,
  parallelPeersByObjectId,
  selectedCardId,
  draggedObjectId,
  dragOverObjectId,
  onSelectCard,
  onEdit,
  onView,
  onDelete,
  onOpenPrecedence,
  onDependencies,
  onSelectNext,
  onSelectParallel,
  onDragStateChange,
  performReorder,
  handlePatchMaster,
  handleCreateChargeGroup,
}: ObjetosCardsGridProps) {
  const handleDragStateChange = useCallback(
    (state: { draggedId: string | null; dragOverId: string | null }) => {
      onDragStateChange(state);
    },
    [onDragStateChange],
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {sortedFilteredObjects.map((obj) => (
        <ObjetosCatalogCard
          key={obj.id}
          obj={obj}
          displayChargeOrder={
            displayChargeOrderById
              ? String(
                  resolveDisplayChargeOrder(obj.id, obj.chargeOrder, displayChargeOrderById) ?? "",
                ) || undefined
              : undefined
          }
          displayChargeGroup={getConfiguredChargeGroupForObject(obj.id, configuredChargeGroupById)}
          catalogDuplicateName={duplicateMasterNameKeys.has(normalizeMasterCatalogName(obj.name))}
          allGroups={activityGroups}
          allChargeGroups={chargeGroups}
          selectedChargeGroupId={findChargeGroupIdForObject(obj.id, chargeGroups)}
          isAdmin={isAdmin}
          isAdminOrMaster={isAdminOrMaster}
          isExecutionSort={isExecutionSort}
          isNormalDragging={draggedObjectId === obj.id}
          isNormalDragTarget={dragOverObjectId === obj.id}
          usageCount={usageMap[obj.id]?.size || 0}
          precedenceChain={precedenceMap.get(obj.id) ?? { chain: [], isCircular: false }}
          otherParallelObjects={parallelPeersByObjectId.get(obj.id) ?? []}
          isSelected={selectedCardId === obj.id}
          isMockLocked={isMockLocked}
          suggestedChargeGroupName={chargeGroupCreateSuggestions.name}
          suggestedChargeGroupOrder={chargeGroupCreateSuggestions.order}
          onSelectCard={onSelectCard}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onOpenPrecedence={onOpenPrecedence}
          onDependencies={onDependencies}
          onSelectNext={onSelectNext}
          onSelectParallel={onSelectParallel}
          draggedObjectId={draggedObjectId}
          dragOverObjectId={dragOverObjectId}
          sequenceContextRows={sequenceContextRows}
          onDragStateChange={handleDragStateChange}
          performReorder={performReorder}
          handlePatchMaster={handlePatchMaster}
          handleCreateChargeGroup={handleCreateChargeGroup}
          displayChargeOrderById={displayChargeOrderById}
          sortedFilteredObjects={sortedFilteredObjects}
        />
      ))}
    </div>
  );
});
