"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Plus,
  Trash2,
  Pencil,
  Save,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFileAliases } from "@/hooks/use-file-aliases";
import type { FileAlias } from "@/types/file-alias";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CARD_TOOLBAR_BTN =
  "fiori-card-toolbar-btn !rounded-[0.25rem] !size-[1.375rem] min-h-0 min-w-0";

interface FileAliasesManagerProps {
  className?: string;
}

export function FileAliasesManager({ className }: FileAliasesManagerProps) {
  const { toast } = useToast();
  const { aliases, loading, error, addAlias, updateAlias, deleteAlias } = useFileAliases();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlias, setEditingAlias] = useState<FileAlias | null>(null);
  const [objectName, setObjectName] = useState("");
  const [fileNamePatterns, setFileNamePatterns] = useState("");
  const [saving, setSaving] = useState(false);
  const [aliasToDelete, setAliasToDelete] = useState<FileAlias | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenDialog = (alias?: FileAlias) => {
    if (alias) {
      setEditingAlias(alias);
      setObjectName(alias.objectName);
      setFileNamePatterns(alias.fileNamePatterns.join("\n"));
    } else {
      setEditingAlias(null);
      setObjectName("");
      setFileNamePatterns("");
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!objectName.trim() || !fileNamePatterns.trim()) return;

    setSaving(true);
    try {
      const patterns = fileNamePatterns
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (editingAlias) {
        await updateAlias(editingAlias.id, {
          objectName: objectName.trim(),
          fileNamePatterns: patterns,
        });
      } else {
        await addAlias({
          objectName: objectName.trim(),
          fileNamePatterns: patterns,
        });
      }
      setIsDialogOpen(false);
      toast({
        description: editingAlias
          ? "Mapeamento atualizado com sucesso."
          : "Mapeamento criado com sucesso.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar mapeamento.";
      console.error("[FileAliasesManager] Save error:", err);
      toast({ variant: "destructive", description: message });
    } finally {
      setSaving(false);
    }
  };

  const sortedAliases = useMemo(
    () => [...aliases].sort((a, b) => a.objectName.localeCompare(b.objectName, "pt-BR")),
    [aliases]
  );

  const handleConfirmDelete = async () => {
    if (!aliasToDelete) return;

    setDeleting(true);
    try {
      await deleteAlias(aliasToDelete.id);
      setAliasToDelete(null);
      toast({ description: "Mapeamento excluído." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao excluir mapeamento.";
      console.error("[FileAliasesManager] Delete error:", err);
      toast({ variant: "destructive", description: message });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <section className={cn("fiori-settings-panel fiori-settings-panel--fill", className)}>
        <div className="fiori-settings-loading fiori-settings-loading--fill">Carregando mapeamentos…</div>
      </section>
    );
  }

  return (
    <>
      <section className={cn("fiori-settings-panel fiori-settings-panel--fill", className)}>
        <header className="fiori-settings-panel-header fiori-settings-panel-header--rich">
          <div className="fiori-settings-panel-header-main">
            <FileText aria-hidden />
            <div className="fiori-settings-panel-header-text">
              <h2 className="fiori-settings-panel-title">Mapeamento de arquivos de log</h2>
              <p className="fiori-field-hint">
                Associe nomes de objetos a padrões de nomes de arquivos (.log/.err) diferentes
              </p>
            </div>
          </div>
          <div className="fiori-settings-panel-header-actions">
            <button
              type="button"
              onClick={() => handleOpenDialog()}
              className="fiori-btn-transparent fiori-settings-panel-header-btn"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              <span>Novo</span>
            </button>
          </div>
        </header>

        <div className="fiori-settings-panel-body fiori-settings-panel-body--fill">
          {error && (
            <div className="fiori-message-error mb-4 flex items-center gap-2 fiori-settings-panel-body-banner">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {error}
            </div>
          )}

          {aliases.length === 0 ? (
            <div className="fiori-settings-empty">
              <FileText className="fiori-settings-empty-icon" aria-hidden />
              <p className="fiori-settings-empty-title">Nenhum mapeamento configurado</p>
              <p className="fiori-settings-empty-desc">Clique em &quot;Novo&quot; para adicionar um mapeamento</p>
            </div>
          ) : (
            <div className="fiori-file-alias-table" role="table" aria-label="Mapeamentos de arquivos de log">
              <div className="fiori-file-alias-table-meta">
                <span className="fiori-file-alias-table-count">
                  {sortedAliases.length}{" "}
                  {sortedAliases.length === 1 ? "mapeamento" : "mapeamentos"}
                </span>
              </div>

              <div className="fiori-file-alias-table-scroll custom-scrollbar">
                <div className="fiori-file-alias-scroll-head">
                  <div className="fiori-file-alias-list-header" role="row">
                    <div
                      className="fiori-file-alias-list-cell fiori-file-alias-list-cell--object"
                      role="columnheader"
                    >
                      Objeto no Migra
                    </div>
                    <div
                      className="fiori-file-alias-list-cell fiori-file-alias-list-cell--patterns"
                      role="columnheader"
                    >
                      Padrões de arquivo
                    </div>
                    <div
                      className="fiori-file-alias-list-cell fiori-file-alias-list-cell--actions"
                      role="columnheader"
                    >
                      Ações
                    </div>
                  </div>
                </div>

                <TooltipProvider delayDuration={0}>
                  <div role="rowgroup">
                    {sortedAliases.map((alias) => (
                      <div
                        key={alias.id}
                        className="fiori-file-alias-list-row group"
                        role="row"
                      >
                        <div
                          className="fiori-file-alias-list-cell fiori-file-alias-list-cell--object"
                          role="cell"
                        >
                          <span className="fiori-file-alias-object-name">{alias.objectName}</span>
                        </div>
                        <div
                          className="fiori-file-alias-list-cell fiori-file-alias-list-cell--patterns"
                          role="cell"
                        >
                          <div className="fiori-file-alias-patterns">
                            {alias.fileNamePatterns.map((pattern, idx) => (
                              <span key={idx} className="fiori-file-alias-pattern">
                                {pattern}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div
                          className="fiori-file-alias-list-cell fiori-file-alias-list-cell--actions"
                          role="cell"
                        >
                          <div className="fiori-card-toolbar">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={CARD_TOOLBAR_BTN}
                                  onClick={() => handleOpenDialog(alias)}
                                  aria-label={`Editar mapeamento ${alias.objectName}`}
                                >
                                  <Pencil className="h-3 w-3" aria-hidden />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" variant="fiori">
                                Editar mapeamento
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn-danger")}
                                  onClick={() => setAliasToDelete(alias)}
                                  aria-label={`Excluir mapeamento ${alias.objectName}`}
                                >
                                  <Trash2 className="h-3 w-3" aria-hidden />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" variant="fiori">
                                Excluir mapeamento
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
              </div>
            </div>
          )}
        </div>
      </section>

      <AlertDialog preserveDashboardScroll
        open={aliasToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setAliasToDelete(null);
        }}
      >
        <AlertDialogContent open={aliasToDelete !== null} variant="fiori" className="max-w-md">
          <AlertDialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
                <Trash2 className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle variant="fiori">Excluir mapeamento</AlertDialogTitle>
                <AlertDialogDescription variant="fiori" className="truncate pt-0">
                  {aliasToDelete?.objectName}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="fiori-message-box-body">
            <p className="fiori-message-box-text">
              Tem certeza que deseja excluir este mapeamento? Esta ação não pode ser desfeita.
            </p>
            {aliasToDelete && aliasToDelete.fileNamePatterns.length > 0 && (
              <p className="fiori-message-box-context">
                Padrões associados: {aliasToDelete.fileNamePatterns.join(", ")}
              </p>
            )}
          </div>

          <AlertDialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <AlertDialogCancel variant="fiori" disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="fiori"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              className="fiori-btn-emphasized--negative"
            >
              {deleting ? "Excluindo…" : "Excluir mapeamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog preserveDashboardScroll open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          open={isDialogOpen}
          variant="fiori"
          overlayClassName="fiori-dialog-overlay"
          className="fiori-dialog fiori-dialog--form flex w-[calc(100vw-1rem)] max-w-md flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
        >
          <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
            <DialogDescription className="sr-only">
              {editingAlias ? "Editar mapeamento de arquivo de log" : "Criar novo mapeamento de arquivo de log"}
            </DialogDescription>
            <div className="fiori-dialog-header-row">
              <div className="fiori-dialog-icon shrink-0">
                <FileText className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="fiori-dialog-title">
                  {editingAlias ? "Editar mapeamento" : "Novo mapeamento"}
                </DialogTitle>
                <p className="fiori-dialog-subtitle">
                  Associe um objeto do Migra aos padrões de nome de arquivo
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="fiori-dialog-body space-y-4">
            <div className="fiori-form-field">
              <label className="fiori-field-label" htmlFor="file-alias-object-name">
                Nome do objeto no Migra
              </label>
              <Input
                id="file-alias-object-name"
                placeholder="Ex.: BILLEBF_MA"
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
                className="fiori-input shadow-none"
              />
              <p className="fiori-field-hint">Nome exato do objeto conforme aparece no sistema</p>
            </div>

            <div className="fiori-form-field">
              <label className="fiori-field-label" htmlFor="file-alias-patterns">
                Padrões de nome de arquivo
              </label>
              <Textarea
                id="file-alias-patterns"
                placeholder={"BILLDOCMA\n*FACTS1NB*\nBILLDOCMA-EM-102"}
                value={fileNamePatterns}
                onChange={(e) => setFileNamePatterns(e.target.value)}
                className="fiori-file-alias-textarea shadow-none"
              />
              <p className="fiori-field-hint">
                Um padrão por linha. Use <code>*</code> como curinga (ex.: <code>*FACTS1NB*</code>).
              </p>
            </div>
          </div>

          <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="fiori-btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !objectName.trim() || !fileNamePatterns.trim()}
              className="fiori-btn-emphasized"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Salvando…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  {editingAlias ? "Salvar alterações" : "Criar mapeamento"}
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
