"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUp, Upload, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isUploading: boolean;
  progress: number;
  finished: boolean;
  counts: { created: number; skipped: number };
  logs: { msg: string; type: "info" | "success" | "warning" | "error" }[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isDragging?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  terminalEndRef?: React.RefObject<HTMLDivElement | null>;
  onFinishClose?: () => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  isUploading,
  progress,
  finished,
  counts,
  logs,
  onFileSelect,
  fileInputRef,
  isDragging = false,
  onDragOver,
  onDragLeave,
  onDrop,
  terminalEndRef,
  onFinishClose,
}: ImportDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isUploading) {
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-[500px] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-white rounded-none">
        <DialogHeader className="p-6 pb-4 shrink-0 border-b border-slate-100 bg-white/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-SkyBlue-50 rounded-none">
              <FileUp className="w-4 h-4 text-SkyBlue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-900 truncate">
                {finished ? "IMPORTAÇÃO CONCLUÍDA" : isUploading ? "ANDAMENTO DA IMPORTAÇÃO" : "CARREGAR CATÁLOGO MESTRE"}
              </DialogTitle>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                {finished ? "RESUMO DO PROCESSO" : isUploading ? "PROCESSANDO DADOS..." : "ARRASTE OU SELECIONE O ARQUIVO"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
          {!isUploading && !finished ? (
            <div
              className={cn(
                "relative group cursor-pointer transition-all duration-300",
                "border-2 border-dashed rounded-none p-10 flex flex-col items-center justify-center gap-4 text-center",
                isDragging
                  ? "0 bg-SkyBlue-50/50 scale-[0.99]"
                  : " bg-white hover:border-SkyBlue-300 hover:bg-white hover:shadow-lg"
              )}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.txt"
                onChange={onFileSelect}
              />
              <div className={cn(
                "p-4 rounded-full transition-transform duration-300",
                isDragging ? "bg-SkyBlue-100 scale-110" : "bg-white shadow-xs group-hover:scale-110"
              )}>
                <Upload className={cn("w-8 h-8", isDragging ? "text-SkyBlue-600" : "text-slate-400")} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                  Clique ou arraste seu arquivo .csv/.txt
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Formatos suportados: CSV, TXT (Delimitado por vírgula ou ponto-e-vírgula)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {(isUploading || finished) && (
                <div className="space-y-2">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest">Progressão do Processamento</span>
                    <span className="text-xs font-black text-slate-900 tabular-nums">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5 bg-slate-100 border border-slate-100" />
                </div>
              )}

              {finished && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50/50 p-2.5 border /50 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest opacity-70">Criados</p>
                    <p className="text-lg font-black text-emerald-700 leading-none mt-1">{counts.created}</p>
                  </div>
                  <div className="bg-amber-50/50 p-2.5 border border-amber-100/50 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest opacity-70">Saltados</p>
                    <p className="text-lg font-black text-amber-700 leading-none mt-1">{counts.skipped}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Terminal className="w-3 h-3" /> Console de Saída
                  </div>
                  {isUploading && (
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-SkyBlue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1 h-1 bg-SkyBlue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1 h-1 bg-SkyBlue-400 rounded-full animate-bounce" />
                    </div>
                  )}
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 font-mono text-[10px] leading-relaxed shadow-2xl h-[200px] overflow-hidden flex flex-col group/terminal">
                  <ScrollArea className="flex-1 pr-2">
                    <div className="space-y-1">
                      {logs.map((log, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "break-all border-l-2 pl-3 py-0.5",
                            log.type === "info" ? "text-SkyBlue-400 border-SkyBlue-900/50" :
                              log.type === "success" ? "text-emerald-400 border-emerald-900/50" :
                                log.type === "warning" ? "text-amber-400 border-amber-900/50" :
                                  "text-red-400 border-red-900/50 font-black"
                          )}
                        >
                          <span className="opacity-30 mr-2 tabular-nums">
                            [{new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}]
                          </span>
                          {log.msg}
                        </div>
                      ))}
                      <div ref={terminalEndRef} />
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-white/50 flex gap-3 shrink-0">
          {finished ? (
            <Button
              variant="outline"
              className="w-full font-black uppercase text-[10px] tracking-widest h-11 hover: rounded-none shadow-xs transition-all active:scale-95"
              onClick={onFinishClose}
            >
              CONCLUIR E FECHAR
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full font-bold uppercase text-[10px] tracking-widest h-10 text-slate-500 hover:bg-red-50 hover:text-red-600 hover: rounded-none transition-all active:scale-95"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              {isUploading ? "PROCESSANDO..." : "CANCELAR"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
