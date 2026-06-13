"use client";

import { useCallback, useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ActivityGroupChipTooltip } from "@/components/shared/activity-group-chip-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Box, Hash, Split, CheckCircle2, Network, Info, Layers, PlusCircle, Shapes } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidSequence } from "@/lib/migration/sequence-utils";
import { MASTER_OBJECT_TYPE_OPTIONS, DEFAULT_MASTER_OBJECT_TYPE } from "@/lib/migration/master-object-type";
import { EditLockAlert } from "@/components/ui/edit-lock-alert";
import { FioriIconButtonHint } from "@/components/ui/fiori-icon-button-hint";

const STATUS_DOT_CLASS: Record<string, string> = {
  ATIVO: "fiori-select-status-dot--success",
  INATIVO: "fiori-select-status-dot--neutral",
};

const STATUS_ITEM_CLASS: Record<string, string> = {
  ATIVO: "fiori-select-item--status-success",
  INATIVO: "fiori-select-item--status-neutral",
};

const STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
] as const;

interface EditFormData {
  name: string;
  chargeGroup: string;
  chargeOrder: string;
  parallelOrder: string;
  type: string;
  status: string;
  description: string;
  externalDependencies?: string[];
  activityGroupIds: string[];
}

interface ActivityGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface EditObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingObject: { id: string } | null;
  editFormData: EditFormData;
  isAdmin: boolean;
  isLockedByOther: boolean;
  lockedByName: string | null;
  activityGroups: ActivityGroup[];
  onSave: (patch?: Partial<EditFormData>) => void;
  onSuggestParallelOrder: (group: string) => string;
  onReleaseLock: (path: string) => void;
  isMockLocked?: boolean;
  /** Grupo de carga conforme cadastro em `charge_groups` (vazio se não configurado). */
  displayChargeGroup?: string;
  /** Mensagem de erro ao salvar (validação ou conflito de nome). */
  saveError?: string | null;
  onClearSaveError?: () => void;
}

function parseExternalDependencies(text: string): string[] {
  return text
    .toUpperCase()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function buildNormalizedPatch(draft: EditFormData): Partial<EditFormData> {
  return {
    parallelOrder: draft.parallelOrder,
    type: draft.type,
    status: draft.status,
    description: draft.description.toUpperCase(),
    activityGroupIds: draft.activityGroupIds,
  };
}

export function EditObjectDialog({
  open,
  onOpenChange,
  editingObject,
  editFormData,
  isAdmin,
  isLockedByOther,
  lockedByName,
  activityGroups,
  onSave,
  onSuggestParallelOrder,
  onReleaseLock,
  isMockLocked = false,
  displayChargeGroup = "",
  saveError,
  onClearSaveError,
}: EditObjectDialogProps) {
  const [formDraft, setFormDraft] = useState<EditFormData>(editFormData);
  const [externalDepsDraft, setExternalDepsDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormDraft(editFormData);
    setExternalDepsDraft((editFormData.externalDependencies ?? []).join("\n"));
  // Sincroniza só ao abrir/trocar objeto — não a cada keystroke no pai.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingObject?.id]);

  useEffect(() => {
    onClearSaveError?.();
  }, [formDraft, externalDepsDraft, onClearSaveError]);

  const patchForm = useCallback(
    (patch: Partial<EditFormData>) => setFormDraft((prev) => ({ ...prev, ...patch })),
    [],
  );

  const handleSaveClick = () => {
    const externalDependencies = parseExternalDependencies(externalDepsDraft);
    const patch = {
      ...buildNormalizedPatch(formDraft),
      externalDependencies,
    };
    onSave(patch);
  };

  const dialogTitle = isMockLocked
    ? "Visualizar objeto"
    : isAdmin
      ? "Editar objeto"
      : "Visualizar objeto mestre";

  const fieldsLocked = !isAdmin || isMockLocked;
  const chargeGroupLabel = displayChargeGroup || "";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClearSaveError?.();
        if (!v && editingObject) onReleaseLock(`masterObjects/${editingObject.id}`);
        onOpenChange(v);
      }}
    >
      <TooltipProvider delayDuration={200}>
        <DialogContent className="fiori-dialog w-[calc(100vw-1rem)] sm:max-w-[420px] h-[min(92vh,760px)] max-h-[92vh] min-h-0 flex flex-col p-0 border-none shadow-lg overflow-hidden bg-white gap-0">
          <DialogHeader className="fiori-dialog-header shrink-0 space-y-0">
            <DialogTitle className="fiori-dialog-title">{dialogTitle}</DialogTitle>
          </DialogHeader>
          {isLockedByOther && lockedByName && (
            <EditLockAlert lockedByName={lockedByName} />
          )}
          {saveError ? (
            <div role="alert" className="fiori-message-error shrink-0">
              {saveError}
            </div>
          ) : null}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-4">
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="fiori-field-label">
                    <Database className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                    Nome do objeto
                  </label>
                  <Input
                    value={formDraft.name}
                    readOnly
                    tabIndex={-1}
                    aria-readonly
                    className="fiori-input uppercase shadow-none readable-disabled"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="fiori-field-label">
                    <Box className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                    Grupo carga
                  </label>
                  <Input
                    value={chargeGroupLabel}
                    readOnly
                    tabIndex={-1}
                    aria-readonly
                    placeholder="—"
                    className="fiori-input uppercase shadow-none readable-disabled"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="fiori-field-label">
                    <Hash className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                    Ordem carga
                  </label>
                  <Input
                    type="text"
                    key={editingObject?.id}
                    value={formDraft.chargeOrder}
                    readOnly
                    tabIndex={-1}
                    aria-readonly
                    className="fiori-input shadow-none readable-disabled"
                  />
                </div>

                <div className="sm:col-span-12 space-y-1.5">
                  <div className="flex justify-between items-center gap-2">
                    <label className="fiori-field-label">
                      <Split className="w-3.5 h-3.5 text-[#107e3e]" />
                      Ordem paralelismo
                    </label>
                    {isAdmin && (
                      <FioriIconButtonHint
                        hint="Sugerir próxima ordem paralela"
                        onClick={() =>
                          patchForm({
                            parallelOrder: onSuggestParallelOrder(
                              chargeGroupLabel || formDraft.chargeGroup,
                            ),
                          })
                        }
                        className="fiori-icon-btn"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </FioriIconButtonHint>
                    )}
                  </div>
                  <Input
                    type="text"
                    placeholder="01.00"
                    maxLength={5}
                    value={formDraft.parallelOrder}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      const fmt = digits.length > 2 ? digits.slice(0, 2) + '.' + digits.slice(2) : digits;
                      patchForm({ parallelOrder: fmt });
                    }}
                    className={cn(
                      "fiori-input shadow-none",
                      formDraft.parallelOrder && !isValidSequence(formDraft.parallelOrder) && "fiori-invalid",
                      fieldsLocked && "readable-disabled",
                    )}
                    disabled={fieldsLocked}
                  />
                  <p className="fiori-field-hint pl-0.5">
                    Primeiros 2 dígitos = grupo paralelo. Ex.: 01.00, 01.01 e 01.02 executam no mesmo grupo.
                  </p>
                </div>

                <div className="sm:col-span-12 space-y-1.5">
                  <label className="fiori-field-label">
                    <Shapes className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                    Tipo do objeto
                  </label>
                  <Select
                    value={formDraft.type || DEFAULT_MASTER_OBJECT_TYPE}
                    onValueChange={(value) => patchForm({ type: value })}
                    disabled={fieldsLocked}
                  >
                    <SelectTrigger
                      className={cn(
                        "fiori-select-trigger shadow-none",
                        fieldsLocked && "readable-disabled",
                      )}
                    >
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

                <div className="sm:col-span-12 space-y-1.5">
                  <label className="fiori-field-label">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                    Status
                  </label>
                  <Select
                    value={formDraft.status || "ATIVO"}
                    onValueChange={(value) => patchForm({ status: value })}
                    disabled={fieldsLocked}
                  >
                    <SelectTrigger
                      className={cn(
                        "fiori-select-trigger fiori-select-trigger--status shadow-none",
                        fieldsLocked && "readable-disabled",
                      )}
                    >
                      <span
                        className={cn(
                          "fiori-select-status-dot",
                          STATUS_DOT_CLASS[formDraft.status || "ATIVO"],
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

                {activityGroups.length > 0 && (
                  <div className="sm:col-span-12 space-y-2">
                    <label className="fiori-field-label">
                      <Layers className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                      Grupos de atividade
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {activityGroups.map((g) => {
                        const isSelected = formDraft.activityGroupIds.includes(g.id);
                        return (
                          <ActivityGroupChipTooltip key={g.id} group={g}>
                            <button
                              type="button"
                              disabled={!isAdmin || isMockLocked}
                              onClick={() => {
                                const ids = isSelected
                                  ? formDraft.activityGroupIds.filter(id => id !== g.id)
                                  : [...formDraft.activityGroupIds, g.id];
                                patchForm({ activityGroupIds: ids });
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
                  </div>
                )}

                <div className="sm:col-span-12 space-y-1.5">
                  <label className="fiori-field-label">
                    <Info className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                    Descrição técnica
                  </label>
                  <Textarea
                    className={cn(
                      "fiori-textarea uppercase shadow-none min-h-[100px] resize-none",
                      fieldsLocked && "readable-disabled",
                    )}
                    value={formDraft.description}
                    onChange={(e) => patchForm({ description: e.target.value })}
                    disabled={fieldsLocked}
                  />
                </div>

                <div className="sm:col-span-12 space-y-1.5">
                  <label className="fiori-field-label">
                    <Network className="w-3.5 h-3.5 text-[#e9730c]" />
                    Dependências externas (obrigatórias)
                  </label>
                  <Textarea
                    placeholder="Um objeto por linha. Ex.: OBJETO_SAP_01"
                    className={cn(
                      "fiori-textarea uppercase shadow-none min-h-[80px] resize-none",
                      fieldsLocked && "readable-disabled",
                    )}
                    value={externalDepsDraft}
                    onChange={(e) => setExternalDepsDraft(e.target.value)}
                    disabled={fieldsLocked}
                  />
                  <p className="fiori-field-hint pl-0.5">
                    Informe objetos externos que devem ser executados antes deste. Um por linha.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="fiori-dialog-footer shrink-0 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="fiori-btn-ghost w-full sm:w-auto border-0 shadow-none"
            >
              {isMockLocked ? 'Fechar' : isAdmin ? 'Cancelar' : 'Fechar'}
            </Button>
            {isAdmin && (
              <Button
                disabled={isMockLocked}
                className="fiori-btn-emphasized w-full sm:w-auto shadow-none"
                onClick={handleSaveClick}
              >
                Salvar alterações
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </TooltipProvider>
    </Dialog>
  );
}
