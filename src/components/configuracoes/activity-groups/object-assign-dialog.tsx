"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Search, X, Check, ArrowLeft } from "lucide-react";
import type { ActivityGroup } from "@/types/activity-group";
import type { MasterObject } from "@/types/master-object";

export function ObjectAssignDialog({
  open,
  onClose,
  group,
  allObjects,
  onSave,
  empresa,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  group: ActivityGroup;
  allObjects: MasterObject[];
  onSave: (objectIds: string[]) => Promise<void>;
  empresa?: string;
  projectName?: string;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(group.objectIds ?? []));
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, group]);

  const filtered = useMemo(
    () =>
      allObjects
        .filter((o) => o.status !== "INATIVO")
        .filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          const aSelected = selected.has(a.id);
          const bSelected = selected.has(b.id);
          if (aSelected !== bSelected) return aSelected ? -1 : 1;
          return a.name.localeCompare(b.name, "pt-BR");
        }),
    [allObjects, search, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave([...selected]);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        overlayClassName="fiori-dialog-overlay"
        className="fiori-dialog fiori-dialog-fullscreen !flex max-w-none flex-col gap-0 overflow-hidden p-0 [&>button]:hidden"
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0 text-left">
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-header-main">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="fiori-dialog-back-btn"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div
                className="fiori-activity-group-swatch fiori-activity-group-swatch--dialog shrink-0"
                style={{ backgroundColor: group.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="fiori-dialog-title-row">
                  <DialogTitle className="fiori-dialog-title shrink-0">
                    Objetos — {group.name}
                  </DialogTitle>
                  {(empresa || projectName) && (
                    <>
                      <div className="fiori-dialog-title-context-divider" aria-hidden />
                      <div className="fiori-dialog-context fiori-dialog-context--inline">
                        {empresa && (
                          <div className="fiori-dialog-context-field">
                            <span className="fiori-dialog-context-label">Empresa</span>
                            <span className="fiori-dialog-context-value">{empresa}</span>
                          </div>
                        )}
                        {empresa && projectName && (
                          <div className="fiori-dialog-context-divider" aria-hidden />
                        )}
                        {projectName && (
                          <div className="fiori-dialog-context-field">
                            <span className="fiori-dialog-context-label">Projeto</span>
                            <span className="fiori-dialog-context-value">{projectName}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <p
                  className={cn(
                    "fiori-dialog-subtitle truncate",
                    !group.description?.trim() && "fiori-dialog-subtitle--empty"
                  )}
                  title={group.description?.trim() || undefined}
                >
                  {group.description?.trim() || "Sem descrição"}
                </p>
                <p className="fiori-dialog-meta">
                  {selected.size} objeto{selected.size !== 1 ? "s" : ""} selecionado{selected.size !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="fiori-dialog-header-search fiori-search-shell self-center">
              <Search className="fiori-search-icon" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar objeto..."
                className="fiori-search-input"
                aria-label="Pesquisar objeto"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="fiori-search-clear"
                  aria-label="Limpar pesquisa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-report-scroll flex-1 min-h-0">
          <table className="fiori-report-table">
            <thead>
              <tr>
                <th className="fiori-report-table-col-check" />
                <th>Nome do objeto</th>
                <th>Tipo técnico</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((obj) => {
                const isSelected = selected.has(obj.id);
                return (
                  <tr
                    key={obj.id}
                    onClick={() => toggle(obj.id)}
                    className={cn(
                      "fiori-report-table-row--clickable",
                      isSelected && "fiori-report-table-row--selected"
                    )}
                  >
                    <td className="fiori-report-table-col-check text-center">
                      <div
                        className={cn(
                          "fiori-object-row-checkbox mx-auto",
                          isSelected && "fiori-object-row-checkbox-checked"
                        )}
                        aria-hidden
                      >
                        {isSelected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                      </div>
                    </td>
                    <td className="fiori-object-col fiori-mono">{obj.name}</td>
                    <td className="fiori-mono-muted">{obj.type ?? "—"}</td>
                    <td className="max-w-[28rem] truncate text-[var(--fiori-label)]">
                      {obj.description || "—"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="!border-0 p-0">
                    <div className="fiori-report-empty">Nenhum objeto encontrado</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            className="fiori-btn-transparent shadow-none"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="fiori-btn-emphasized shadow-none"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando…" : "Confirmar seleção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
