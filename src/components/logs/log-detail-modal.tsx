"use client";

import { Terminal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MigrationLog } from "@/types/migration";

function fmtTs(ts: any): string {
  if (!ts?.toDate) return "—";
  try { return ts.toDate().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { return "—"; }
}

interface LogDetailModalProps {
  log: MigrationLog | null;
  open: boolean;
  onClose: () => void;
  mockMap: Record<string, string>;
}

export function LogDetailModal({ log, open, onClose, mockMap }: LogDetailModalProps) {
  if (!log) return null;
  const fields: [string, string][] = [
    ["ERRO ID", log.errorId || "—"], ["CÓD. ERRO", log.errorNumber || "—"], ["OBJECT", log.object],
    ["MOCK", mockMap[log.mock] || log.mock], ["INFOKEY", log.oldKey || log.infoKey || "—"],
    ["IMPORTADO EM", fmtTs(log.importedAt)], ["FILENAME", log.filename || "—"],
  ];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-none p-0 border-none shadow-2xl overflow-hidden bg-white">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2"><Terminal className="w-4 h-4 text-SkyBlue-500" /><DialogTitle className="text-[10px] font-black uppercase tracking-widest text-slate-900">Detalhe do Registro</DialogTitle></div>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {fields.map(([label, value]) => (
                <div key={label} className="bg-slate-100 border-0 shadow-inner p-2.5 space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                  <p className="text-[11px] font-mono text-slate-800 break-all leading-snug">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-100 border-0 shadow-inner p-2.5 space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MESSAGE</p>
              <p className="text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap wrap-break-word">{log.message || "—"}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
