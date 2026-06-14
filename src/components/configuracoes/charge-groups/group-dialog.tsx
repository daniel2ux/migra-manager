"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChargeGroup } from "@/types/charge-group";

export function ChargeGroupDialog({
  open,
  onClose,
  onSave,
  initial,
  suggestedCreateName = "G1",
  suggestedCreateOrder = 1,
  closeAfterCreate = false,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ChargeGroup, "id" | "objectIds" | "createdAt" | "updatedAt" | "createdBy">) => Promise<number | void>;
  initial?: ChargeGroup | null;
  suggestedCreateName?: string;
  suggestedCreateOrder?: number;
  /** Fecha após criar (ex.: picker inline no card). */
  closeAfterCreate?: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSaveError(null);
    setName(initial?.name ?? suggestedCreateName);
    setDescription(initial?.description ?? "");
    setDisplayOrder(initial?.displayOrder ?? suggestedCreateOrder);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- open/initial disparam reset do formulário
  }, [open, initial]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const nextOrder = await onSave({
        name: name.trim().toUpperCase(),
        description: description.trim(),
        displayOrder,
      });
      if (initial || closeAfterCreate) {
        onClose();
        return;
      }
      const match = /^G(\d+)$/i.exec(name.trim());
      setName(match ? `G${Number(match[1]) + 1}` : suggestedCreateName);
      setDescription("");
      setDisplayOrder(typeof nextOrder === "number" ? nextOrder : displayOrder + 1);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar o grupo de objetos.");
    } finally {
      setSaving(false);
    }
  }

  const isCreateMode = open && !initial;

  return (
    <Dialog
      preserveDashboardScroll
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isCreateMode) return;
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        open={open}
        variant="fiori"
        className="fiori-dialog fiori-dialog--form flex h-[min(92vh,480px)] w-[calc(100vw-1rem)] max-w-[480px] flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)] [&>button]:hidden"
        onInteractOutside={isCreateMode ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isCreateMode ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            {initial ? "Editar grupo de objetos" : "Cadastrar novo grupo de objetos"}
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <Package className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="fiori-dialog-title">
                {initial ? "Editar grupo" : "Novo grupo de objetos"}
              </DialogTitle>
              <p className="fiori-dialog-subtitle">
                {initial
                  ? "Altere os dados do grupo de carga"
                  : "Cadastre um grupo de carga (G1, G2, G3…)"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-dialog-body">
          <section className="fiori-form-section">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="charge-group-name">
                  Nome do grupo
                </label>
                <Input
                  id="charge-group-name"
                  value={name}
                  onChange={(e) => {
                    setSaveError(null);
                    setName(e.target.value.toUpperCase());
                  }}
                  placeholder="Ex.: G1"
                  disabled={saving}
                  className={cn(
                    "fiori-input fiori-input--charge-group-name uppercase shadow-none",
                    saveError && "fiori-invalid",
                  )}
                />
              </div>

              {saveError && (
                <div className="fiori-message-error flex items-start gap-2 !m-0">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="charge-group-description">
                  Descrição
                </label>
                <Input
                  id="charge-group-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional"
                  disabled={saving}
                  className="fiori-input shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="charge-group-order">
                  Ordem de exibição
                </label>
                <Input
                  id="charge-group-order"
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  disabled={saving}
                  className="fiori-input w-24 shadow-none"
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="fiori-btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="fiori-btn-emphasized"
          >
            {saving ? "Salvando…" : initial ? "Salvar alterações" : "Criar grupo"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
