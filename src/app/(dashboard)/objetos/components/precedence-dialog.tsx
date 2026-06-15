"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Database, Network, Search, X } from "lucide-react";
import { DependencyGraph } from "@/components/objetos/dependency-graph";

import { MasterObject } from "@/types/master-object";

interface PrecedenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  precedenceObject: MasterObject | null;
  onSetPrecedenceObject: (obj: MasterObject | null) => void;
  precedenceMode: "card" | "global" | "successor";
  objects: MasterObject[];
  activityGroups: any[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function PrecedenceDialog({
  open,
  onOpenChange,
  precedenceObject,
  onSetPrecedenceObject,
  precedenceMode,
  objects,
  activityGroups,
  searchTerm,
  onSearchChange,
}: PrecedenceDialogProps) {
  const [localValue, setLocalValue] = useState("");

  useEffect(() => {
    setLocalValue(searchTerm);
  }, [searchTerm]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const title =
    precedenceMode === "card"
      ? "Precedência direta"
      : "Explorador de precedência";

  const subtitle =
    precedenceMode === "card"
      ? [precedenceObject?.name, "Dependências no nível imediatamente acima"].filter(Boolean).join(" · ")
      : "Informe o objeto para ver a precedência recursiva completa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        open={open}
        className="fiori-dialog fiori-dialog-fullscreen !flex p-0 flex-col gap-0 overflow-hidden shadow-lg [&>button]:hidden"
      >
        <DialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
          <DialogDescription className="sr-only">
            Visualização do fluxo de dependências técnicas entre objetos de migração.
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-header-main">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="fiori-dialog-back-btn"
                aria-label="Fechar precedência"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="fiori-dialog-icon shrink-0">
                <Network className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="fiori-dialog-title">{title}</DialogTitle>
                <p className="fiori-dialog-subtitle truncate">{subtitle}</p>
              </div>
            </div>

            {precedenceMode === "global" && (
              <div className="fiori-dialog-header-search fiori-search-shell">
                <Search className="fiori-search-icon" />
                <input
                  type="search"
                  placeholder="Buscar objeto… (Enter)"
                  className="fiori-search-input uppercase"
                  value={localValue}
                  aria-label="Buscar objeto para explorar precedência"
                  onChange={(e) => setLocalValue(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    onSearchChange(localValue);
                  }}
                />
              </div>
            )}

            <div className="fiori-dialog-header-actions">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="fiori-dialog-back-btn"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {precedenceMode === "global" && searchTerm && (
          <div className="shrink-0 border-b border-[var(--fiori-border-light)] bg-[#fafafa] px-5 py-2">
            <ScrollArea className="fiori-search-results h-[7.5rem]">
              <div className="grid grid-cols-1 gap-0.5 p-1.5">
                {objects.filter((o) => o.name.includes(searchTerm)).slice(0, 10).map((o) => (
                  <Button
                    key={o.id}
                    variant="ghost"
                    className="fiori-list-item"
                    onClick={() => {
                      onSetPrecedenceObject(o);
                      setLocalValue("");
                      onSearchChange("");
                    }}
                  >
                    <Database className="mr-2 h-3.5 w-3.5 shrink-0 text-[var(--fiori-brand)]" />
                    {o.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="shrink-0 border-b border-[var(--fiori-border-light)] bg-white px-5 py-2.5">
          <p className="fiori-field-hint m-0 border-l-[3px] border-[var(--fiori-brand)] pl-3">
            Esta visão apresenta o fluxo de dependências técnicas. Objetos à esquerda precedem os objetos à direita.
            O caminho destacado indica a linhagem direta até o ponto de origem.
          </p>
        </div>

        <div className="fiori-canvas relative min-h-0 flex-1">
          {precedenceObject ? (
            <DependencyGraph
              targetId={precedenceObject.id}
              allObjects={objects as any}
              mode={precedenceMode as "card" | "global"}
              activityGroups={activityGroups}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--fiori-label)]">
              <Network className="h-12 w-12 opacity-40" />
              <p className="fiori-empty-hint">Busque um objeto para explorar a árvore</p>
            </div>
          )}
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="fiori-legend-line" />
              <span className="fiori-legend">Cadeia ativa detectada</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="fiori-btn-ghost"
              onClick={handleClose}
            >
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
