"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUpDown, ChevronRight, Database, Hash, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { compareSequences, normalizeSeqForDisplay } from "@/lib/migration/sequence-utils";

interface MasterObject {
  id: string;
  name: string;
  chargeGroup?: string;
  chargeOrder?: string | number;
}

// ── Reset Sequence Dialog ─────────────────────────────────────────────────────

interface ResetSequenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyCurrent: () => void;
  onFullClear: () => void;
}

export function ResetSequenceDialog({ open, onOpenChange, onApplyCurrent, onFullClear }: ResetSequenceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-none border-none p-0 overflow-hidden shadow-2xl bg-white">
        <DialogHeader className="p-0">
          <div className="flex items-center gap-3 text-slate-700 px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-slate-100">
              <RefreshCw className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Reiniciar Sequência de Carga</DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Escolha como deseja reiniciar as sequências</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="p-6 space-y-3">
          <div className="border border-SkyBlue-200 bg-SkyBlue-50/40 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-SkyBlue-700 flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5" /> Opção 1 — Atualizar com Posição Atual
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
              Atribui novos valores de ORDEM (01.00, 02.00...) com base na posição visual atual dos cards. O campo de paralelismo <span className="text-SkyBlue-600">não é alterado</span>.
            </p>
            <Button onClick={onApplyCurrent} className="w-full mt-1 font-black text-[10px] uppercase tracking-widest bg-SkyBlue-600 hover:bg-SkyBlue-700 text-white h-9 shadow-xs transition-all active:scale-95 rounded-none border-0">
              ATUALIZAR COM POSIÇÃO ATUAL
            </Button>
          </div>
          <div className="border border-red-200 bg-red-50/40 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Opção 2 — Reset Completo
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
              Limpa <span className="text-red-600">todos</span> os campos ORDEM, Grupo e Paralelismo de todos os objetos. Esta ação não pode ser desfeita.
            </p>
            <Button onClick={onFullClear} className="w-full mt-1 font-black text-[10px] uppercase tracking-widest bg-slate-700 hover:bg-red-700 text-white h-9 shadow-xs shadow-red-500/20 transition-all active:scale-95 rounded-none border-0 [&_svg]:text-white">
              RESET COMPLETO (IRREVERSÍVEL)
            </Button>
          </div>
        </div>
        <DialogFooter className="bg-slate-50 border-t p-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full font-black text-[10px] uppercase tracking-widest h-9 text-slate-500 hover:bg-white transition-all active:scale-95 border-0">CANCELAR</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Migration Dialog ──────────────────────────────────────────────────────────

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMigrating: boolean;
  objectsToConvert: number;
  onMigrate: () => void;
}

export function MigrationDialog({ open, onOpenChange, isMigrating, objectsToConvert, onMigrate }: MigrationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isMigrating) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[420px] p-0 rounded-none border-none shadow-2xl bg-white overflow-hidden">
        <DialogHeader className="p-5 border-b border-slate-100 bg-amber-50">
          <DialogTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 flex items-center gap-2">
            <Hash className="w-3.5 h-3.5" /> Migrar Sequências para XX.XX
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">
            Converte todos os valores antigos (ex: 1, 2, 3) para o novo formato (01.00, 02.00, 03.00)
          </DialogDescription>
        </DialogHeader>
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-100 p-4 space-y-2 text-[10px] font-bold text-slate-600 uppercase tracking-wide leading-relaxed">
            <p>• Objetos já no formato XX.XX <span className="text-emerald-600">não serão alterados</span>.</p>
            <p>• A ordem relativa atual <span className="text-slate-900">será preservada</span>.</p>
            <p>• Sequência 1 → <span className="font-black text-slate-900">01.00</span>, 2 → <span className="font-black text-slate-900">02.00</span>, etc.</p>
            <p>• Objetos sem sequência <span className="text-slate-400">permanecem sem sequência</span>.</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-3 text-[10px] font-black text-amber-700 uppercase tracking-wide">
            {objectsToConvert} OBJETO(S) SERÃO CONVERTIDOS
          </div>
        </div>
        <DialogFooter className="bg-slate-50 border-t p-4 flex gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isMigrating} className="flex-1 font-black text-[10px] uppercase tracking-widest border-none h-10 text-slate-500 hover:bg-white transition-all active:scale-95">CANCELAR</Button>
          <Button onClick={onMigrate} disabled={isMigrating} className="flex-1 font-black text-[10px] uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-white h-10 shadow-lg shadow-amber-500/20 transition-all active:scale-95 border-none gap-2">
            {isMigrating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> MIGRANDO...</> : "CONFIRMAR MIGRAÇÃO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Successor Dialog ──────────────────────────────────────────────────────────

interface SuccessorDialogProps {
  successorDialogObject: MasterObject | null;
  onClose: () => void;
  successorSearch: string;
  onSearchChange: (s: string) => void;
  objects: MasterObject[];
  onSelectSuccessor: (target: MasterObject) => void;
}

export function SuccessorDialog({ successorDialogObject, onClose, successorSearch, onSearchChange, objects, onSelectSuccessor }: SuccessorDialogProps) {
  const filtered = objects
    .filter(o => o.id !== successorDialogObject?.id && o.name.toUpperCase().includes(successorSearch))
    .sort((a, b) => compareSequences(a.chargeOrder, b.chargeOrder));

  return (
    <Dialog open={!!successorDialogObject} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[420px] p-0 rounded-none border-none shadow-2xl bg-white overflow-hidden">
        <DialogHeader className="p-5 border-b border-slate-100 bg-violet-50">
          <DialogTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700 flex items-center gap-2">
            <ChevronRight className="w-3.5 h-3.5" /> Definir Próximo Card
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mt-1">
            Escolha qual objeto deve vir imediatamente após <span className="text-violet-700">{successorDialogObject?.name}</span> na sequência de execução.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              autoFocus
              placeholder="PESQUISAR OBJETO..."
              className="pl-9 h-9 text-[10px] font-black uppercase tracking-widest rounded-none border-slate-200 focus-visible:ring-violet-400"
              value={successorSearch}
              onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-[340px] divide-y divide-slate-50">
          {filtered.map(o => (
            <button
              key={o.id}
              className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-violet-50 transition-colors text-left group"
              onClick={() => successorDialogObject && onSelectSuccessor(o)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1 bg-SkyBlue-50 rounded-none shrink-0 group-hover:bg-violet-100 transition-colors">
                  <Database className="w-3 h-3 text-SkyBlue-500 group-hover:text-violet-500 transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-slate-800 truncate leading-none mb-0.5">{o.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{o.chargeGroup || "G"} · {normalizeSeqForDisplay(o.chargeOrder)}</p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 shrink-0 transition-colors" />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">Nenhum objeto encontrado.</div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <Button variant="ghost" onClick={onClose} className="w-full h-8 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white rounded-none border-0">
            CANCELAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
