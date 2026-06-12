"use client";

import { useEffect } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Box, Hash, Split, CheckCircle2, Network, Info, Layers, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidSequence } from "@/lib/migration/sequence-utils";
import { EditLockAlert } from "@/components/ui/edit-lock-alert";

interface EditFormData {
  name: string;
  chargeGroup: string;
  chargeOrder: string;
  parallelOrder: string;
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
  onFormChange: (data: EditFormData) => void;
  isAdmin: boolean;
  isLockedByOther: boolean;
  lockedByName: string | null;
  activityGroups: ActivityGroup[];
  onSave: () => void;
  onSuggestOrder: (group: string, mode: string) => void;
  onSuggestParallelOrder: (group: string, mode: string) => void;
  onReleaseLock: (path: string) => void;
  isMockLocked?: boolean;
  chargeOrderEditRef?: React.RefObject<HTMLInputElement | null>;
  chargeOrderEditTimerRef?: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  extDepEditRef?: React.RefObject<HTMLTextAreaElement | null>;
  extDepEditTimerRef?: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  /** Mensagem de erro ao salvar (validação ou conflito de nome). */
  saveError?: string | null;
  onClearSaveError?: () => void;
}

export function EditObjectDialog({
  open,
  onOpenChange,
  editingObject,
  editFormData,
  onFormChange,
  isAdmin,
  isLockedByOther,
  lockedByName,
  activityGroups,
  onSave,
  onSuggestOrder,
  onSuggestParallelOrder,
  onReleaseLock,
  isMockLocked = false,
  chargeOrderEditRef,
  chargeOrderEditTimerRef,
  extDepEditRef,
  extDepEditTimerRef,
  saveError,
  onClearSaveError,
}: EditObjectDialogProps) {
  useEffect(() => {
    onClearSaveError?.();
  }, [editFormData, onClearSaveError]);

  const dialogTitle = isMockLocked
    ? "Visualizar objeto"
    : isAdmin
      ? "Editar objeto"
      : "Visualizar objeto mestre";

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
                    value={editFormData.name}
                    onChange={(e) => onFormChange({ ...editFormData, name: e.target.value.toUpperCase() })}
                    className="fiori-input uppercase readable-disabled shadow-none"
                    disabled={!isAdmin || isMockLocked}
                  />
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="fiori-field-label">
                    <Box className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                    Grupo carga
                  </label>
                  <Input
                    value={editFormData.chargeGroup}
                    onChange={(e) => onFormChange({ ...editFormData, chargeGroup: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                    className="fiori-input uppercase readable-disabled shadow-none"
                    disabled={!isAdmin || isMockLocked}
                  />
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <div className="flex justify-between items-center gap-2">
                    <label className="fiori-field-label">
                      <Hash className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                      Ordem carga
                    </label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onSuggestOrder(editFormData.chargeGroup, 'edit')}
                        className="fiori-icon-btn"
                        title="Sugerir próxima sequência"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    type="text"
                    placeholder="01.00"
                    maxLength={5}
                    key={editFormData.name}
                    ref={chargeOrderEditRef}
                    defaultValue={editFormData.chargeOrder}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      const fmt = digits.length > 2 ? digits.slice(0, 2) + '.' + digits.slice(2) : digits;
                      e.target.value = fmt;
                      if (chargeOrderEditTimerRef?.current) clearTimeout(chargeOrderEditTimerRef.current);
                      if (chargeOrderEditTimerRef) chargeOrderEditTimerRef.current = setTimeout(() => onFormChange({ ...editFormData, chargeOrder: fmt }), 200);
                    }}
                    className={cn(
                      "fiori-input readable-disabled shadow-none",
                      editFormData.chargeOrder && !isValidSequence(editFormData.chargeOrder) && "fiori-invalid"
                    )}
                    disabled={!isAdmin || isMockLocked}
                  />
                </div>

                <div className="sm:col-span-12 space-y-1.5">
                  <div className="flex justify-between items-center gap-2">
                    <label className="fiori-field-label">
                      <Split className="w-3.5 h-3.5 text-[#107e3e]" />
                      Ordem paralelismo
                    </label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onSuggestParallelOrder(editFormData.chargeGroup, 'edit')}
                        className="fiori-icon-btn"
                        title="Sugerir próxima ordem paralela"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    type="text"
                    placeholder="01.00"
                    maxLength={5}
                    value={editFormData.parallelOrder}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      const fmt = digits.length > 2 ? digits.slice(0, 2) + '.' + digits.slice(2) : digits;
                      onFormChange({ ...editFormData, parallelOrder: fmt });
                    }}
                    className={cn(
                      "fiori-input readable-disabled shadow-none",
                      editFormData.parallelOrder && !isValidSequence(editFormData.parallelOrder) && "fiori-invalid"
                    )}
                    disabled={!isAdmin || isMockLocked}
                  />
                  <p className="fiori-field-hint pl-0.5">
                    Primeiros 2 dígitos = grupo paralelo. Ex.: 01.00, 01.01 e 01.02 executam no mesmo grupo.
                  </p>
                </div>

                <div className="sm:col-span-12 space-y-1.5">
                  <label className="fiori-field-label">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
                    Status
                  </label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value) => onFormChange({ ...editFormData, status: value })}
                    disabled={!isAdmin || isMockLocked}
                  >
                    <SelectTrigger className="fiori-select-trigger readable-disabled">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="fiori-select-content">
                      <SelectItem value="ATIVO" className="fiori-select-item">
                        Ativo
                      </SelectItem>
                      <SelectItem value="INATIVO" className="fiori-select-item">
                        Inativo
                      </SelectItem>
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
                        const isSelected = editFormData.activityGroupIds.includes(g.id);
                        return (
                          <Tooltip key={g.id}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                disabled={!isAdmin || isMockLocked}
                                onClick={() => {
                                  const ids = isSelected
                                    ? editFormData.activityGroupIds.filter(id => id !== g.id)
                                    : [...editFormData.activityGroupIds, g.id];
                                  onFormChange({ ...editFormData, activityGroupIds: ids });
                                }}
                                className={cn(
                                  "fiori-chip",
                                  isSelected && "fiori-chip-selected"
                                )}
                                style={isSelected ? { backgroundColor: g.color, borderColor: g.color } : {}}
                              >
                                {g.name}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="text-xs leading-relaxed p-2 max-w-xs">
                              <p className="font-semibold">{g.name}</p>
                              {g.description && <p className="text-[var(--fiori-label)] mt-0.5">{g.description}</p>}
                            </TooltipContent>
                          </Tooltip>
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
                    className="fiori-textarea uppercase readable-disabled shadow-none min-h-[100px]"
                    value={editFormData.description}
                    onChange={(e) => onFormChange({ ...editFormData, description: e.target.value.toUpperCase() })}
                    disabled={!isAdmin || isMockLocked}
                  />
                </div>

                <div className="sm:col-span-12 space-y-1.5">
                  <label className="fiori-field-label">
                    <Network className="w-3.5 h-3.5 text-[#e9730c]" />
                    Dependências externas (obrigatórias)
                  </label>
                  <Textarea
                    placeholder="Um objeto por linha. Ex.: OBJETO_SAP_01"
                    className="fiori-textarea uppercase readable-disabled shadow-none min-h-[80px]"
                    key={editFormData.name}
                    ref={extDepEditRef}
                    defaultValue={editFormData.externalDependencies?.join('\n') || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      e.target.value = val;
                      if (extDepEditTimerRef?.current) clearTimeout(extDepEditTimerRef.current);
                      if (extDepEditTimerRef) extDepEditTimerRef.current = setTimeout(() => {
                        onFormChange({ ...editFormData, externalDependencies: val.split('\n').filter(s => s.trim() !== '') });
                      }, 300);
                    }}
                    disabled={!isAdmin || isMockLocked}
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
                onClick={onSave}
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
