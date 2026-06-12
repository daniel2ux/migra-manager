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
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import type { ActivityGroup } from "@/types/activity-group";
import { COLOR_PALETTE } from "./constants";

export function GroupDialog({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ActivityGroup, "id" | "objectIds" | "createdAt" | "updatedAt" | "createdBy">) => Promise<void>;
  initial?: ActivityGroup | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setColor(initial?.color ?? COLOR_PALETTE[0]);
      setDisplayOrder(initial?.displayOrder ?? 1);
    }
  }, [open, initial]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim().toUpperCase(), description: description.trim(), color, displayOrder });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        variant="fiori"
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog fiori-dialog--form flex h-[min(92vh,560px)] w-[calc(100vw-1rem)] max-w-[480px] flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)] [&>button]:hidden"
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            {initial ? "Editar grupo de atividade" : "Cadastrar novo grupo de atividade"}
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <Layers className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="fiori-dialog-title">
                {initial ? "Editar grupo" : "Novo grupo de atividade"}
              </DialogTitle>
              <p className="fiori-dialog-subtitle">
                {initial
                  ? "Altere os dados do agrupamento lógico-operacional"
                  : "Cadastre um novo agrupamento lógico-operacional"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-dialog-body">
          <section className="fiori-form-section">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="activity-group-name">
                  Nome do grupo
                </label>
                <Input
                  id="activity-group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Ex.: ESTRUTURA POSTAL"
                  disabled={saving}
                  className="fiori-input uppercase shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="activity-group-description">
                  Descrição
                </label>
                <Input
                  id="activity-group-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional"
                  disabled={saving}
                  className="fiori-input shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="activity-group-order">
                  Ordem de exibição
                </label>
                <Input
                  id="activity-group-order"
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  disabled={saving}
                  className="fiori-input w-24 shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="fiori-field-label">Cor de identificação</span>
                <div className="fiori-color-palette" role="listbox" aria-label="Cor de identificação do grupo">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      aria-selected={color === c}
                      aria-label={`Cor ${c}`}
                      onClick={() => setColor(c)}
                      disabled={saving}
                      className={cn(
                        "fiori-color-swatch",
                        color === c && "fiori-color-swatch--selected"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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
