import React, { useMemo, useRef, useState } from "react";
import { CardContent } from "@/components/ui/card";
import {
  Database,
  Timer,
  History,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { formatNumber, formatPercentage, renderDuration, formatSecondsToHM } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { MigrationResultChart } from "./MigrationResultChart";
import { PerformanceComparisonChart } from "./PerformanceComparisonChart";
import { AiPerformanceAnalysisDialog } from "./ai-performance-analysis-dialog";

import type { AggregatedObject, Mock } from "@/types/migration";

/** Mesma grade nos dois blocos em todos os breakpoints: 1 coluna abaixo de lg; a partir de lg: gráfico 1fr + lateral 240–280px (idêntico em performance e comparativa). */
const DASHBOARD_CHART_PAIR_GRID =
  "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-stretch";

interface DashboardChartsProps {
  aggregatedPerformance: AggregatedObject[];
  allMocks: Mock[] | null | undefined;
  isResultsVisible: boolean;
  isComparisonVisible: boolean;
  previousMockId: string | null;
  effectiveMockId: string | null;
  totals: { total: number } | null;
  objectStats: {
    total: number;
    totalRecords: number;
    totalDurationMs: number;
    loaded: number;
    inProgress: number;
  } | null;
}

export const DashboardCharts = ({
  aggregatedPerformance,
  allMocks,
  isResultsVisible,
  isComparisonVisible,
  previousMockId,
  effectiveMockId,
  totals,
  objectStats,
}: DashboardChartsProps) => {
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState(false);
  const [performanceChartSearch, setPerformanceChartSearch] = useState("");
  const chartScrollRef = useRef<HTMLDivElement>(null);

  const performanceComparisonData = useMemo(() => {
    return aggregatedPerformance.map(obj => {
      const history = obj.history || [];
      const histA = history.find(h => h.mockId === previousMockId);
      const histB = history.find(h => h.mockId === effectiveMockId);

      const mockADurRaw = histA?.duracaoMs ? histA.duracaoMs / 1000 : 0;
      const mockBDurRaw = histB?.duracaoMs
        ? histB.duracaoMs / 1000
        : (obj.currentChargeDurationMs || 0) / 1000;

      const mockADur = mockADurRaw > 0 ? Math.max(60, mockADurRaw) : 0;
      const mockBDur = mockBDurRaw > 0 ? Math.max(60, mockBDurRaw) : 0;

      let variation = 0;
      if (mockADur > 0 && mockBDur > 0) {
        variation = ((mockBDur - mockADur) / mockADur) * 100;
      } else if (mockADur === 0 && mockBDur > 0) {
        variation = 100;
      } else if (mockADur > 0 && mockBDur === 0) {
        variation = -100;
      }

      return {
        name: obj.name,
        mockA: Number(mockADur.toFixed(1)),
        mockB: Number(mockBDur.toFixed(1)),
        variation: Number(variation.toFixed(0)),
        isImprovement: variation < 0,
      };
    });
  }, [aggregatedPerformance, previousMockId, effectiveMockId]);

  const lineComparisonData = useMemo(() => {
    return performanceComparisonData
      .filter(d => d.mockA > 0 || d.mockB > 0)
      .map(d => ({
        ...d,
        mockA_log: d.mockA > 0 ? Math.log10(d.mockA * 1000) : 0,
        mockB_log: d.mockB > 0 ? Math.log10(d.mockB * 1000) : 0,
      }));
  }, [performanceComparisonData]);

  const filteredLineComparisonData = useMemo(() => {
    const q = performanceChartSearch.trim().toUpperCase();
    if (!q) return lineComparisonData;
    return lineComparisonData.filter((d) => d.name.toUpperCase().includes(q));
  }, [lineComparisonData, performanceChartSearch]);

  const handleVariationClick = (name: string) => {
    if (!chartScrollRef.current) return;
    const scrollData = performanceChartSearch.trim()
      ? filteredLineComparisonData
      : lineComparisonData;
    const idx = scrollData.findIndex((d) => d.name === name);
    if (idx < 0) return;
    const itemWidth = 90;
    const containerWidth = chartScrollRef.current.clientWidth;
    const scrollLeft = idx * itemWidth - containerWidth / 2 + itemWidth / 2;
    chartScrollRef.current.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
  };

  const comparisonLabels = useMemo(() => {
    const mockA = allMocks?.find((m) => m.id === previousMockId);
    const mockB = allMocks?.find((m) => m.id === effectiveMockId);
    return {
      mockA: mockA?.name || "Mock Anterior",
      mockB: mockB?.name || "Mock Atual",
    };
  }, [allMocks, previousMockId, effectiveMockId]);

  const chartConfig = {
    sucesso: { label: "Sucesso", color: "#107e3e" },
    erro: { label: "Erro", color: "#bb0000" },
    mockB: { label: comparisonLabels.mockB, color: "#107e3e" },
    mockA: { label: comparisonLabels.mockA, color: "#e9730c" },
  };

  const currentMock = useMemo(() =>
    allMocks?.find(m => m.id === effectiveMockId),
    [allMocks, effectiveMockId]
  );
  const isMockFinalized = currentMock?.status === 'FINALIZADA' || currentMock?.status === 'CARGA_CONCLUIDA';

  const totalDurationMsDisplay = objectStats?.totalDurationMs || 0;
  const loadedPct = objectStats?.total ? (objectStats.loaded / objectStats.total) * 100 : 0;
  const inProgressPct = objectStats?.total ? (objectStats.inProgress / objectStats.total) * 100 : 0;

  return (
    <div className="fiori-dashboard-charts space-y-10">
      {isResultsVisible && (
        <div className={DASHBOARD_CHART_PAIR_GRID}>
          <div className="min-w-0">
            <MigrationResultChart
              aggregatedPerformance={aggregatedPerformance}
              chartConfig={chartConfig}
              variant="fiori"
            />
          </div>

          <div className="min-w-0 w-full space-y-4 h-full flex flex-col">
            <EngineeringReferenceTable
              rows={[
                { param: "Mocks", value: totals?.total || 0, unit: "—" },
                { param: "Objetos", value: objectStats?.total || 0, unit: "un." },
                {
                  param: "Volume total",
                  value: `${!isMockFinalized ? "(P) " : ""}${formatNumber(objectStats?.totalRecords || 0, false)}`,
                  unit: "reg.",
                },
                {
                  param: "Tempo total",
                  value: renderDuration(totalDurationMsDisplay),
                  unit: "t",
                },
                {
                  param: "Andamento consolidado",
                  value: `${formatPercentage(loadedPct)}%`,
                  unit: "%",
                },
                {
                  param: "Objetos c/ carga",
                  value: `${(objectStats?.loaded || 0) + (objectStats?.inProgress || 0)} / ${objectStats?.total || 0}`,
                  unit: "obj.",
                },
              ]}
              progress={{ loadedPct, inProgressPct }}
            />
          </div>
        </div>
      )}

      {isComparisonVisible && (
        <div className={cn(DASHBOARD_CHART_PAIR_GRID, "fiori-dashboard-chart-pair")}>
          <div className="min-w-0">
            <PerformanceComparisonChart
              lineComparisonData={filteredLineComparisonData}
              totalDataCount={lineComparisonData.length}
              searchTerm={performanceChartSearch}
              onSearchChange={setPerformanceChartSearch}
              chartConfig={chartConfig}
              comparisonLabels={comparisonLabels}
              chartScrollRef={chartScrollRef}
              variant="fiori"
            />
          </div>

          <div className="min-w-0 w-full space-y-6 flex flex-col">
            <VariationsList
              performanceComparisonData={performanceComparisonData}
              onVariationClick={handleVariationClick}
              onOpenAiAnalysis={() => setIsAiAnalysisOpen(true)}
            />

            <MockLegend labels={comparisonLabels} />
          </div>
        </div>
      )}

      <AiPerformanceAnalysisDialog
        open={isAiAnalysisOpen}
        onOpenChange={setIsAiAnalysisOpen}
        mockReference={comparisonLabels.mockA}
        mockTarget={comparisonLabels.mockB}
        data={performanceComparisonData.map(d => {
            const obj = aggregatedPerformance.find(o => o.name === d.name);
            const history = obj?.history || [];
            const histRef = history.find(h => h.mockId === previousMockId);
            const histTarget = history.find(h => h.mockId === effectiveMockId);

            return {
                name: d.name,
                durationRef: d.mockA * 1000,
                durationTarget: d.mockB * 1000,
                successRef: histRef?.sucesso ?? 0,
                successTarget: histTarget?.sucesso ?? (obj?.successfulRecordsCount ?? 0),
                errorRef: histRef?.erro ?? 0,
                errorTarget: histTarget?.erro ?? (obj?.errorRecordsCount ?? 0),
            };
        })}
      />
    </div>
  );
};

interface ReferenceTableRow {
  param: string;
  value: React.ReactNode;
  unit: string;
  valueClassName?: string;
}

function EngineeringReferenceTable({
  rows,
  progress,
}: {
  rows: ReferenceTableRow[];
  progress?: { loadedPct: number; inProgressPct: number };
}) {
  return (
    <div className="fiori-ref-table flex-1">
      <div className="fiori-ref-table__title-bar">
        <div className="fiori-ref-table__title-block">
          <span className="fiori-ref-table__drawing-label">Ref.</span>
          <span className="fiori-ref-table__title">Consolidado</span>
        </div>
      </div>
      <div className="fiori-ref-table__frame">
        <table className="fiori-ref-table__grid">
          <thead>
            <tr>
              <th scope="col">Parâmetro</th>
              <th scope="col">Valor</th>
              <th scope="col">Unid.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.param}>
                <th scope="row" className="fiori-ref-table__param">{row.param}</th>
                <td className={cn("fiori-ref-table__value", row.valueClassName)}>{row.value}</td>
                <td className="fiori-ref-table__unit">{row.unit}</td>
              </tr>
            ))}
          </tbody>
          {progress && (
            <tfoot>
              <tr>
                <td colSpan={3} className="fiori-ref-table__progress-cell">
                  <div className="fiori-ref-table__progress-header">
                    <span className="fiori-ref-table__progress-title">Andamento</span>
                    <span className="fiori-ref-table__progress-pct">
                      {formatPercentage(progress.loadedPct)}%
                    </span>
                  </div>
                  <div
                    className="fiori-ref-table__progress-track"
                    role="progressbar"
                    aria-valuenow={Math.round(progress.loadedPct + progress.inProgressPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Andamento consolidado da carga"
                  >
                    {progress.loadedPct > 0 && (
                      <div
                        className="fiori-ref-table__progress-bar--loaded"
                        style={{ width: `${progress.loadedPct}%` }}
                      />
                    )}
                    {progress.inProgressPct > 0 && (
                      <div
                        className="fiori-ref-table__progress-bar--active"
                        style={{ width: `${progress.inProgressPct}%` }}
                      />
                    )}
                  </div>
                  <div className="fiori-ref-table__progress-legend">
                    <span><i className="fiori-ref-table__swatch fiori-ref-table__swatch--loaded" />Concluído</span>
                    <span><i className="fiori-ref-table__swatch fiori-ref-table__swatch--active" />Em andamento</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

interface VariationsListProps {
  performanceComparisonData: Array<{
    name: string;
    mockA: number;
    mockB: number;
    variation: number;
    isImprovement: boolean;
  }>;
  onVariationClick: (name: string) => void;
  onOpenAiAnalysis: () => void;
}

const VariationsList = ({ performanceComparisonData, onVariationClick, onOpenAiAnalysis }: VariationsListProps) => {
  const items = performanceComparisonData.length > 0
    ? performanceComparisonData
        .filter((obj) => obj.variation !== 0)
        .sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation))
    : [];

  return (
    <div className="fiori-list-panel">
      <div className="fiori-list-panel__header">
        <h4 className="fiori-list-panel__title">
          <span className="fiori-list-panel__title-icon">
            <Database className="w-3.5 h-3.5" />
          </span>
          <span>Top variações (%)</span>
        </h4>
        <button type="button" onClick={onOpenAiAnalysis} className="fiori-ai-btn" title="Análise de performance com IA">
          <Sparkles className="w-3 h-3 shrink-0" aria-hidden />
          Análise IA
        </button>
      </div>
      <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
        {items.length > 0 ? items.map((obj, idx) => (
          <div key={idx} className="fiori-list-panel__item" onClick={() => onVariationClick(obj.name)}>
            <div className="flex flex-col gap-0.5 max-w-[65%] min-w-0">
              <span className="fiori-list-panel__item-name truncate">{obj.name}</span>
              <span className="fiori-list-panel__item-meta">
                Ref: {formatSecondsToHM(obj.mockA)} → {formatSecondsToHM(obj.mockB)}
              </span>
            </div>
            <div className={cn(
              "fiori-variation-badge",
              obj.isImprovement ? "fiori-variation-badge--positive" : (obj.variation === 0 ? "fiori-variation-badge--neutral" : "fiori-variation-badge--negative")
            )}>
              {obj.isImprovement ? <TrendingUp className="w-3 h-3 rotate-180" /> : (obj.variation === 0 ? <Timer className="w-3 h-3" /> : <TrendingDown className="w-3 h-3 rotate-180" />)}
              {Math.abs(obj.variation)}%
            </div>
          </div>
        )) : (
          <div className="fiori-list-panel__empty">Sem dados.</div>
        )}
      </div>
    </div>
  );
};

interface MockLegendProps {
  labels: { mockA: string; mockB: string };
}

const MockLegend = ({ labels }: MockLegendProps) => (
  <div className="fiori-legend-panel">
    <div className="fiori-legend-panel__header">
      <h4 className="fiori-legend-panel__title">
        <History className="w-3.5 h-3.5" />
        Legenda de mocks
      </h4>
    </div>
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="fiori-legend-panel__dot fiori-legend-panel__dot--reference" />
        <div className="flex flex-col min-w-0">
          <span className="fiori-legend-panel__label">Referência</span>
          <span className="fiori-legend-panel__value truncate">{labels.mockA}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="fiori-legend-panel__dot fiori-legend-panel__dot--target" />
        <div className="flex flex-col min-w-0">
          <span className="fiori-legend-panel__label">Alvo</span>
          <span className="fiori-legend-panel__value truncate">{labels.mockB}</span>
        </div>
      </div>
    </CardContent>
  </div>
);
