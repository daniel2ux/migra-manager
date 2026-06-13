"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Box, CheckCircle2, Search, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MasterObject {
  id: string;
  name: string;
  description?: string;
  type?: string;
  dependencyIds?: string[];
}

const FILTER_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "SCRIPT", label: "Script" },
  { value: "AGENTE", label: "Agente" },
  { value: "API", label: "API" },
  { value: "DATASET", label: "Dataset" },
  { value: "MODELO", label: "Modelo" },
  { value: "PACOTE", label: "Pacote" },
] as const;

interface DependencyMapperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetObject: MasterObject | null;
  objects: MasterObject[];
  filterType: string;
  onFilterTypeChange: (val: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onToggle: (id: string) => void;
  triggerRef?: React.RefObject<HTMLElement>;
  searchRef?: React.RefObject<HTMLInputElement>;
  timerRef?: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  /** Abre acima de outro diálogo (ex.: cadastro rápido). */
  elevated?: boolean;
}

export function DependencyMapperDialog({
  open,
  onOpenChange,
  targetObject,
  objects,
  filterType,
  onFilterTypeChange,
  searchTerm,
  onSearchChange,
  onToggle,
  triggerRef,
  searchRef,
  timerRef,
  elevated = false,
}: DependencyMapperDialogProps) {
  const handleClose = (val: boolean) => {
    onOpenChange(val);
    if (!val) setTimeout(() => triggerRef?.current?.focus(), 0);
  };

  const linkedDeps = (targetObject?.dependencyIds || []).filter(depId => {
    const depObj = objects.find(o => o.id === depId);
    if (!depObj) return false;
    return filterType === "TODOS" || depObj.type === filterType;
  });

  const availableObjects = objects
    .filter((o) => {
      if (o.id === targetObject?.id) return false;
      if (filterType !== "TODOS" && o.type !== filterType) return false;
      if (searchTerm === "") return true;
      const term = searchTerm.toUpperCase();
      return (
        o.name.toUpperCase().includes(term) ||
        (o.description || "").toUpperCase().includes(term)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        overlayClassName={cn("fiori-dialog-overlay", elevated && "z-[220]")}
        className={cn(
          "fiori-dialog sm:max-w-[550px] h-[min(92vh,600px)] flex flex-col p-0 border-none shadow-lg overflow-hidden bg-white gap-0 !rounded-[var(--fiori-radius)]",
          elevated && "z-[230]",
        )}
      >
        <DialogHeader className="fiori-dialog-header shrink-0 space-y-0">
          <div className="flex items-start gap-3">
            <div className="fiori-dialog-icon shrink-0">
              <Box className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="fiori-dialog-title">
                Dependências técnicas: {targetObject?.name}
              </DialogTitle>
              <p className="fiori-dialog-subtitle">
                Mapeamento de relações e vínculos entre objetos do workspace
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 pt-4 pb-0 space-y-4 shrink-0">
          <div className="fiori-filter-row">
            <div className="fiori-search-shell flex-1">
              <Search className="fiori-search-icon" />
              <input
                type="search"
                placeholder="Buscar objeto para vincular..."
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
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger className="fiori-select-trigger fiori-filter-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="fiori-select-content">
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="fiori-select-item">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="fiori-field-label">
              <Sparkles className="w-3.5 h-3.5 text-[var(--fiori-brand)]" />
              Objetos vinculados como dependência
            </label>
            <div className="fiori-deps-zone flex flex-wrap gap-1.5 content-start">
              {linkedDeps.length > 0 ? (
                linkedDeps.map(depId => {
                  const depObj = objects.find(o => o.id === depId);
                  return (
                    <span key={depId} className="fiori-dep-chip">
                      {depObj?.name || "—"}
                      <button
                        type="button"
                        className="fiori-dep-chip-remove"
                        aria-label={`Remover ${depObj?.name ?? "dependência"}`}
                        onClick={() => onToggle(depId)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <span className="fiori-deps-empty">Nenhuma dependência mapeada.</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {availableObjects.length > 0 ? (
              availableObjects.map((o) => {
                const isSelected = targetObject?.dependencyIds?.includes(o.id);
                return (
                  <Button
                    key={o.id}
                    variant="ghost"
                    onClick={() => onToggle(o.id)}
                    className={cn(
                      "fiori-pick-chip",
                      isSelected && "fiori-pick-chip-selected"
                    )}
                  >
                    <span>{o.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  </Button>
                );
              })
            ) : (
              <div className="w-full py-10 flex flex-col items-center justify-center text-center">
                <Search className="w-8 h-8 text-[var(--fiori-border)] mb-3" />
                <p className="fiori-empty-hint">
                  {searchTerm !== "" || filterType !== "TODOS"
                    ? "Nenhum objeto encontrado com os filtros atuais"
                    : "Nenhum outro objeto cadastrado para vincular"}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0">
          <Button
            className="fiori-btn-emphasized w-full shadow-none"
            onClick={() => handleClose(false)}
          >
            Concluir mapeamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
