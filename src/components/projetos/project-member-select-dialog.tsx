"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Search, UserCircle, Users } from "lucide-react";
import { ROLE_LABELS, type UserRole } from "@/types/usuarios";
import { cn } from "@/lib/utils";

export interface ProjectMemberOption {
  uid: string;
  name: string;
  email: string;
  role?: string;
  position?: string;
  company?: string;
  projectIds?: string[];
}

interface ProjectMemberSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName?: string;
  users: ProjectMemberOption[];
  selectedUids: string[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onToggleUid: (uid: string) => void;
  onSave: () => void;
  elevated?: boolean;
}

function compareMemberNames(a: ProjectMemberOption, b: ProjectMemberOption): number {
  return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
}

function roleLabel(role?: string): string {
  if (!role) return "";
  const key = role.toLowerCase() as UserRole;
  return ROLE_LABELS[key] ?? role;
}

export function ProjectMemberSelectDialog({
  open,
  onOpenChange,
  projectName,
  users,
  selectedUids,
  searchTerm,
  onSearchChange,
  onToggleUid,
  onSave,
  elevated = false,
}: ProjectMemberSelectDialogProps) {
  const term = searchTerm.trim().toUpperCase();

  const filteredUsers = users
    .filter((u) => {
      if (!term) return true;
      const haystack = `${u.name} ${u.email} ${u.position ?? ""} ${u.company ?? ""}`.toUpperCase();
      return haystack.includes(term);
    })
    .sort(compareMemberNames);

  const handleClose = (next: boolean) => {
    onOpenChange(next);
    if (!next) onSearchChange("");
  };

  return (
    <Dialog preserveDashboardScroll open={open} onOpenChange={handleClose}>
      <DialogContent
        open={open}
        overlayClassName={cn("fiori-dialog-overlay", elevated && "z-[220]")}
        className={cn(
          "fiori-dialog sm:max-w-[500px] h-[min(92vh,640px)] flex flex-col p-0 border-none shadow-lg overflow-hidden bg-white gap-0 !rounded-[var(--fiori-radius)]",
          elevated && "z-[230]",
        )}
      >
        <DialogHeader className="fiori-dialog-header shrink-0 space-y-0">
          <div className="flex items-start gap-3">
            <div className="fiori-dialog-icon shrink-0">
              <Users className="w-4 h-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <DialogTitle className="fiori-dialog-title">
                Membros{projectName ? `: ${projectName}` : ""}
              </DialogTitle>
              <p className="fiori-dialog-subtitle">
                Selecione os profissionais alocados a este projeto
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 pt-4 pb-0 shrink-0">
          <div className="fiori-search-shell">
            <Search className="fiori-search-icon" aria-hidden />
            <input
              type="search"
              placeholder="Buscar profissional..."
              className="fiori-search-input uppercase"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
              aria-label="Buscar profissional"
            />
          </div>
          {selectedUids.length > 0 && (
            <p className="fiori-selection-hint">
              {selectedUids.length} profissiona{selectedUids.length > 1 ? "is" : "l"} selecionado
              {selectedUids.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            <div className="fiori-object-list">
              {filteredUsers.map((u) => {
                const isSelected = selectedUids.includes(u.uid);
                const isAllocated = (u.projectIds?.length ?? 0) > 0;
                const subtitle = [u.email, u.position, u.company].filter(Boolean).join(" · ");
                const role = roleLabel(u.role);

                return (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => onToggleUid(u.uid)}
                    className={cn("fiori-object-row", isSelected && "fiori-object-row-selected")}
                  >
                    <div
                      className={cn(
                        "fiori-object-row-checkbox",
                        isSelected && "fiori-object-row-checkbox-checked",
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                    </div>
                    <div className="fiori-object-row-icon">
                      <UserCircle className="w-3.5 h-3.5" aria-hidden />
                    </div>
                    <div className="fiori-object-row-body min-w-0 flex-1">
                      <span className="fiori-object-row-name">{u.name}</span>
                      {subtitle && <span className="fiori-object-row-desc">{subtitle}</span>}
                    </div>
                    {role && (
                      <span
                        className={cn(
                          "fiori-seq-badge",
                          isSelected && "fiori-seq-badge-selected",
                        )}
                      >
                        {role}
                      </span>
                    )}
                    {isAllocated && (
                      <span
                        className={cn(
                          "fiori-seq-badge text-[#e76500]",
                          isSelected && "fiori-seq-badge-selected",
                        )}
                      >
                        Alocado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 px-5 text-center">
              <Search className="w-8 h-8 text-[var(--fiori-border)] mb-3" aria-hidden />
              <p className="fiori-empty-hint">
                {term
                  ? "Nenhum profissional encontrado para esta busca"
                  : "Nenhum profissional disponível"}
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
            {selectedUids.length === 0 ? "Remover membros" : "Salvar membros"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
