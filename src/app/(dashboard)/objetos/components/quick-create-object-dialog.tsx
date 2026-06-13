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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeNextChargeOrderAfterLastCard, computeChargeGroupFromLastCard } from "@/lib/migration/master-catalog-charge-reflow";
import { expandParallelPeerIds } from "@/lib/migration/parallel-group-utils";
import { DependencyMapperDialog } from "./dependency-mapper-dialog";
import { ParallelSelectDialog } from "./parallel-select-dialog";
import type { MasterObject } from "./object-card";

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
  const [parallelSearchTerm, setParallelSearchTerm] = useState("");
  const [depSearchTerm, setDepSearchTerm] = useState("");
  const [depFilterType, setDepFilterType] = useState("TODOS");

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

  const handleToggleDraftDependency = (objectId: string) => {
    if (objectId === draftTarget.id) return;
    const current = quickFormData.dependencyIds ?? [];
    const updated = current.includes(objectId)
      ? current.filter((id) => id !== objectId)
      : [...current, objectId];
    onFormChange({ dependencyIds: updated });
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

  useEffect(() => {
    if (!open) return;
    setNameDraft(quickFormData.name ?? "");
    setDescriptionDraft(quickFormData.description ?? "");
    setExternalDepsDraft((quickFormData.externalDependencies ?? []).join("\n"));
  // Sincroniza só ao abrir o diálogo — drafts locais evitam re-render da página.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <TooltipProvider delayDuration={200}>
      <DialogContent
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
                    value={suggestedChargeGroup}
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
                      <Tooltip key={g.id}>
                        <TooltipTrigger asChild>
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
                              isSelected && "fiori-chip--outline fiori-chip-selected",
                            )}
                            style={isSelected ? { borderColor: g.color, color: g.color } : undefined}
                          >
                            {g.name}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" variant="fiori" className="max-w-xs">
                          <p className="font-semibold">{g.name}</p>
                          {g.description && (
                            <p className="text-[var(--fiori-label)] mt-0.5">{g.description}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
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
                className="fiori-textarea uppercase shadow-none resize-none"
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
                  onClick={() => setIsDepsOpen(true)}
                >
                  Selecionar
                </button>
              </div>
              <div className="fiori-deps-zone">
                {linkedDepObjects.length > 0 ? (
                  linkedDepObjects.map((dep) => (
                    <span key={dep.id} className="fiori-dep-chip">
                      {dep.name}
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
                className="fiori-textarea uppercase shadow-none resize-y min-h-[4.5rem]"
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
        if (!next) {
          setDepSearchTerm("");
          setDepFilterType("TODOS");
        }
      }}
      targetObject={draftTarget}
      objects={catalogObjects}
      filterType={depFilterType}
      onFilterTypeChange={setDepFilterType}
      searchTerm={depSearchTerm}
      onSearchChange={setDepSearchTerm}
      onToggle={handleToggleDraftDependency}
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
