"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, X, Mail, Tag, ChevronDown, Search, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEmailContacts, useEmailGroups } from "@/hooks/use-email-contacts";
import type { EmailRecipientSelection } from "@/types/email";

export interface EmailMultiSelectProps {
  /** Seleções atuais (contatos + agrupadores) */
  value: EmailRecipientSelection[];
  /** Callback quando a seleção muda */
  onChange: (selections: EmailRecipientSelection[]) => void;
  /** Placeholder do input */
  placeholder?: string;
  /** Classe CSS adicional */
  className?: string;
  /** Desabilitado */
  disabled?: boolean;
  /** Variante visual */
  variant?: "default" | "fiori";
}

/**
 * Componente MultiSelect para seleção de destinatários de e-mail
 * Permite selecionar contatos individuais e/ou agrupadores
 */
export function EmailMultiSelect({
  value,
  onChange,
  placeholder = "Selecione destinatários...",
  className,
  disabled = false,
  variant = "default",
}: EmailMultiSelectProps) {
  const isFiori = variant === "fiori";
  const { contacts } = useEmailContacts();
  const { groups } = useEmailGroups();
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle seleção de um item
  const toggleSelection = (type: 'contact' | 'group' | 'external', id: string) => {
    const exists = value.find((s) => s.type === type && s.id === id);
    if (exists) {
      onChange(value.filter((s) => !(s.type === type && s.id === id)));
    } else {
      const newItem: EmailRecipientSelection = {
        type,
        id,
        label: type === 'group' 
          ? (groups.find((g) => g.id === id)?.name ?? id)
          : (type === 'contact' ? (contacts.find((c) => c.id === id)?.name ?? id) : id),
        email: type === 'contact' || type === 'external'
          ? (type === 'contact' ? contacts.find((c) => c.id === id)?.email : id)
          : undefined,
      };
      onChange([...value, newItem]);
      if (type === 'external') setSearchTerm("");
    }
  };

  // Remover um item selecionado
  const removeSelection = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  // Filtrar itens pela busca
  const filteredItems = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      return { contacts, groups };
    }

    return {
      contacts: (contacts || []).filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term)
      ),
      groups: (groups || []).filter((g) =>
        g.name?.toLowerCase().includes(term)
      ),
      isEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(term) && !contacts.some(c => c.email.toLowerCase() === term),
    };
  }, [contacts, groups, searchTerm]);

  // Verificar se um item está selecionado
  const isSelected = (type: 'contact' | 'group' | 'external', id: string) => {
    return value.some((s) => s.type === type && s.id === id);
  };

  // Contar e-mails resolvidos
  const resolvedEmailsCount = React.useMemo(() => {
    const emailSet = new Set<string>();

    value.forEach((selection) => {
      if (selection.type === 'contact') {
        const contact = contacts.find((c) => c.id === selection.id);
        if (contact?.email) {
          emailSet.add(contact.email);
        }
      } else if (selection.type === 'group') {
        const groupContacts = contacts.filter((c) => c.groupIds.includes(selection.id));
        groupContacts.forEach((c) => {
          if (c.email) emailSet.add(c.email);
        });
      }
    });

    return emailSet.size;
  }, [value, contacts]);

  return (
    <div className={cn("relative", isFiori && "fiori-email-multiselect--fiori", className)} ref={containerRef}>
      {/* Trigger */}
      <div
        className={cn(
          isFiori
            ? cn(
                "fiori-email-multiselect-trigger",
                disabled && "fiori-email-multiselect-trigger--disabled",
                isOpen && !disabled && "fiori-email-multiselect-trigger--open"
              )
            : cn(
                "min-h-[40px] w-full bg-slate-50 border border-slate-300 px-3 py-2 cursor-pointer transition-colors rounded-none",
                disabled && "opacity-50 cursor-not-allowed",
                isOpen && !disabled && "border-SkyBlue-500 ring-1 ring-SkyBlue-500/30"
              )
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center flex-wrap gap-1">
          {value.length === 0 ? (
            <span className={isFiori ? "fiori-email-multiselect-placeholder" : "text-[11px] text-slate-400"}>{placeholder}</span>
          ) : (
            <>
              {value.slice(0, 5).map((selection, index) => (
                <Badge
                  key={`${selection.type}-${selection.id}`}
                  variant="secondary"
                  className={cn(
                    isFiori
                      ? cn(
                          "fiori-email-multiselect-badge",
                          selection.type === "group"
                            ? "fiori-email-multiselect-badge--group"
                            : "fiori-email-multiselect-badge--contact"
                        )
                      : cn(
                          "h-5 text-[9px] rounded-none border-0 px-2 gap-1 font-medium",
                          selection.type === "group"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-SkyBlue-50 text-SkyBlue-700"
                        )
                  )}
                >
                  {selection.type === "group" ? (
                    <Tag className="w-2.5 h-2.5" />
                  ) : (
                    <Mail className="w-2.5 h-2.5" />
                  )}
                  <span className="truncate max-w-[150px]">{selection.label}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSelection(index);
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </Badge>
              ))}
              {value.length > 5 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    isFiori
                      ? "fiori-email-multiselect-badge fiori-email-multiselect-badge--more"
                      : "h-5 text-[9px] rounded-none bg-slate-100 text-slate-600 border-0 px-2"
                  )}
                >
                  +{value.length - 5} mais
                </Badge>
              )}
            </>
          )}
        </div>

        <div className={cn(
          isFiori ? "fiori-email-multiselect-footer" : "flex items-center justify-between mt-2 pt-2 border-t border-slate-200"
        )}>
          <span className={isFiori ? "fiori-email-multiselect-footer-text" : "text-[9px] text-slate-400"}>
            {value.length > 0
              ? `${resolvedEmailsCount} e-mail(s) ${resolvedEmailsCount === 1 ? "será" : "serão"} enviado(s)`
              : placeholder}
          </span>
          <ChevronDown
            className={cn(
              isFiori ? "fiori-email-multiselect-chevron" : "w-4 h-4 text-slate-400 transition-transform",
              isOpen && (isFiori ? "fiori-email-multiselect-chevron--open" : "rotate-180")
            )}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className={cn(
          isFiori
            ? "fiori-email-multiselect-panel"
            : "absolute z-50 w-full mt-1 bg-white border border-slate-200 shadow-lg max-h-[400px] flex flex-col"
        )}>
          {/* Search Input */}
          <div className={cn(isFiori ? "fiori-email-multiselect-search" : "p-2 border-b border-slate-100")}>
            {isFiori ? (
              <div className="fiori-search-shell">
                <Search className="fiori-search-icon" />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar contato ou agrupador..."
                  className="fiori-search-input"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar contato ou agrupador..."
                  className="pl-7 h-8 text-[11px] bg-slate-50 border-slate-200 rounded-none focus:border-SkyBlue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className={isFiori ? undefined : "divide-y divide-slate-100"}>
              {/* Agrupadores */}
              {(filteredItems?.groups?.length ?? 0) > 0 && (
                <div>
                  <div className={isFiori ? "fiori-email-multiselect-section-label" : "px-3 py-1.5 bg-slate-50"}>
                    <span className={isFiori ? undefined : "text-[9px] font-black text-slate-400 uppercase tracking-widest"}>
                      Agrupadores ({filteredItems.groups.length})
                    </span>
                  </div>
                  {filteredItems.groups.map((group) => {
                    const selected = isSelected("group", group.id);
                    const contactCount = contacts.filter((c) =>
                      c.groupIds.includes(group.id)
                    ).length;

                    return (
                      <div
                        key={group.id}
                        className={cn(
                          isFiori
                            ? cn(
                                "fiori-email-multiselect-option fiori-email-multiselect-option--group",
                                selected && "fiori-email-multiselect-option--selected"
                              )
                            : cn(
                                "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                                selected ? "bg-amber-50" : "hover:bg-slate-50"
                              )
                        )}
                        onClick={() => toggleSelection("group", group.id)}
                      >
                        <div
                          className={cn(
                            isFiori
                              ? cn("fiori-object-row-checkbox", selected && "fiori-object-row-checkbox-checked")
                              : cn(
                                  "w-4 h-4 border flex items-center justify-center shrink-0",
                                  selected ? "bg-amber-500 border-amber-500" : "border-slate-300 bg-white"
                                )
                          )}
                        >
                          {selected && (
                            <Check className={cn("w-3 h-3", isFiori ? undefined : "text-white")} strokeWidth={isFiori ? 3 : 2} />
                          )}
                        </div>
                        <Tag
                          className={cn(
                            "w-3.5 h-3.5 shrink-0",
                            isFiori
                              ? selected ? "text-[#b44f00]" : "text-[var(--fiori-label,#6a6d70)]"
                              : selected ? "text-amber-500" : "text-slate-400"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            isFiori ? "fiori-email-multiselect-option-name" : cn("text-[11px] truncate block", selected ? "text-amber-700 font-medium" : "text-slate-700")
                          )}>
                            {group.name}
                          </span>
                          <span className={isFiori ? "fiori-email-multiselect-option-meta" : "text-[9px] text-slate-400"}>
                            {contactCount} {contactCount === 1 ? "contato" : "contatos"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Contatos */}
              {(filteredItems?.contacts?.length ?? 0) > 0 && (
                <div>
                  <div className={isFiori ? "fiori-email-multiselect-section-label" : "px-3 py-1.5 bg-slate-50"}>
                    <span className={isFiori ? undefined : "text-[9px] font-black text-slate-400 uppercase tracking-widest"}>
                      Contatos ({filteredItems?.contacts?.length ?? 0})
                    </span>
                  </div>
                  {filteredItems.contacts.map((contact) => {
                    const selected = isSelected("contact", contact.id);

                    return (
                      <div
                        key={contact.id}
                        className={cn(
                          isFiori
                            ? cn(
                                "fiori-email-multiselect-option",
                                selected && "fiori-email-multiselect-option--selected"
                              )
                            : cn(
                                "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                                selected ? "bg-SkyBlue-50" : "hover:bg-slate-50"
                              )
                        )}
                        onClick={() => toggleSelection("contact", contact.id)}
                      >
                        <div
                          className={cn(
                            isFiori
                              ? cn("fiori-object-row-checkbox", selected && "fiori-object-row-checkbox-checked")
                              : cn(
                                  "w-4 h-4 border flex items-center justify-center shrink-0",
                                  selected ? "bg-SkyBlue-500 border-SkyBlue-500" : "border-slate-300 bg-white"
                                )
                          )}
                        >
                          {selected && (
                            <Check className={cn("w-3 h-3", isFiori ? undefined : "text-white")} strokeWidth={isFiori ? 3 : 2} />
                          )}
                        </div>
                        <Mail
                          className={cn(
                            "w-3.5 h-3.5 shrink-0",
                            isFiori
                              ? selected ? "text-[var(--fiori-brand,#0070f2)]" : "text-[var(--fiori-label,#6a6d70)]"
                              : selected ? "text-SkyBlue-500" : "text-slate-400"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            isFiori ? "fiori-email-multiselect-option-name" : cn("text-[11px] truncate block", selected ? "text-SkyBlue-700 font-medium" : "text-slate-700")
                          )}>
                            {contact.name}
                          </span>
                          <span className={isFiori ? "fiori-email-multiselect-option-meta" : "text-[9px] text-slate-400"}>
                            {contact.email}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Adicionar e-mail externo */}
              {filteredItems.isEmail && !isSelected("external", searchTerm.toLowerCase().trim()) && (
                <div
                  className={cn(
                    isFiori
                      ? "fiori-email-multiselect-option hover:bg-[var(--fiori-brand-light,#e8f3ff)]"
                      : "px-3 py-2 border-t border-slate-100 hover:bg-SkyBlue-50 cursor-pointer flex items-center gap-2 group"
                  )}
                  onClick={() => toggleSelection("external", searchTerm.toLowerCase().trim())}
                >
                  <div className={cn(
                    isFiori
                      ? "fiori-object-row-checkbox"
                      : "w-4 h-4 border border-slate-300 bg-white flex items-center justify-center shrink-0 group-hover:border-SkyBlue-500"
                  )}>
                    <Plus className={cn("w-2.5 h-2.5", isFiori ? "text-[var(--fiori-brand,#0070f2)]" : "text-SkyBlue-500")} />
                  </div>
                  <Mail className={cn("w-3.5 h-3.5", isFiori ? "text-[var(--fiori-brand,#0070f2)]" : "text-SkyBlue-400")} />
                  <div className="flex-1 min-w-0">
                    <span className={isFiori ? "fiori-email-multiselect-option-name" : "text-[11px] text-slate-700 block"}>Utilizar este e-mail</span>
                    <span className={isFiori ? "fiori-email-multiselect-option-meta text-[var(--fiori-brand,#0070f2)]" : "text-[9px] text-SkyBlue-600 font-medium"}>{searchTerm.toLowerCase().trim()}</span>
                  </div>
                </div>
              )}

              {/* Sem resultados */}
              {filteredItems.groups.length === 0 &&
                filteredItems.contacts.length === 0 && (
                  <div className={isFiori ? "fiori-email-multiselect-empty" : "px-3 py-8 text-center"}>
                    <p className={isFiori ? undefined : "text-[10px] text-slate-400"}>
                      {searchTerm
                        ? "Nenhum resultado encontrado."
                        : "Nenhum contato ou agrupador cadastrado."}
                    </p>
                  </div>
                )}
            </div>
          </ScrollArea>

          {/* Footer */}
          {value.length > 0 && (
            <div className={cn(
              isFiori
                ? "fiori-email-multiselect-panel-footer"
                : "px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between"
            )}>
              <span className={isFiori ? "fiori-email-multiselect-panel-footer-text" : "text-[9px] text-slate-500"}>
                {value.length} selecionado(s)
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className={isFiori ? "fiori-email-multiselect-clear-btn" : "text-[9px] text-red-600 hover:text-red-700 font-medium"}
              >
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
