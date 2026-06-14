"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Loader2, Hash, FileText, Layers } from "lucide-react";

interface CloneMockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceMock: any | null;
  onConfirm: (data: { sequence: string; explanatoryText: string }) => Promise<boolean | void>;
  nextSequence?: string;
}

export function CloneMockDialog({
  open,
  onOpenChange,
  sourceMock,
  onConfirm,
  nextSequence = "01",
}: CloneMockDialogProps) {
  const [sequence, setSequence] = useState(nextSequence);
  const [explanatoryText, setExplanatoryText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && sourceMock) {
      setSequence(nextSequence);
      setExplanatoryText(sourceMock.explanatoryText || "");
    }
  }, [open, sourceMock, nextSequence]);

  const handleConfirm = async () => {
    if (!sequence) return;
    setIsSubmitting(true);
    try {
      const ok = await onConfirm({ sequence, explanatoryText });
      if (ok !== false) onOpenChange(false);
    } catch (error) {
      console.error("Erro ao clonar mock:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const baseName = useMemo(() => {
    if (!sourceMock?.name) return "";
    const parts = sourceMock.name.split("-");
    return parts.length > 1 ? parts.slice(0, -1).join("-") : sourceMock.name;
  }, [sourceMock?.name]);

  if (!sourceMock) return null;

  return (
    <Dialog preserveDashboardScroll open={open} onOpenChange={onOpenChange}>
      <DialogContent
        open={open}
        variant="fiori"
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog fiori-dialog--form fiori-dialog--mock-form flex h-auto max-h-[min(92vh,420px)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            Clonar janela de execução e duplicar objetos vinculados.
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <Copy className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="fiori-dialog-title">Clonar janela</DialogTitle>
              <p className="fiori-dialog-subtitle truncate">{sourceMock.name}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-dialog-body">
          <section className="fiori-form-section">
            <h3 className="fiori-section-title">
              <Layers className="h-3.5 w-3.5" />
              Origem
            </h3>
            <div className="fiori-mock-summary">
              <div className="fiori-mock-summary-field">
                <span className="fiori-field-label">Janela de origem</span>
                <span className="fiori-mock-summary-value uppercase">{sourceMock.name}</span>
              </div>
            </div>
            <p className="fiori-message-box-text mt-2">
              Todos os objetos vinculados a esta janela serão duplicados para a nova mock.
              Históricos de carga não serão copiados.
            </p>
          </section>

          <section className="fiori-form-section">
            <h3 className="fiori-section-title">
              <Hash className="h-3.5 w-3.5" />
              Nova mock
            </h3>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="fiori-field-label">Parte numérica</label>
                <Input
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="01"
                  disabled={isSubmitting}
                  className="fiori-input text-sm text-center uppercase shadow-none"
                />
              </div>

              <div className="fiori-id-preview">
                <span className="fiori-id-preview-label">Identificador final</span>
                <span className="fiori-id-preview-value uppercase">{baseName || "—"}</span>
                <span className="text-[var(--fiori-label)]">-</span>
                <span className="fiori-id-preview-value fiori-id-preview-seq">
                  {sequence || "—"}
                </span>
              </div>

              <div className="space-y-1">
                <label className="fiori-field-label">
                  <FileText className="h-3.5 w-3.5 text-[var(--fiori-brand)]" />
                  Texto explicativo
                </label>
                <Textarea
                  value={explanatoryText}
                  onChange={(e) => setExplanatoryText(e.target.value.toUpperCase())}
                  placeholder="Descreva a finalidade desta cópia..."
                  disabled={isSubmitting}
                  className="fiori-textarea text-sm min-h-[3.5rem] resize-none shadow-none"
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="fiori-btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !sequence}
            className="fiori-btn-emphasized"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Clonando…
              </>
            ) : (
              "Confirmar clonagem"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
