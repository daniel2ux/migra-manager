
import React, { useState } from "react";
import { useUser } from "@/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    Zap, 
    ChevronRight, 
    AlertCircle, 
    CheckCircle2, 
    Lightbulb,
    BrainCircuit
} from "lucide-react";


interface AiPerformanceAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mockReference: string;
  mockTarget: string;
  data: any[]; // The statistics data
}

export const AiPerformanceAnalysisDialog = ({
  open,
  onOpenChange,
  mockReference,
  mockTarget,
  data,
}: AiPerformanceAnalysisDialogProps) => {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const callerToken = await user?.getIdToken();
      if (!callerToken) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      const response = await fetch("/api/ai/performance-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceMockName: mockReference,
          targetMockName: mockTarget,
          objects: data,
          callerToken,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Erro na análise.");
      setResult(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [mockReference, mockTarget, data, user]);

  React.useEffect(() => {
    if (open && !result && !isLoading) {
      runAnalysis();
    }
  }, [open, result, isLoading, runAnalysis]);

  return (
    <Dialog preserveDashboardScroll open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open} className="max-w-2xl bg-white/95 backdrop-blur-md border-slate-200 p-0 overflow-hidden rounded-none shadow-2xl">
        <div className="h-1.5 w-full bg-linear-to-r from-SkyBlue-400 via-indigo-500 to-violet-500" />
        
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-SkyBlue-500 p-2 rounded-lg shadow-lg shadow-SkyBlue-200">
                <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
                <DialogTitle className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                    Analista de Performance IA
                </DialogTitle>
                <DialogDescription className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
                    Insights comparativos entre {mockReference} e {mockTarget}
                </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-SkyBlue-500" />
                <Zap className="w-5 h-5 text-SkyBlue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Processando Metadados...</p>
                <p className="text-[10px] text-slate-400">Gemini está analisando tendências e identificando gargalos.</p>
              </div>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-red-50 border border-red-100 p-8">
              <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
              <p className="text-xs font-bold text-red-700 uppercase tracking-widest">{error}</p>
              <Button 
                variant="ghost" 
                onClick={runAnalysis}
                className="mt-4 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 text-red-600"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : result ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Summary Section */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> RESUMO EXECUTIVO
                </h4>
                <div className="text-xs text-slate-600 leading-relaxed space-y-4 font-medium italic border-l-2 border-slate-100 pl-4">
                  {result.summary.split('\n').map((para: string, i: number) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bottlenecks */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" /> GARGALOS (ATENÇÃO)
                  </h4>
                  <ul className="space-y-2">
                    {result.bottlenecks.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600 group">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0 group-hover:text-red-400 transition-colors" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> MELHORIAS
                  </h4>
                  <ul className="space-y-2">
                    {result.improvements.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600 group">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0 group-hover:text-emerald-400 transition-colors" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-slate-50 border border-slate-100 p-5 space-y-4 shadow-inner">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5" /> RECOMENDAÇÕES TÉCNICAS
                </h4>
                <ul className="grid grid-cols-1 gap-3">
                  {result.recommendations.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 bg-white p-3 border border-slate-100 text-[11px] text-slate-700 shadow-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between sm:justify-between">
            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Powered by Genkit + Gemini 1.5</p>
            <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="h-8 text-[10px] font-black uppercase tracking-widest rounded-none border-0 hover:bg-slate-200"
            >
                Fechar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
