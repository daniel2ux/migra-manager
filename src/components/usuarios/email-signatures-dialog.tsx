"use client";

import { useState } from "react";
import { Loader2, Mail, Trash2, Camera, Save, FileSignature } from "lucide-react";
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
import type { EmailSignature } from "@/types/usuarios";

interface EmailSignaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signatures: EmailSignature[];
  onAdd: (name: string, content: string, imageUrl: string) => Promise<boolean>;
  onDelete: (sig: EmailSignature) => Promise<void>;
  onImageUpload: (file: File) => Promise<string | null>;
  isSaving: boolean;
  isUploadingImage: boolean;
}

export function EmailSignaturesDialog({
  open,
  onOpenChange,
  signatures,
  onAdd,
  onDelete,
  onImageUpload,
  isSaving,
  isUploadingImage,
}: EmailSignaturesDialogProps) {
  const [newSigName, setNewSigName] = useState("");
  const [newSigContent, setNewSigContent] = useState("");
  const [newSigImageUrl, setNewSigImageUrl] = useState("");

  const canAdd =
    !!newSigName.trim() && (!!newSigContent.trim() || !!newSigImageUrl.trim());

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void onImageUpload(file).then((url) => {
        if (url) setNewSigImageUrl(url);
      });
    }
    e.target.value = "";
  };

  const handleAdd = async () => {
    if (!canAdd) return;
    const success = await onAdd(newSigName, newSigContent, newSigImageUrl);
    if (success) {
      setNewSigName("");
      setNewSigContent("");
      setNewSigImageUrl("");
    }
  };

  const handleDismiss = () => {
    setNewSigName("");
    setNewSigContent("");
    setNewSigImageUrl("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleDismiss();
      }}
    >
      <DialogContent
        variant="fiori"
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog fiori-dialog--form flex h-[min(92vh,640px)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            Gerenciar assinaturas de e-mail
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <Mail className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="fiori-dialog-title">Assinaturas de e-mail</DialogTitle>
              <p className="fiori-dialog-subtitle">Modelos para envio de comunicações</p>
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-dialog-body">
          <section className="fiori-form-section">
            <h3 className="fiori-section-title">
              <FileSignature className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Assinaturas existentes
            </h3>
            {signatures.length === 0 ? (
              <p className="fiori-empty-hint">Nenhuma assinatura cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {signatures.map((sig) => (
                  <div
                    key={sig.id}
                    className="flex items-start gap-2 rounded border border-[var(--fiori-border-light)] bg-[#fafafa] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--fiori-text)]">
                        {sig.name}
                      </p>
                      {sig.imageUrl && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL dinâmica */}
                          <img
                            src={sig.imageUrl}
                            alt={sig.name}
                            className="mt-2 h-12 max-w-full border border-[var(--fiori-border-light)] bg-white object-contain p-1"
                          />
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void onDelete(sig)}
                      className="fiori-icon-btn fiori-icon-btn-bordered shrink-0 text-[var(--fiori-negative)]"
                      aria-label={`Excluir assinatura ${sig.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="fiori-form-section">
            <h3 className="fiori-section-title">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Nova assinatura
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="sig-name">
                  Nome <span className="text-[var(--fiori-negative)]">*</span>
                </label>
                <Input
                  id="sig-name"
                  value={newSigName}
                  onChange={(e) => setNewSigName(e.target.value)}
                  placeholder="Assinatura padrão"
                  className="fiori-input readable-disabled shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor="sig-content">
                  Conteúdo (HTML ou texto)
                </label>
                <Textarea
                  id="sig-content"
                  value={newSigContent}
                  onChange={(e) => setNewSigContent(e.target.value)}
                  placeholder="<p>Assinatura HTML</p>"
                  rows={4}
                  className="fiori-textarea min-h-[5rem] font-mono readable-disabled shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="fiori-field-label">Imagem da assinatura</span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="sr-only"
                    id="sig-image-input"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("sig-image-input")?.click()}
                    disabled={isUploadingImage}
                    className="fiori-btn-ghost inline-flex items-center gap-1.5"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Camera className="h-4 w-4" aria-hidden />
                    )}
                    {isUploadingImage ? "Enviando…" : "Selecionar imagem"}
                  </button>
                  {newSigImageUrl && (
                    <span className="fiori-chip fiori-chip-selected">Imagem selecionada</span>
                  )}
                </div>
                {newSigImageUrl && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview local/blob */}
                    <img
                      src={newSigImageUrl}
                      alt="Pré-visualização da assinatura"
                      className="mt-2 h-16 max-w-full border border-[var(--fiori-border-light)] bg-white object-contain p-1"
                    />
                  </>
                )}
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="fiori-btn-ghost"
            disabled={isSaving}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={isSaving || !canAdd}
            className="fiori-btn-emphasized inline-flex items-center gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden />
            )}
            Salvar assinatura
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
