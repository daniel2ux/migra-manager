"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Database, Search, Split } from "lucide-react";
import {
  compareObjectNames,
  normalizeSeqForDisplay,
  resolveDisplayChargeOrder,
} from "@/lib/migration/sequence-utils";
import { cn } from "@/lib/utils";

interface MasterObject {
  id: string;
  name: string;
  description?: string;
  chargeOrder?: string | number;
}

interface ParallelSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetObject: MasterObject | null;
  objects: MasterObject[];
  selectedIds: string[];
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onToggleId: (id: string) => void;
  onSave: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
  searchRef?: React.RefObject<HTMLInputElement>;
  timerRef?: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  /** Sequência exibida nos cards (posição na grade), quando diferente do valor salvo. */
  displayChargeOrderById?: ReadonlyMap<string, string>;
}

export function ParallelSelectDialog({
  open,
  onOpenChange,
  targetObject,
  objects,
  selectedIds,
  searchTerm,
  onSearchChange,
  onToggleId,
  onSave,
  triggerRef,
  searchRef,
  timerRef,
  displayChargeOrderById,
}: ParallelSelectDialogProps) {
  const handleClose = (val: boolean) => {
    onOpenChange(val);
    if (!val) {
      if (searchRef?.current) searchRef.current.value = "";
      if (timerRef?.current) clearTimeout(timerRef.current);
      onSearchChange("");
      setTimeout(() => triggerRef?.current?.focus(), 0);
    }
  };

  const filteredObjects = objects
    .filter(o =>
      o.id !== targetObject?.id &&
      (searchTerm === "" ||
        o.name.toUpperCase().includes(searchTerm) ||
        (o.description || "").toUpperCase().includes(searchTerm))
    )
    .sort(compareObjectNames);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog sm:max-w-[500px] h-[min(92vh,640px)] flex flex-col p-0 border-none shadow-lg overflow-hidden bg-white gap-0 !rounded-[var(--fiori-radius)]"
      >
        <DialogHeader className="fiori-dialog-header shrink-0 space-y-0">
          <div className="flex items-start gap-3">
            <div className="fiori-dialog-icon fiori-dialog-icon-parallel shrink-0">
              <Split className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="fiori-dialog-title">
                Paralelismo: {targetObject?.name}
              </DialogTitle>
              <p className="fiori-dialog-subtitle">
                Selecione os objetos que executam em paralelo com este
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 pt-4 pb-0 shrink-0">
          <div className="fiori-search-shell">
            <Search className="fiori-search-icon" />
            <input
              type="search"
              placeholder="Buscar objeto..."
              className="fiori-search-input uppercase"
              ref={searchRef}
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                if (timerRef?.current) clearTimeout(timerRef.current);
                if (timerRef) timerRef.current = setTimeout(() => onSearchChange(val), 50);
                else onSearchChange(val);
              }}
            />
          </div>
          {selectedIds.length > 0 && (
            <p className="fiori-selection-hint">
              {selectedIds.length} objeto{selectedIds.length > 1 ? "s" : ""} selecionado
              {selectedIds.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredObjects.length > 0 ? (
            <div className="fiori-object-list">
              {filteredObjects.map(o => {
                const isSelected = selectedIds.includes(o.id);
                const seqLabel = normalizeSeqForDisplay(
                  resolveDisplayChargeOrder(o.id, o.chargeOrder, displayChargeOrderById),
                );
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onToggleId(o.id)}
                    className={cn("fiori-object-row", isSelected && "fiori-object-row-selected")}
                  >
                    <div
                      className={cn(
                        "fiori-object-row-checkbox",
                        isSelected && "fiori-object-row-checkbox-checked"
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                    </div>
                    <div className="fiori-object-row-icon">
                      <Database className="w-3.5 h-3.5" />
                    </div>
                    <div className="fiori-object-row-body min-w-0 flex-1">
                      <span className="fiori-object-row-name">{o.name}</span>
                      {o.description && (
                        <span className="fiori-object-row-desc">{o.description}</span>
                      )}
                    </div>
                    {seqLabel !== "—" && (
                      <span
                        className={cn(
                          "fiori-seq-badge",
                          isSelected && "fiori-seq-badge-selected"
                        )}
                      >
                        {seqLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 px-5 text-center">
              <Search className="w-8 h-8 text-[var(--fiori-border)] mb-3" />
              <p className="fiori-empty-hint">
                {searchTerm
                  ? "Nenhum objeto encontrado para esta busca"
                  : "Nenhum objeto disponível para paralelismo"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0 flex gap-2">
          <Button
            variant="outline"
            className="fiori-btn-transparent flex-1 shadow-none"
            onClick={() => handleClose(false)}
          >
            Cancelar
          </Button>
          <Button
            className="fiori-btn-emphasized flex-1 shadow-none"
            onClick={onSave}
          >
            {selectedIds.length === 0 ? "Remover paralelismo" : "Salvar grupo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
