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
  Plus, Database, Box, Hash, Split, CheckCircle2,
  Network, AlertCircle, Sparkles, Loader2, PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidSequence } from "@/lib/migration/sequence-utils";

interface QuickFormData {
  name: string;
  chargeGroup: string;
  chargeOrder: string;
  parallelOrder: string;
  status: string;
  description: string;
  externalDependencies?: string[];
}

interface QuickCreateObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quickFormData: QuickFormData;
  /** Merge no estado do formulário (ex.: objeto mestre usa mais campos além de QuickFormData). */
  onFormChange: (patch: Partial<QuickFormData>) => void;
  isGenerating: boolean;
  onSave: (e?: React.FormEvent, keepOpen?: boolean) => void;
  onAiGenerate: () => void;
  onSuggestOrder: (group: string, mode: string) => void;
  onSuggestParallelOrder: (group: string, mode: string) => void;
  nameInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function QuickCreateObjectDialog({
  open,
  onOpenChange,
  quickFormData,
  onFormChange,
  isGenerating,
  onSave,
  onAiGenerate,
  onSuggestOrder,
  onSuggestParallelOrder,
  nameInputRef,
}: QuickCreateObjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[500px] h-[min(92vh,820px)] max-h-[92vh] min-h-0 flex flex-col p-0 rounded-none border-none shadow-2xl overflow-hidden bg-white">
        <DialogHeader className="p-5 pb-2 shrink-0 border-b border-slate-50 bg-white/30">
          <DialogTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> NOVO CADASTRO DE OBJETO MESTRE
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y">
          <form onSubmit={(e) => onSave(e)} id="quick-create-form">
            <div className="space-y-4 px-6 py-6">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4 space-y-1">
                  <div className="flex items-center h-5 ml-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Database className="w-2.5 h-2.5 text-SkyBlue-500" /> NOME DO OBJETO
                    </label>
                  </div>
                  <input
                    type="text"
                    ref={nameInputRef}
                    placeholder="EX: PARCEIRO"
                    value={quickFormData.name}
                    onChange={(e) => onFormChange({ name: e.target.value.toUpperCase() })}
                    className="flex h-8 w-full bg-transparent border border-slate-300 px-3 py-1 text-[10px] focus:ring-2 focus:ring-SkyBlue-500/40 focus:border-transparent outline-hidden font-normal text-center transition-all rounded-none cursor-text relative z-[1]"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <div className="flex items-center h-5 ml-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Box className="w-2.5 h-2.5 text-SkyBlue-500" /> GRUPO CARGA
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="G1"
                    value={quickFormData.chargeGroup}
                    onChange={(e) => onFormChange({ chargeGroup: e.target.value.toUpperCase() })}
                    className="flex h-8 w-full bg-transparent border border-slate-300 px-3 py-1 text-[10px] focus:ring-2 focus:ring-SkyBlue-500/40 focus:border-transparent outline-hidden font-normal text-center transition-all rounded-none cursor-text relative z-[1]"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <div className="flex justify-between items-center h-5 ml-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Hash className="w-2.5 h-2.5 text-slate-500" /> ORDEM CARGA
                    </label>
                    <button type="button" onClick={() => onSuggestOrder(quickFormData.chargeGroup, 'quick')} className="text-slate-600 hover:text-slate-900 transition-all active:scale-95" title="Sugerir próxima sequência">
                      <PlusCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="01.00"
                    maxLength={5}
                    value={quickFormData.chargeOrder}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      const fmt = digits.length > 2 ? digits.slice(0, 2) + '.' + digits.slice(2) : digits;
                      onFormChange({ chargeOrder: fmt });
                    }}
                    className={cn(
                      "flex h-8 w-full bg-transparent border px-3 py-1 text-[10px] outline-hidden font-normal text-center transition-all rounded-none cursor-text relative z-[1]",
                      quickFormData.chargeOrder && !isValidSequence(quickFormData.chargeOrder)
                        ? "border-red-400 ring-2 ring-red-400 focus:ring-2 focus:ring-red-400 focus:border-red-400"
                        : "border-slate-300 focus:ring-2 focus:ring-slate-500/40 focus:border-transparent",
                    )}
                  />
                </div>

                <div className="sm:col-span-12 space-y-1">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Split className="w-2.5 h-2.5 text-emerald-500" /> ORDEM PARALELISMO
                    </label>
                    <button type="button" onClick={() => onSuggestParallelOrder(quickFormData.chargeGroup, 'quick')} className="text-emerald-600 hover:text-emerald-700 transition-all active:scale-95" title="Sugerir próxima ordem paralela">
                      <PlusCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="01.00"
                    maxLength={5}
                    value={quickFormData.parallelOrder}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      const fmt = digits.length > 2 ? digits.slice(0, 2) + '.' + digits.slice(2) : digits;
                      onFormChange({ parallelOrder: fmt });
                    }}
                    className={cn(
                      "flex h-8 w-full bg-transparent border px-3 py-1 text-[10px] outline-hidden font-normal text-center transition-all rounded-none cursor-text relative z-[1]",
                      quickFormData.parallelOrder && !isValidSequence(quickFormData.parallelOrder)
                        ? "border-red-400 ring-2 ring-red-400 focus:ring-2 focus:ring-red-400 focus:border-red-400"
                        : "border-emerald-300 focus:ring-2 focus:ring-emerald-500/40 focus:border-transparent",
                    )}
                  />
                  <p className="text-[7.5px] text-slate-400 ml-1 leading-relaxed">Primeiros 2 dígitos = grupo paralelo · Ex: 01.00, 01.01, 01.02 executam no mesmo grupo</p>
                </div>

                <div className="sm:col-span-12 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-2.5 h-2.5 text-SkyBlue-500" /> STATUS
                  </label>
                  <select
                    value={quickFormData.status}
                    onChange={(e) => onFormChange({ status: e.target.value })}
                    className="flex h-8 w-full bg-transparent border border-slate-300 px-3 py-1 text-[10px] focus:ring-2 focus:ring-SkyBlue-500/40 focus:border-transparent outline-hidden font-normal uppercase transition-all rounded-none appearance-none cursor-pointer relative z-[1]"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DESCRIÇÃO TÉCNICA E FINALIDADE</label>
                  <Button type="button" variant="ghost" size="sm" className="h-5 px-2 text-[10px] font-bold uppercase gap-1.5 border hover:bg-SkyBlue-100 transition-all" onClick={onAiGenerate} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin text-current" /> : <Sparkles className="w-3 h-3 text-current" />} <span>SUGESTÃO IA</span>
                  </Button>
                </div>
                <textarea
                  placeholder="DESCREVA A FINALIDADE TÉCNICA DO OBJETO..."
                  value={quickFormData.description}
                  onChange={(e) => onFormChange({ description: e.target.value.toUpperCase() })}
                  className="flex min-h-[100px] w-full bg-transparent border border-slate-300 px-3 py-2 text-[10px] focus:ring-2 focus:ring-SkyBlue-500/40 focus:border-transparent outline-hidden font-normal text-left transition-all rounded-none resize-none cursor-text relative z-[1]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Network className="w-2.5 h-2.5 text-amber-500" /> DEPENDÊNCIAS EXTERNAS (OBRIGATÓRIAS)
                </label>
                <textarea
                  placeholder="UM OBJETO POR LINHA... EX: OBJETO_SAP_01"
                  className="flex min-h-[80px] w-full bg-transparent border border-amber-300/80 px-3 py-2 text-[10px] focus:ring-2 focus:ring-amber-500/40 focus:border-transparent outline-hidden font-normal text-left transition-all rounded-none resize-none cursor-text relative z-[1]"
                  value={quickFormData.externalDependencies?.join('\n') || ''}
                  onChange={(e) =>
                    onFormChange({
                      externalDependencies: e.target.value
                        .toUpperCase()
                        .split("\n")
                        .filter((s) => s.trim() !== ""),
                    })
                  }
                />
                <p className="text-[7.5px] text-slate-400 ml-1 leading-relaxed uppercase">Informe objetos externos que devem ser executados antes deste. Um por linha.</p>
              </div>

              <div className="p-4 bg-amber-50/50 border border-amber-100/50 rounded-none space-y-2">
                <p className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-2"><AlertCircle className="w-3 h-3" /> Atenção ao Cadastro Mestre</p>
                <p className="text-[10px] font-medium text-amber-600/80 leading-relaxed uppercase">Este objeto será disponibilizado globalmente para todos os projetos do Migration Manager.</p>
              </div>
            </div>
          </form>
        </div>
        <DialogFooter className="px-5 py-4 border-t bg-white/50 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold uppercase text-[10px] tracking-widest h-9 px-4 border text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95">
            FECHAR
          </Button>
          <div className="flex flex-wrap items-center gap-2 justify-end flex-1">
            <Button type="button" variant="outline" onClick={() => onSave(undefined, true)} className="font-bold uppercase text-[10px] tracking-widest h-9 px-4 bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95 border-none shadow-xs">
              SALVAR E CONTINUAR
            </Button>
            <Button type="submit" form="quick-create-form" variant="outline" className="font-bold uppercase text-[10px] tracking-widest h-9 px-6 bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95 gap-2 border-none">
              SALVAR
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
