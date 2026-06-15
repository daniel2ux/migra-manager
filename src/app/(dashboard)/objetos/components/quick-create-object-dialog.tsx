"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ActivityGroupChipTooltip } from "@/components/shared/activity-group-chip-tooltip";
import {
  Database,
  Network,
  Link2,
  AlertCircle,
  Plus,
  Layers,
  FileText,
  Hash,
  Split,
  Trash2,
  Shapes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeNextChargeOrderAfterLastCard, computeChargeGroupFromLastCard } from "@/lib/migration/master-catalog-charge-reflow";
import { expandParallelPeerIds } from "@/lib/migration/parallel-group-utils";
import { MASTER_OBJECT_TYPE_OPTIONS, DEFAULT_MASTER_OBJECT_TYPE } from "@/lib/migration/master-object-type";
import { DependencyMapperDialog } from "./dependency-mapper-dialog";
import { ParallelSelectDialog } from "./parallel-select-dialog";
import type { MasterObject } from "@/types/master-object";

const QUICK_CREATE_DRAFT_ID = "__quick-create-draft__";

const STATUS_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

const STATUS_DOT_CLASS: Record<string, string> = {
  ATIVO: "fiori-select-status-dot--success",
  INATIVO: "fiori-select-status-dot--neutral",
};

const STATUS_ITEM_CLASS: Record<string, string> = {
  ATIVO: "fiori-select-item--status-success",
  INATIVO: "fiori-select-item--status-neutral",
};

const STATUS_OPTIONS = [
  { value: "ATIVO", label: STATUS_LABELS.ATIVO },
  { value: "INATIVO", label: STATUS_LABELS.INATIVO },
] as const;

interface QuickFormData {
  name: string;
  chargeGroup: string;
  chargeOrder: string;
  parallelOrder: string;
  type: string;
  status: string;
  description: string;
  dependencyIds?: string[];
  externalDependencies?: string[];
  activityGroupIds?: string[];
  parallelPeerIds?: string[];
}

interface LocalFormDraft {
  type: string;
  status: string;
  activityGroupIds: string[];
  dependencyIds: string[];
  parallelPeerIds: string[];
}

function emptyLocalFormDraft(quickFormData: QuickFormData): LocalFormDraft {
  return {
    type: quickFormData.type || DEFAULT_MASTER_OBJECT_TYPE,
    status: quickFormData.status || "ATIVO",
    activityGroupIds: quickFormData.activityGroupIds ?? [],
    dependencyIds: quickFormData.dependencyIds ?? [],
    parallelPeerIds: quickFormData.parallelPeerIds ?? [],
  };
}

interface ActivityGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface QuickCreateObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quickFormData: QuickFormData;
  activityGroups: ActivityGroup[];
  /** Merge no estado do formulário (ex.: objeto mestre usa mais campos além de QuickFormData). */
  onFormChange: (patch: Partial<QuickFormData>) => void;
  onSave: (e?: React.FormEvent, keepOpen?: boolean, patch?: Partial<QuickFormData>) => void;
  catalogObjects: MasterObject[];
  onNameInputMount?: (el: HTMLInputElement | null) => void;
}

function parseExternalDependencies(text: string): string[] {
  return text
    .toUpperCase()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export function QuickCreateObjectDialog({
  open,
  onOpenChange,
  quickFormData,
  activityGroups,
  onFormChange,
  onSave,
  catalogObjects,
  onNameInputMount,
}: QuickCreateObjectDialogProps) {
  const [formDraft, setFormDraft] = useState<LocalFormDraft>(() => emptyLocalFormDraft(quickFormData));
  const [externalDepsDraft, setExternalDepsDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isDepsOpen, setIsDepsOpen] = useState(false);
  const [isParallelOpen, setIsParallelOpen] = useState(false);
  const [parallelSelectDraft, setParallelSelectDraft] = useState<string[]>([]);
  const [depSelectDraft, setDepSelectDraft] = useState<string[]>([]);
  const [parallelSearchTerm, setParallelSearchTerm] = useState("");
  const [depSearchTerm, setDepSearchTerm] = useState("");
  const [pickerTargetId, setPickerTargetId] = useState(QUICK_CREATE_DRAFT_ID);
  const localNameRef = useRef<HTMLInputElement>(null);
  /** Evita fechar o cadastro quando um diálogo filho (deps/paralelo) está sendo fechado. */
  const suppressParentCloseRef = useRef(false);
  const lastSyncedParentKeyRef = useRef<string | null>(null);

  const patchFormDraft = useCallback((patch: Partial<LocalFormDraft>) => {
    setFormDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const mergeNameRef = useCallback(
    (node: HTMLInputElement | null) => {
      localNameRef.current = node;
      onNameInputMount?.(node);
    },
    [onNameInputMount],
  );

  const focusNameField = useCallback(() => {
    localNameRef.current?.focus({ preventScroll: true });
  }, []);

  const handleDialogOpenAutoFocus = useCallback(
    (event: Event) => {
      event.preventDefault();
      requestAnimationFrame(focusNameField);
    },
    [focusNameField],
  );

  const nestedPickerOpen = isDepsOpen || isParallelOpen;

  const handleParentOpenChange = (next: boolean) => {
    if (!next && (nestedPickerOpen || suppressParentCloseRef.current)) return;
    onOpenChange(next);
  };

  const blockOutsideWhileNested = (event: Event) => {
    if (nestedPickerOpen) event.preventDefault();
  };

  const catalogById = useMemo(() => {
    const map = new Map<string, MasterObject>();
    for (const object of catalogObjects) map.set(object.id, object);
    return map;
  }, [catalogObjects]);

  const catalogByName = useMemo(() => {
    const map = new Map<string, MasterObject>();
    for (const object of catalogObjects) map.set(object.name, object);
    return map;
  }, [catalogObjects]);

  const dependencyIds = formDraft.dependencyIds;

  const parallelPeerIds = useMemo(
    () =>
      expandParallelPeerIds(
        catalogObjects,
        formDraft.parallelPeerIds,
        QUICK_CREATE_DRAFT_ID,
      ),
    [catalogObjects, formDraft.parallelPeerIds],
  );

  const linkedDepObjects = useMemo(
    () =>
      dependencyIds
        .map((id) => catalogById.get(id))
        .filter(Boolean) as MasterObject[],
    [dependencyIds, catalogById],
  );

  const linkedParallelObjects = useMemo(
    () =>
      parallelPeerIds
        .map((id) => catalogById.get(id))
        .filter(Boolean) as MasterObject[],
    [parallelPeerIds, catalogById],
  );

  const suggestedChargeOrder = useMemo(
    () => computeNextChargeOrderAfterLastCard(catalogObjects),
    [catalogObjects],
  );

  const suggestedChargeGroup = useMemo(
    () => computeChargeGroupFromLastCard(catalogObjects),
    [catalogObjects],
  );

  const pickerDraftTarget = useMemo(
    (): MasterObject => ({
      id: pickerTargetId,
      name: nameDraft.trim().toUpperCase() || "Novo objeto",
      dependencyIds,
    }),
    [pickerTargetId, nameDraft, dependencyIds],
  );

  const resolvePickerTargetId = useCallback(() => {
    const normalizedName = nameDraft.trim().toUpperCase();
    return normalizedName
      ? catalogByName.get(normalizedName)?.id ?? QUICK_CREATE_DRAFT_ID
      : QUICK_CREATE_DRAFT_ID;
  }, [nameDraft, catalogByName]);

  const handleToggleDepPeer = (objectId: string) => {
    if (objectId === pickerTargetId) return;
    setDepSelectDraft((current) =>
      current.includes(objectId)
        ? current.filter((id) => id !== objectId)
        : [...current, objectId],
    );
  };

  const handleSaveDepSelection = () => {
    suppressParentCloseRef.current = true;
    setIsDepsOpen(false);
    setDepSearchTerm("");
    patchFormDraft({ dependencyIds: depSelectDraft });
    window.setTimeout(() => {
      suppressParentCloseRef.current = false;
    }, 0);
  };

  const handleRemoveDependency = (objectId: string) => {
    patchFormDraft({
      dependencyIds: dependencyIds.filter((id) => id !== objectId),
    });
  };

  const handleToggleParallelPeer = (objectId: string) => {
    if (objectId === pickerTargetId) return;
    setParallelSelectDraft((current) => {
      if (current.includes(objectId)) {
        return current.filter((id) => id !== objectId);
      }
      return expandParallelPeerIds(
        catalogObjects,
        [...current, objectId],
        pickerTargetId,
      );
    });
  };

  const handleSaveParallelSelection = () => {
    suppressParentCloseRef.current = true;
    setIsParallelOpen(false);
    setParallelSearchTerm("");
    const expanded = expandParallelPeerIds(
      catalogObjects,
      parallelSelectDraft,
      pickerTargetId,
    );
    patchFormDraft({ parallelPeerIds: expanded });
    window.setTimeout(() => {
      suppressParentCloseRef.current = false;
    }, 0);
  };

  const parentSnapshotKey = useMemo(
    () =>
      JSON.stringify({
        name: quickFormData.name ?? "",
        description: quickFormData.description ?? "",
        externalDependencies: quickFormData.externalDependencies ?? [],
        type: quickFormData.type ?? DEFAULT_MASTER_OBJECT_TYPE,
        status: quickFormData.status ?? "ATIVO",
        activityGroupIds: quickFormData.activityGroupIds ?? [],
        dependencyIds: quickFormData.dependencyIds ?? [],
        parallelPeerIds: quickFormData.parallelPeerIds ?? [],
      }),
    [
      quickFormData.name,
      quickFormData.description,
      quickFormData.externalDependencies,
      quickFormData.type,
      quickFormData.status,
      quickFormData.activityGroupIds,
      quickFormData.dependencyIds,
      quickFormData.parallelPeerIds,
    ],
  );

  useEffect(() => {
    if (!open) {
      lastSyncedParentKeyRef.current = null;
      return;
    }
    if (lastSyncedParentKeyRef.current === parentSnapshotKey) return;
    lastSyncedParentKeyRef.current = parentSnapshotKey;
    setFormDraft(emptyLocalFormDraft(quickFormData));
    setNameDraft(quickFormData.name ?? "");
    setDescriptionDraft(quickFormData.description ?? "");
    setExternalDepsDraft((quickFormData.externalDependencies ?? []).join("\n"));
  }, [open, parentSnapshotKey, quickFormData]);

  const buildSavePatch = useCallback((): Partial<QuickFormData> => ({
    name: nameDraft.trim().toUpperCase(),
    chargeGroup: suggestedChargeGroup,
    description: descriptionDraft.toUpperCase(),
    externalDependencies: parseExternalDependencies(externalDepsDraft),
    type: formDraft.type,
    status: formDraft.status,
    activityGroupIds: formDraft.activityGroupIds,
    dependencyIds: formDraft.dependencyIds,
    parallelPeerIds: formDraft.parallelPeerIds,
  }), [
    nameDraft,
    suggestedChargeGroup,
    descriptionDraft,
    externalDepsDraft,
    formDraft,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    const patch = buildSavePatch();
    onFormChange(patch);
    onSave(e, false, patch);
  };

  const handleSaveAndContinue = () => {
    const patch = buildSavePatch();
    onFormChange(patch);
    onSave(undefined, true, patch);
  };

  return (
    <>
    <Dialog preserveDashboardScroll open={open} onOpenChange={handleParentOpenChange}>
      <TooltipProvider delayDuration={200}>
      <DialogContent
        open={open}
        variant="fiori"
        className="fiori-dialog fiori-dialog--form fiori-dialog--mock-form fiori-dialog--object-master-form flex h-[min(92vh,620px)] w-[calc(100vw-1rem)] max-w-[500px] flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
        onOpenAutoFocus={handleDialogOpenAutoFocus}
        onInteractOutside={blockOutsideWhileNested}
        onPointerDownOutside={blockOutsideWhileNested}
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            Formulário de cadastro de objeto mestre.
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <Plus className="h-4 w-4" />
            </div>
            <DialogTitle className="fiori-dialog-title">Novo cadastro de objeto mestre</DialogTitle>
          </div>
        </DialogHeader>
        <div className="fiori-dialog-body">
          <form onSubmit={handleSubmit} id="quick-create-form">
            <section className="fiori-form-section">
              <h3 className="fiori-section-title">
                <Database className="h-3.5 w-3.5" />
                Identificação
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-3 gap-y-2">
                <div className="sm:col-span-12 space-y-1">
                  <label className="fiori-field-label">Nome do objeto</label>
                  <Input
                    type="text"
                    ref={mergeNameRef}
                    placeholder="Ex.: PARCEIRO"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value.toUpperCase())}
                    className="fiori-input uppercase shadow-none"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <label className="fiori-field-label">Grupo carga</label>
                  <Input
                    type="text"
                    value=""
                    readOnly
                    tabIndex={-1}
                    aria-readonly
                    className="fiori-input readable-disabled shadow-none uppercase"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <label className="fiori-field-label">
                    <Hash className="h-3.5 w-3.5 text-[var(--fiori-brand)]" />
                    Seq. carga
                  </label>
                  <Input
                    type="text"
                    value={suggestedChargeOrder}
                    readOnly
                    tabIndex={-1}
                    aria-readonly
                    className="fiori-input readable-disabled shadow-none"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <label className="fiori-field-label">
                    <Shapes className="h-3.5 w-3.5 text-[var(--fiori-brand)]" />
                    Tipo do objeto
                  </label>
                  <Select
                    value={formDraft.type}
                    onValueChange={(value) => patchFormDraft({ type: value })}
                  >
                    <SelectTrigger className="fiori-select-trigger shadow-none">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="fiori-select-content">
                      {MASTER_OBJECT_TYPE_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="fiori-select-item"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <label className="fiori-field-label">Status</label>
                  <Select
                    value={formDraft.status}
                    onValueChange={(value) => patchFormDraft({ status: value })}
                  >
                    <SelectTrigger className="fiori-select-trigger fiori-select-trigger--status shadow-none">
                      <span
                        className={cn(
                          "fiori-select-status-dot",
                          STATUS_DOT_CLASS[formDraft.status],
                        )}
                        aria-hidden
                      />
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="fiori-select-content fiori-select-content--status">
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className={cn(
                            "fiori-select-item fiori-select-item--status",
                            STATUS_ITEM_CLASS[option.value],
                          )}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {activityGroups.length > 0 && (
              <section className="fiori-form-section">
                <h3 className="fiori-section-title">
                  <Layers className="h-3.5 w-3.5" />
                  Grupos de atividade
                </h3>
                <p className="fiori-field-hint mb-1.5">
                  Opcional. Selecione um ou mais grupos para classificar o objeto.
                </p>
                <div className="fiori-activity-chip-zone">
                  {activityGroups.map((g) => {
                    const selectedIds = formDraft.activityGroupIds;
                    const isSelected = selectedIds.includes(g.id);
                    return (
                      <ActivityGroupChipTooltip key={g.id} group={g}>
                        <button
                          type="button"
                          onClick={() => {
                            const ids = isSelected
                              ? selectedIds.filter((id) => id !== g.id)
                              : [...selectedIds, g.id];
                            patchFormDraft({ activityGroupIds: ids });
                          }}
                          className={cn(
                            "fiori-chip",
                            isSelected && "fiori-chip-selected",
                          )}
                        >
                          {g.name}
                        </button>
                      </ActivityGroupChipTooltip>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="fiori-form-section">
              <h3 className="fiori-section-title">
                <FileText className="h-3.5 w-3.5" />
                Descrição técnica
              </h3>
              <Textarea
                placeholder="Finalidade técnica do objeto..."
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                className="fiori-textarea fiori-textarea--object-description uppercase shadow-none resize-none"
                rows={2}
              />
            </section>

            <section className="fiori-form-section">
              <h3 className="fiori-section-title">
                <Link2 className="h-3.5 w-3.5" />
                Dependências do catálogo
              </h3>
              <div className="fiori-deps-hint-row">
                <p className="fiori-field-hint m-0">
                  Objetos mestre do catálogo que devem preceder este no fluxo técnico.
                </p>
                <button
                  type="button"
                  className="fiori-btn-transparent fiori-btn-transparent--compact shrink-0"
                  title="Selecionar dependências"
                  onClick={() => {
                    setPickerTargetId(resolvePickerTargetId());
                    setDepSelectDraft(dependencyIds);
                    setIsDepsOpen(true);
                  }}
                >
                  Selecionar
                </button>
              </div>
              <div className="fiori-deps-zone">
                {linkedDepObjects.length > 0 ? (
                  linkedDepObjects.map((dep) => (
                    <span key={dep.id} className="fiori-dep-chip">
                      {dep.name}
                      <button
                        type="button"
                        className="fiori-dep-chip-remove"
                        aria-label={`Remover ${dep.name}`}
                        onClick={() => handleRemoveDependency(dep.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="fiori-deps-empty m-0">Nenhuma dependência selecionada.</p>
                )}
              </div>
            </section>

            <section className="fiori-form-section">
              <h3 className="fiori-section-title">
                <Split className="h-3.5 w-3.5" />
                Processamento paralelo
              </h3>
              <div className="fiori-deps-hint-row">
                <p className="fiori-field-hint m-0">
                  Objetos do catálogo que executam em paralelo com este na mesma sequência de carga.
                </p>
                <button
                  type="button"
                  className="fiori-btn-transparent fiori-btn-transparent--compact shrink-0"
                  title="Selecionar objetos em paralelo"
                  onClick={() => {
                    setPickerTargetId(resolvePickerTargetId());
                    setParallelSelectDraft(parallelPeerIds);
                    setIsParallelOpen(true);
                  }}
                >
                  Selecionar
                </button>
              </div>
              <div className="fiori-deps-zone fiori-parallel-zone">
                {linkedParallelObjects.length > 0 ? (
                  linkedParallelObjects.map((peer) => (
                    <span key={peer.id} className="fiori-dep-chip fiori-parallel-chip">
                      {peer.name}
                    </span>
                  ))
                ) : (
                  <p className="fiori-deps-empty m-0">Nenhum objeto em paralelo selecionado.</p>
                )}
              </div>
            </section>

            <section className="fiori-form-section">
              <h3 className="fiori-section-title">
                <Network className="h-3.5 w-3.5" />
                Dependências externas
              </h3>
              <Textarea
                placeholder="Um objeto por linha. Ex.: OBJETO_SAP_01"
                className="fiori-textarea fiori-textarea--external-deps uppercase shadow-none resize-y min-h-[4.5rem]"
                rows={4}
                value={externalDepsDraft}
                onChange={(e) => setExternalDepsDraft(e.target.value.toUpperCase())}
              />
              <p className="fiori-field-hint mt-1">
                Objetos que devem ser executados antes deste, um por linha.
              </p>
            </section>

            <div className="fiori-message-warning fiori-message-warning--compact">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Objeto global para todos os projetos do Migration Manager.
              </span>
            </div>
          </form>
        </div>
        <DialogFooter className="fiori-dialog-footer shrink-0 justify-between gap-2 sm:justify-between sm:space-x-0">
          <button type="button" onClick={() => handleParentOpenChange(false)} className="fiori-btn-ghost">
            Fechar
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSaveAndContinue}
              className="fiori-btn-transparent"
            >
              Salvar e continuar
            </button>
            <button type="submit" form="quick-create-form" className="fiori-btn-emphasized">
              Salvar
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
      </TooltipProvider>
    </Dialog>

    {isDepsOpen ? (
    <DependencyMapperDialog
      open={isDepsOpen}
      onOpenChange={(next) => {
        if (!next) suppressParentCloseRef.current = true;
        setIsDepsOpen(next);
        if (!next) {
          setDepSearchTerm("");
          window.setTimeout(() => {
            suppressParentCloseRef.current = false;
          }, 0);
        }
      }}
      targetObject={pickerDraftTarget}
      objects={catalogObjects}
      selectedIds={depSelectDraft}
      searchTerm={depSearchTerm}
      onSearchChange={setDepSearchTerm}
      onToggleId={handleToggleDepPeer}
      onSave={handleSaveDepSelection}
      elevated
    />
    ) : null}
    {isParallelOpen ? (
    <ParallelSelectDialog
      open={isParallelOpen}
      onOpenChange={(next) => {
        if (!next) suppressParentCloseRef.current = true;
        setIsParallelOpen(next);
        if (!next) {
          setParallelSearchTerm("");
          window.setTimeout(() => {
            suppressParentCloseRef.current = false;
          }, 0);
        }
      }}
      targetObject={pickerDraftTarget}
      objects={catalogObjects}
      selectedIds={parallelSelectDraft}
      searchTerm={parallelSearchTerm}
      onSearchChange={setParallelSearchTerm}
      onToggleId={handleToggleParallelPeer}
      onSave={handleSaveParallelSelection}
      elevated
    />
    ) : null}
    </>
  );
}
