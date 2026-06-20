"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useActiveProjectId } from '@/hooks/use-active-project-id';
import { ArrowLeft, Box, Calendar, Clock, Database, Gauge, BarChart, CheckCircle2, Loader2, Info, History } from 'lucide-react';
import { useDb } from '@/supabase';
import { doc, getDoc } from '@/supabase/compat-db-shim';
import { MigrationObject } from '@/types/migration';
import { formatNumber, formatDateTime, renderDuration, formatPercentage } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function ObjectDetailsClient() {
  const { mockId, objectId } = useParams() as { mockId: string, objectId: string };
  const { projectId: activeProjectId } = useActiveProjectId();
  const projectId = activeProjectId;
  const router = useRouter();
  const db = useDb();

  const [obj, setObj] = useState<MigrationObject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !db) {
      if (!projectId) router.push('/projetos');
      return;
    }

    const fetchObj = async () => {
      try {
        let actualMockId = mockId;
        
        // Daniel: If mockId looks like a slug (has hyphens), resolve it first
        if (mockId.includes('-')) {
          const { query, collection, where, getDocs } = await import('@/supabase/compat-db-shim');
          const mockQuery = query(collection(db, "projects", projectId, "mocks"), where("slug", "==", mockId));
          const mockSnap = await getDocs(mockQuery);
          if (!mockSnap.empty) {
            actualMockId = mockSnap.docs[0].id;
          }
        }

        const objRef = doc(db, "projects", projectId, "mocks", actualMockId, "migrationObjects", objectId);
        const objSnap = await getDoc(objRef);

        if (objSnap.exists()) {
          const data = objSnap.data() as unknown as MigrationObject;
          data.id = objSnap.id;
          setObj(data);
        } else {
          setObj(null);
        }
      } catch (err) {
        console.error(err);
        setObj(null);
      } finally {
        setLoading(false);
      }
    };

    fetchObj();
  }, [projectId, mockId, objectId, router, db]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="w-8 h-8 text-SkyBlue-500 animate-spin" />
      </div>
    );
  }

  if (!obj) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 flex-col gap-4">
        <Info className="w-10 h-10 text-slate-300" />
        <h2 className="text-sm font-black text-slate-500 uppercase">Objeto não encontrado</h2>
        <Link href={`/objetos/${mockId}`}>
          <span className="text-SkyBlue-500 text-xs font-bold uppercase hover:underline">
            Voltar para a Mock
          </span>
        </Link>
      </div>
    );
  }

  const target = Number(obj.targetRecordsCount) || 0;
  const processed = Number(obj.processedRecordsCount) || 0;
  const error = Number(obj.errorRecordsCount) || 0;
  const success = Math.max(0, processed - error);
  const successPct = target > 0 ? (success / target) * 100 : 0;
  const errorPct = target > 0 ? (error / target) * 100 : 0;
  const processedPct = target > 0 ? (processed / target) * 100 : 0;

  return (
    <div className="flex flex-col flex-1 bg-slate-50 min-h-full">
      <div className="flex flex-col sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="h-16 px-4 md:px-8 flex items-center gap-4">
          <Link href={`/objetos/${mockId}`}>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </div>
          </Link>
          <div className="flex flex-col flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 truncate">
              <Database className="w-5 h-5 text-SkyBlue-500 shrink-0" /> <span className="truncate">{obj.name}</span>
            </h1>
            <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest leading-none truncate mt-0.5">
              Gestão Individual do Objeto
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* Main Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-none border-t-4 border-t-SkyBlue-500 border-x-slate-200 border-b-slate-200 shadow-xs bg-white hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardDescription className="text-[10px] font-black text-SkyBlue-600 uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                <Gauge className="w-3.5 h-3.5" /> Andamento Lógico
              </CardDescription>
              <CardTitle className="text-2xl font-black text-slate-800 uppercase mt-1">
                {formatPercentage(processedPct, 'default')}% Lido
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="w-full h-2.5 bg-slate-100 rounded-none overflow-hidden flex border border-slate-100 shadow-inner">
                <div className="h-full bg-SkyBlue-500" style={{ width: `${processedPct}%` }} />
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-wide">
                <span className="text-slate-500">Target: <span className="text-slate-800">{formatNumber(target)}</span></span>
                <span className="text-slate-500">Proc: <span className="text-slate-800">{formatNumber(processed)}</span></span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-t-4 border-t-emerald-500 border-x-slate-200 border-b-slate-200 shadow-xs bg-white hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardDescription className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sucesso Estimado
              </CardDescription>
              <CardTitle className="text-2xl font-black text-emerald-600 uppercase mt-1">
                {formatPercentage(successPct, 'success')}% Eficiência
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="w-full h-2.5 bg-slate-100 rounded-none overflow-hidden flex border border-slate-100 shadow-inner">
                <div className="h-full bg-emerald-500" style={{ width: `${successPct}%` }} />
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-wide">
                <span className="text-slate-500">Sucessos Absolutos</span>
                <span className="text-emerald-700 font-black">{formatNumber(success)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-t-4 border-t-red-500 border-x-slate-200 border-b-slate-200 shadow-xs bg-white hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardDescription className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                <BarChart className="w-3.5 h-3.5" /> Avaliação de Qualidade
              </CardDescription>
              <CardTitle className="text-2xl font-black text-red-600 uppercase mt-1">
                {formatNumber(error)} Erros
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="w-full h-2.5 bg-slate-100 rounded-none overflow-hidden flex border border-slate-100 shadow-inner">
                <div className="h-full bg-red-500" style={{ width: `${errorPct}%` }} />
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-wide">
                <span className="text-slate-500">Proporção de Erro</span>
                <span className="text-red-700 font-black">{formatPercentage(errorPct, 'error')}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-none border-slate-200 shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <CardTitle className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Box className="w-4 h-4 text-SkyBlue-500" /> Detalhes Estruturais
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="px-6 py-4 flex flex-col gap-1 hover:bg-slate-50/50 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição Técnica</span>
                  <span className="text-sm font-medium text-slate-700 leading-relaxed">{obj.description || 'Nenhum detalhe técnico informado para este objeto.'}</span>
                </div>
                <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grupo Operacional / Ordem</span>
                  <Badge variant="outline" className="text-xs font-black uppercase rounded-none bg-slate-100 text-slate-700 border-none px-2py-1">
                    {obj.chargeGroup || '-'} / #{obj.chargeOrder?.toString().padStart(2, '0') || '00'}
                  </Badge>
                </div>
                <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Carga</span>
                  <Badge variant="outline" className={`text-xs font-black uppercase rounded-none px-2 py-1 shadow-xs border-none ${obj.status === 'CARGA_EM_ANDAMENTO' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : obj.status === 'CARGA_CONCLUIDA' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}`}>
                    {obj.status || 'PENDENTE'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-slate-200 shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <CardTitle className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-SkyBlue-500" /> Tempos e Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Inicialização</span>
                  <span className="text-sm font-bold text-slate-700">{formatDateTime(obj.chargeStartTime) || 'Não iniciado'}</span>
                </div>
                <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Término da Execução</span>
                  <span className="text-sm font-bold text-slate-700">{formatDateTime(obj.chargeEndTime) || '-'}</span>
                </div>
                <div className="px-6 py-5 flex justify-between items-center bg-slate-50 border-b-0 border-t-2 border-slate-100">
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Duração Consolidada</span>
                  <div className="bg-white px-3 py-1.5 border border-slate-200 shadow-xs">
                    <span className="text-base font-black tracking-tight text-SkyBlue-600 font-mono">
                      {renderDuration(obj.currentChargeDurationMs)}
                    </span>
                  </div>
                </div>
                <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors bg-white">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Histórico Ciclo Anterior</span>
                  <span className="text-xs font-bold text-slate-500 font-mono">{renderDuration(obj.previousChargeDurationMs)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
