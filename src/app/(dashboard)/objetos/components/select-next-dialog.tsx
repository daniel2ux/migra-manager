"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, Database, Search } from "lucide-react";
import {
  compareObjectNames,
  normalizeSeqForDisplay,
  resolveDisplayChargeOrder,
} from "@/lib/migration/sequence-utils";

interface MasterObject {
  id: string;
  name: string;
  description?: string;
  chargeGroup?: string;
  chargeOrder?: string | number;
}

interface SelectNextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetObject: MasterObject | null;
  objects: MasterObject[];
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onConfirm: (obj: MasterObject) => void;
  triggerRef?: React.RefObject<HTMLElement>;
  /** Sequência exibida nos cards (posição na grade), quando diferente do valor salvo. */
  displayChargeOrderById?: ReadonlyMap<string, string>;
}

export function SelectNextDialog({
  open,
  onOpenChange,
  targetObject,
  objects,
  searchTerm,
  onSearchChange,
  onConfirm,
  triggerRef,
  displayChargeOrderById,
}: SelectNextDialogProps) {
  const [localValue, setLocalValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(searchTerm);
  }, [searchTerm]);

  const focusSearchField = useCallback(() => {
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleDialogOpenAutoFocus = useCallback(
    (event: Event) => {
      event.preventDefault();
      requestAnimationFrame(focusSearchField);
    },
    [focusSearchField],
  );

  const candidates = objects
    .filter((o) => {
      if (o.id === targetObject?.id) return false;
      if (searchTerm === "") return true;
      const term = searchTerm.toUpperCase();
      return (
        o.name.toUpperCase().includes(term) ||
        (o.description || "").toUpperCase().includes(term)
      );
    })
    .sort(compareObjectNames);

  const handleClose = (val: boolean) => {
    onOpenChange(val);
    if (!val) {
      setLocalValue("");
      onSearchChange("");
      setTimeout(() => triggerRef?.current?.focus(), 0);
    }
  };

  const handleSelect = (obj: MasterObject) => {
    handleClose(false);
    queueMicrotask(() => onConfirm(obj));
  };

  return (
    <Dialog preserveDashboardScroll open={open} onOpenChange={handleClose}>
      <DialogContent
        open={open}
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog sm:max-w-[480px] h-[min(92vh,640px)] flex flex-col p-0 border-none shadow-lg overflow-hidden bg-white gap-0 !rounded-[var(--fiori-radius)]"
        onOpenAutoFocus={handleDialogOpenAutoFocus}
      >
        <DialogHeader className="fiori-dialog-header shrink-0 space-y-0">
          <div className="flex items-start gap-3">
            <div className="fiori-dialog-icon shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="fiori-dialog-title">
                Próximo objeto: {targetObject?.name}
              </DialogTitle>
              <p className="fiori-dialog-subtitle">
                Selecione o objeto que deve ocupar a posição seguinte
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 pt-4 pb-0 shrink-0">
          <div className="fiori-search-shell">
            <Search className="fiori-search-icon" />
            <input
              type="search"
              placeholder="Buscar objeto... (Enter)"
              className="fiori-search-input uppercase"
              ref={searchInputRef}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                onSearchChange(localValue);
              }}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {candidates.length > 0 ? (
            <div className="fiori-object-list">
              {candidates.map(o => {
                const seqLabel = normalizeSeqForDisplay(
                  resolveDisplayChargeOrder(o.id, o.chargeOrder, displayChargeOrderById),
                );
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handleSelect(o)}
                    className="fiori-object-row"
                  >
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
                      <span className="fiori-seq-badge">{seqLabel}</span>
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
                  : "Nenhum outro objeto cadastrado para selecionar"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0">
          <Button
            variant="outline"
            className="fiori-btn-transparent w-full shadow-none"
            onClick={() => handleClose(false)}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
