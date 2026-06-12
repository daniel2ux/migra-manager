import React, { useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from "recharts";
import { TrendingUp, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { formatDurLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ChartPanelSearchField } from "./chart-panel-search-field";

interface PerformanceComparisonChartProps {
  lineComparisonData: any[];
  totalDataCount?: number;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  chartConfig: any;
  comparisonLabels: { mockA: string; mockB: string };
  chartScrollRef: React.RefObject<HTMLDivElement | null>;
  variant?: "default" | "fiori";
}

export const PerformanceComparisonChart = ({
  lineComparisonData,
  totalDataCount = 0,
  searchTerm = "",
  onSearchChange,
  chartConfig,
  comparisonLabels,
  chartScrollRef,
  variant = "default",
}: PerformanceComparisonChartProps) => {
  const isFiori = variant === "fiori";
  const tickFill = isFiori ? "#6a6d70" : "#64748b";
  const gridStroke = isFiori ? "#e5e5e5" : "#f1f5f9";
  const mockAStroke = isFiori ? "#e9730c" : "#f97316";
  const mockBStroke = isFiori ? "#107e3e" : "#10b981";
  const isDenseMode = lineComparisonData.length > 40;
  const showDetailedVariationDots = true;
  const isSearchActive = searchTerm.trim().length > 0;
  const isFilteredEmpty = isSearchActive && lineComparisonData.length === 0 && totalDataCount > 0;

  useEffect(() => {
    chartScrollRef.current?.scrollTo({ left: 0 });
  }, [searchTerm, chartScrollRef]);

  return (
    <Card className={cn(
      isFiori ? "fiori-analytical-card border-0 shadow-none flex flex-col" : "border-none shadow-xs bg-white rounded-none flex flex-col"
    )}>
      <div className={cn(
        isFiori ? "fiori-analytical-card__header" : "p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50"
      )}>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <h4 className={cn(
            isFiori ? "fiori-analytical-card__title" : "text-[9px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2"
          )}>
            {isFiori ? (
              <>
                <span className="fiori-analytical-card__title-icon">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
                <span>Painel de análise comparativa de performance</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3 h-3 text-emerald-500" /> Painel de Análise Comparativa de Performance
              </>
            )}
          </h4>
          <p className={cn(
            isFiori ? "fiori-analytical-card__subtitle" : "text-[8px] font-medium text-slate-400 uppercase tracking-tight"
          )}>
            Escala logarítmica aplicada para visualizar variações de tempo
            {isSearchActive && lineComparisonData.length > 0 && (
              <span className={isFiori ? "fiori-analytical-card__filter-meta" : "ml-2 text-slate-500 normal-case"}>
                · {lineComparisonData.length} de {totalDataCount} objetos
              </span>
            )}
          </p>
        </div>
        {onSearchChange && (
          <ChartPanelSearchField
            value={searchTerm}
            onSearchCommit={onSearchChange}
            isFiori={isFiori}
            ariaLabel="Buscar objeto no gráfico comparativo"
          />
        )}
      </div>
      <CardContent className={cn(isFiori ? "fiori-analytical-card__body p-0 flex-1 flex items-center" : "p-0 flex-1 flex items-center")}>
        {isFilteredEmpty ? (
          <div className={cn(
            "flex flex-col items-center justify-center w-full h-[350px] gap-2 px-6 text-center",
            isFiori ? "fiori-analytical-card__empty" : "text-slate-400"
          )}>
            <Search className={cn("opacity-40", isFiori ? "w-8 h-8" : "w-6 h-6")} />
            <p className={isFiori ? "text-sm font-normal text-[var(--fiori-label)]" : "text-[10px] font-medium italic"}>
              Nenhum objeto encontrado para &quot;{searchTerm.trim()}&quot;.
            </p>
          </div>
        ) : (
        <div className="flex w-full h-[350px] pt-8 pb-4">
          {/* Y-AXIS SIDEBAR (FIXED) */}
          <div className={cn(
            "w-[60px] h-full shrink-0 z-10 flex flex-col justify-center",
            isFiori ? "fiori-analytical-card__axis" : "bg-white border-r border-slate-50"
          )}>
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart
                data={lineComparisonData}
                margin={{ top: 5, right: 0, left: 15, bottom: 20 }}
              >
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tick={{ fill: tickFill, fontSize: 8, fontWeight: isFiori ? 600 : 700 }}
                    tickFormatter={(val: number) => {
                      if (val <= 0) return '0s';
                      const ms = Math.pow(10, val);
                      return formatDurLabel(ms / 1000);
                    }}
                  />
                <Line dataKey="mockA_log" hide />
                <Line dataKey="mockB_log" hide />
              </LineChart>
            </ChartContainer>
          </div>

          {/* SCROLLABLE CHART BODY */}
          <div
            ref={chartScrollRef}
            className="flex-1 h-full overflow-x-auto overflow-y-hidden pb-2 custom-scrollbar"
            style={{ paddingRight: '60px', contain: 'layout paint size' }}
          >
            <div style={{ minWidth: `${Math.max(800, lineComparisonData.length * 90)}px`, height: '100%' }}>
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart
                  data={lineComparisonData}
                  margin={{ top: 20, right: 10, left: 40, bottom: 0 }}
                >
                    <defs>
                      <linearGradient id="colorMockB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={mockBStroke} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={mockBStroke} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMockA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={mockAStroke} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={mockAStroke} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={gridStroke} verticalFill={isFiori ? ['#fff', '#fafafa'] : ['#fff', '#f8fafc']} fillOpacity={0.4} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: tickFill, fontSize: 8, fontWeight: isFiori ? 600 : 700 }}
                      interval={0}
                    />
                    <YAxis hide domain={[0, 'auto']} />
                    <ChartTooltip 
                      cursor={{ stroke: isFiori ? '#d9d9d9' : '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                      content={
                        <ChartTooltipContent
                          className="min-w-[220px]"
                          formatter={(value, name) => (
                            <div className="flex flex-1 items-center justify-between gap-6">
                              <span className="text-slate-600 font-medium">{name}</span>
                              <span className="font-mono font-bold text-slate-900">
                                {Number(value) === 0 ? '—' : formatDurLabel(Math.pow(10, Number(value)) / 1000)}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="mockA_log"
                      stroke={mockAStroke}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorMockA)"
                      name={comparisonLabels.mockA}
                      dot={isDenseMode ? false : { r: 3, fill: "#fff", stroke: mockAStroke, strokeWidth: 1.5 }}
                      activeDot={{ r: 5, strokeWidth: 0, fill: mockAStroke }}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="mockB_log"
                      stroke={mockBStroke}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorMockB)"
                      name={comparisonLabels.mockB}
                      dot={(dotProps: any) => {
                        const { cx, cy, payload, key } = dotProps;
                        if (cx == null || cy == null || !payload) return <g key={key} />;
                        if (!showDetailedVariationDots) {
                          return <circle key={key} cx={cx} cy={cy} r={3.5} fill="#fff" stroke={mockBStroke} strokeWidth={1.5} />;
                        }
                        const v = payload.variation ?? 0;
                        const color = v === 0 ? (isFiori ? '#6a6d70' : '#94a3b8') : v > 0 ? (isFiori ? '#bb0000' : '#ef4444') : mockBStroke;
                        const label = v === 0 ? '0%' : `${v > 0 ? '+' : ''}${v}%`;
                        const above = cy >= 32;
                        const labelY = above ? cy - 18 : cy + 22;
                        const rectW = label.length * 6.5 + 8;
                        const rectH = 14;
                        const rectX = cx - rectW / 2;
                        const rectY = above ? labelY - 11 : labelY - 11;
                        return (
                          <g key={key}>
                            <circle cx={cx} cy={cy} r={4} fill="#fff" stroke={mockBStroke} strokeWidth={2} />
                            <rect x={rectX} y={rectY} width={rectW} height={rectH} fill="white" fillOpacity={0.92} rx={2} />
                            <text x={cx} y={labelY} textAnchor="middle" fill={color} fontSize={10} fontWeight="900" style={{ pointerEvents: 'none' }}>
                              {label}
                            </text>
                          </g>
                        );
                      }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: mockBStroke }}
                      isAnimationActive={false}
                    />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
};
