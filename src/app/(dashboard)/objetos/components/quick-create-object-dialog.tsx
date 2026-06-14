"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  nameInputRef?: React.RefObject<HTMLInputElement | null>;
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
  nameInputRef,
}: QuickCreateObjectDialogProps) {
  const [externalDepsDraft, setExternalDepsDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isDepsOpen, setIsDepsOpen] = useState(false);
  const [isParallelOpen, setIsParallelOpen] = useState(false);
  const [parallelSelectDraft, setParallelSelectDraft] = useState<string[]>([]);
  const [depSelectDraft, setDepSelectDraft] = useState<string[]>([]);
  const [parallelSearchTerm, setParallelSearchTerm] = useState("");
  const [depSearchTerm, setDepSearchTerm] = useState("");

  const dependencyIds = quickFormData.dependencyIds ?? [];
  const normalizedName = nameDraft.trim().toUpperCase();
  const selfInCatalog = normalizedName
    ? catalogObjects.find((o) => o.name === normalizedName)
    : undefined;

  const draftTarget: MasterObject = {
    id: selfInCatalog?.id ?? QUICK_CREATE_DRAFT_ID,
    name: normalizedName || "Novo objeto",
    dependencyIds,
  };

  const parallelPeerIds = useMemo(
    () =>
      expandParallelPeerIds(
        catalogObjects,
        quickFormData.parallelPeerIds ?? [],
        draftTarget.id,
      ),
    [catalogObjects, quickFormData.parallelPeerIds, draftTarget.id],
  );

  const linkedDepObjects = dependencyIds
    .map((id) => catalogObjects.find((o) => o.id === id))
    .filter(Boolean) as MasterObject[];

  const linkedParallelObjects = parallelPeerIds
    .map((id) => catalogObjects.find((o) => o.id === id))
    .filter(Boolean) as MasterObject[];

  const suggestedChargeOrder = useMemo(
    () => computeNextChargeOrderAfterLastCard(catalogObjects),
    [catalogObjects],
  );

  const suggestedChargeGroup = useMemo(
    () => computeChargeGroupFromLastCard(catalogObjects),
    [catalogObjects],
  );

  const handleToggleDepPeer = (objectId: string) => {
    if (objectId === draftTarget.id) return;
    setDepSelectDraft((current) =>
      current.includes(objectId)
        ? current.filter((id) => id !== objectId)
        : [...current, objectId],
    );
  };

  const handleSaveDepSelection = () => {
    onFormChange({ dependencyIds: depSelectDraft });
    setIsDepsOpen(false);
  };

  const handleRemoveDependency = (objectId: string) => {
    onFormChange({
      dependencyIds: dependencyIds.filter((id) => id !== objectId),
    });
  };

  const handleToggleParallelPeer = (objectId: string) => {
    if (objectId === draftTarget.id) return;
    setParallelSelectDraft((current) => {
      if (current.includes(objectId)) {
        return current.filter((id) => id !== objectId);
      }
      return expandParallelPeerIds(
        catalogObjects,
        [...current, objectId],
        draftTarget.id,
      );
    });
  };

  const handleSaveParallelSelection = () => {
    const expanded = expandParallelPeerIds(
      catalogObjects,
      parallelSelectDraft,
      draftTarget.id,
    );
    onFormChange({ parallelPeerIds: expanded });
    setIsParallelOpen(false);
  };

  const quickFormSyncKey = useMemo(
    () =>
      JSON.stringify({
        name: quickFormData.name ?? "",
        description: quickFormData.description ?? "",
        externalDependencies: quickFormData.externalDependencies ?? [],
        parallelPeerIds: quickFormData.parallelPeerIds ?? [],
      }),
    [
      quickFormData.name,
      quickFormData.description,
      quickFormData.externalDependencies,
      quickFormData.parallelPeerIds,
    ],
  );

  useEffect(() => {
    if (!open) return;
    const parsed = JSON.parse(quickFormSyncKey) as {
      name: string;
      description: string;
      externalDependencies: string[];
      parallelPeerIds: string[];
    };
    setNameDraft(parsed.name);
    setDescriptionDraft(parsed.description);
    setExternalDepsDraft(parsed.externalDependencies.join("\n"));
    setParallelSelectDraft(parsed.parallelPeerIds);
  }, [open, quickFormSyncKey]);

  const buildTextPatch = useCallback(
    () => ({
      name: nameDraft.trim().toUpperCase(),
      chargeGroup: suggestedChargeGroup,
      description: descriptionDraft.toUpperCase(),
    }),
    [nameDraft, suggestedChargeGroup, descriptionDraft],
  );

  const flushExternalDependencies = useCallback(() => {
    onFormChange({ externalDependencies: parseExternalDependencies(externalDepsDraft) });
  }, [externalDepsDraft, onFormChange]);

  const handleSubmit = (e: React.FormEvent) => {
    const externalDependencies = parseExternalDependencies(externalDepsDraft);
    const textPatch = buildTextPatch();
    const patch = { ...textPatch, externalDependencies, dependencyIds, parallelPeerIds };
    onFormChange(patch);
    onSave(e, false, patch);
  };

  const handleSaveAndContinue = () => {
    const externalDependencies = parseExternalDependencies(externalDepsDraft);
    const textPatch = buildTextPatch();
    const patch = { ...textPatch, externalDependencies, dependencyIds, parallelPeerIds };
    onFormChange(patch);
    onSave(undefined, true, patch);
  };

  return (
    <>
    <Dialog preserveDashboardScroll open={open} onOpenChange={onOpenChange}>
      <TooltipProvider delayDuration={200}>
      <DialogContent
        open={open}
        variant="fiori"
        className="fiori-dialog fiori-dialog--form fiori-dialog--mock-form fiori-dialog--object-master-form flex h-[min(92vh,620px)] w-[calc(100vw-1rem)] max-w-[500px] flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
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
                    ref={nameInputRef}
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
                    value={quickFormData.type || DEFAULT_MASTER_OBJECT_TYPE}
                    onValueChange={(value) => onFormChange({ type: value })}
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
                    value={quickFormData.status || "ATIVO"}
                    onValueChange={(value) => onFormChange({ status: value })}
                  >
                    <SelectTrigger className="fiori-select-trigger fiori-select-trigger--status shadow-none">
                      <span
                        className={cn(
                          "fiori-select-status-dot",
                          STATUS_DOT_CLASS[quickFormData.status || "ATIVO"],
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
                    const selectedIds = quickFormData.activityGroupIds ?? [];
                    const isSelected = selectedIds.includes(g.id);
                    return (
                      <ActivityGroupChipTooltip key={g.id} group={g}>
                        <button
                          type="button"
                          onClick={() => {
                            const ids = isSelected
                              ? selectedIds.filter((id) => id !== g.id)
                              : [...selectedIds, g.id];
                            onFormChange({ activityGroupIds: ids });
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
                onBlur={flushExternalDependencies}
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
          <button type="button" onClick={() => onOpenChange(false)} className="fiori-btn-ghost">
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

    <DependencyMapperDialog
      open={isDepsOpen}
      onOpenChange={(next) => {
        setIsDepsOpen(next);
        if (!next) setDepSearchTerm("");
      }}
      targetObject={draftTarget}
      objects={catalogObjects}
      selectedIds={depSelectDraft}
      searchTerm={depSearchTerm}
      onSearchChange={setDepSearchTerm}
      onToggleId={handleToggleDepPeer}
      onSave={handleSaveDepSelection}
      elevated
    />
    <ParallelSelectDialog
      open={isParallelOpen}
      onOpenChange={(next) => {
        setIsParallelOpen(next);
        if (!next) setParallelSearchTerm("");
      }}
      targetObject={draftTarget}
      objects={catalogObjects}
      selectedIds={parallelSelectDraft}
      searchTerm={parallelSearchTerm}
      onSearchChange={setParallelSearchTerm}
      onToggleId={handleToggleParallelPeer}
      onSave={handleSaveParallelSelection}
    />
    </>
  );
}
