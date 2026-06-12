import React, {
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
  useState,
} from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Timer, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { AggregatedObject } from "@/types/migration";
import { ChartPanelSearchField } from "./chart-panel-search-field";

type BarSeries = "sucesso" | "erro";

/** Altura mínima em pixels quando a quantidade real (label) é maior que zero. */
const MIN_BAR_PIXEL_HEIGHT = 10;

/**
 * No eixo logarítmico, log10(1) = 0 — barra some no cálculo de escala.
 * Piso no eixo log para qualquer quantidade > 0.
 */
const MIN_LOG_BAR_VALUE = 0.15;

function toLogBarValue(count: number): number {
  if (count <= 0) return 0;
  return Math.max(Math.log10(count), MIN_LOG_BAR_VALUE);
}

function minBarPixelSize(count: number): number {
  return count > 0 ? MIN_BAR_PIXEL_HEIGHT : 0;
}

interface ChartDataRow {
  name: string;
  sucesso: number;
  erro: number;
  sucesso_label: number;
  erro_label: number;
}

interface BarLabelPosition {
  name: string;
  series: BarSeries;
  value: number;
  fill: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SvgLabelProps {
  x?: number;
  y?: number;
  width?: number;
  value?: number | string;
  fill?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  payload?: ChartDataRow;
  name?: string;
}

function StaticBarValueLabel({
  x,
  y,
  width,
  value,
  fill = "#32363a",
  fontSize = 10,
  fontWeight = 600,
  fontFamily,
}: SvgLabelProps) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (x == null || y == null || width == null || !numeric || numeric <= 0) return null;

  const cx = x + width / 2;
  const labelY = y - 10;

  return (
    <text
      x={cx}
      y={labelY}
      fill={fill}
      fontSize={fontSize}
      fontWeight={fontWeight}
      fontFamily={fontFamily}
      textAnchor="middle"
      style={{ pointerEvents: "none" }}
    >
      {formatNumber(numeric, false)}
    </text>
  );
}

function measureBarLabelPositions(
  root: HTMLElement,
  data: ChartDataRow[],
  sucessoFill: string,
  erroFill: string,
): BarLabelPosition[] {
  const rootRect = root.getBoundingClientRect();
  const positions: BarLabelPosition[] = [];

  const tickEls = root.querySelectorAll(
    ".recharts-xAxis .recharts-cartesian-axis-tick text, .recharts-xAxis .recharts-cartesian-axis-tick tspan",
  );
  const ticks = Array.from(tickEls)
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        name: el.textContent?.trim() ?? "",
        x: rect.left + rect.width / 2,
      };
    })
    .filter((t) => t.name)
    .sort((a, b) => a.x - b.x);

  const uniqueTicks: typeof ticks = [];
  ticks.forEach((tick) => {
    if (!uniqueTicks.some((t) => t.name === tick.name)) {
      uniqueTicks.push(tick);
    }
  });

  const barGroups = Array.from(
    root.querySelectorAll("g.recharts-bar, g.recharts-layer.recharts-bar"),
  );

  barGroups.forEach((barGroup, groupIndex) => {
    const series: BarSeries = groupIndex === 0 ? "sucesso" : "erro";
    const fill = series === "sucesso" ? sucessoFill : erroFill;
    const labelKey = series === "sucesso" ? "sucesso_label" : "erro_label";

    const shapes = Array.from(
      barGroup.querySelectorAll(
        "g.recharts-bar-rectangle path, g.recharts-bar-rectangle rect, .recharts-rectangle",
      ),
    ).filter((el) => el.getBoundingClientRect().height >= 1);

    const rects = shapes
      .map((shape) => {
        const box = shape.getBoundingClientRect();
        return {
          centerX: box.left + box.width / 2,
          box,
        };
      })
      .sort((a, b) => a.centerX - b.centerX);

    rects.forEach((rect, index) => {
      const tick =
        uniqueTicks.find((t) => {
          const dist = Math.abs(t.x - rect.centerX);
          return dist < 60;
        }) ?? uniqueTicks[index];

      const name = tick?.name ?? data[index]?.name;
      if (!name) return;

      const row = data.find((d) => d.name === name);
      if (!row) return;

      const value = row[labelKey];
      if (!value || value <= 0) return;

      positions.push({
        name,
        series,
        value,
        fill,
        x: rect.box.left - rootRect.left,
        y: rect.box.top - rootRect.top,
        width: rect.box.width,
        height: rect.box.height,
      });
    });
  });

  return positions;
}

function BarHoverOverlay({
  chartRootRef,
  data,
  sucessoFill,
  erroFill,
  labelFontSize,
  fontFamily,
}: {
  chartRootRef: React.RefObject<HTMLDivElement | null>;
  data: ChartDataRow[];
  sucessoFill: string;
  erroFill: string;
  labelFontSize: number;
  fontFamily: string;
}) {
  const [positions, setPositions] = useState<BarLabelPosition[]>([]);

  const measure = useCallback(() => {
    const root = chartRootRef.current;
    if (!root) return;
    setPositions(measureBarLabelPositions(root, data, sucessoFill, erroFill));
  }, [chartRootRef, data, sucessoFill, erroFill]);

  useLayoutEffect(() => {
    measure();
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure]);

  useEffect(() => {
    measure();
    const retries = [50, 150, 400].map((ms) => window.setTimeout(measure, ms));
    return () => retries.forEach(clearTimeout);
  }, [measure]);

  useEffect(() => {
    const root = chartRootRef.current;
    if (!root) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(root);

    const scrollParent = root.closest(".overflow-x-auto");
    const onScroll = () => measure();
    scrollParent?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      scrollParent?.removeEventListener("scroll", onScroll);
    };
  }, [chartRootRef, measure]);

  if (!positions.length) return null;

  return (
    <div className="absolute inset-0 z-[5] pointer-events-none">
      {positions.map((pos) => {
        const cx = pos.x + pos.width / 2;
        const text = formatNumber(pos.value, false);
        const hitW = Math.max(28, text.length * labelFontSize * 0.65);
        const hitH = labelFontSize + 8;
        const zoomFontSize = Math.round(labelFontSize * 1.45);

        return (
          <div
            key={`${pos.name}-${pos.series}`}
            className="group/bar-zoom absolute pointer-events-auto"
            style={{
              left: Math.min(pos.x, cx - hitW / 2),
              top: pos.y - hitH - 4,
              width: Math.max(pos.width, hitW),
              height: pos.height + hitH + 8,
            }}
          >
            <div
              className="pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-[3px] border border-transparent bg-white px-1.5 py-0.5 font-bold opacity-0 shadow-sm will-change-transform [transition:none] group-hover/bar-zoom:opacity-100 group-hover/bar-zoom:scale-[1.35] group-hover/bar-zoom:-translate-y-1.5"
              style={{
                top: 0,
                fontSize: zoomFontSize,
                fontWeight: 700,
                fontFamily,
                color: pos.fill,
                borderColor: pos.fill,
              }}
            >
              {text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface MigrationResultChartProps {
  aggregatedPerformance: AggregatedObject[];
  chartConfig: any;
  variant?: "default" | "fiori";
}

export const MigrationResultChart = ({
  aggregatedPerformance,
  chartConfig,
  variant = "default",
}: MigrationResultChartProps) => {
  const isFiori = variant === "fiori";
  const tickFill = isFiori ? "#6a6d70" : "#64748b";
  const gridStroke = isFiori ? "#e5e5e5" : "#f1f5f9";
  const chartRootRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const migrationResultData = useMemo(() => {
    return aggregatedPerformance.map((obj) => ({
      name: obj.name,
      sucesso: Number(obj.successfulRecordsCount) || 0,
      erro: Number(obj.errorRecordsCount) || 0,
    }));
  }, [aggregatedPerformance]);

  const migrationResultChartData = useMemo((): ChartDataRow[] => {
    return migrationResultData.map((d) => ({
      name: d.name,
      sucesso: toLogBarValue(d.sucesso),
      erro: toLogBarValue(d.erro),
      sucesso_label: d.sucesso,
      erro_label: d.erro,
    }));
  }, [migrationResultData]);

  const displayedChartData = useMemo(() => {
    const q = searchTerm.trim().toUpperCase();
    if (!q) return migrationResultChartData;
    return migrationResultChartData.filter((d) => d.name.toUpperCase().includes(q));
  }, [migrationResultChartData, searchTerm]);

  const totalDataCount = migrationResultChartData.length;
  const isSearchActive = searchTerm.trim().length > 0;
  const isFilteredEmpty = isSearchActive && displayedChartData.length === 0 && totalDataCount > 0;

  useEffect(() => {
    chartScrollRef.current?.scrollTo({ left: 0 });
  }, [searchTerm]);

  const barCount = displayedChartData.length;
  const labelFontSize = barCount > 50 ? 9 : barCount > 30 ? 10 : 11;
  const chartTopMargin = barCount > 30 ? 48 : 36;
  const labelFontWeight = isFiori ? 600 : 900;
  const labelFontFamily = isFiori ? "var(--font-72)" : "monospace";

  const sucessoLabelConfig = useMemo(
    () => ({
      position: "top" as const,
      dataKey: "sucesso_label",
      zIndex: 0,
      content: (props: SvgLabelProps) => (
        <StaticBarValueLabel
          {...props}
          fill={chartConfig.sucesso.color}
          fontSize={labelFontSize}
          fontWeight={labelFontWeight}
          fontFamily={labelFontFamily}
        />
      ),
    }),
    [chartConfig.sucesso.color, labelFontSize, labelFontWeight, labelFontFamily],
  );

  const erroLabelConfig = useMemo(
    () => ({
      position: "top" as const,
      dataKey: "erro_label",
      zIndex: 0,
      content: (props: SvgLabelProps) => (
        <StaticBarValueLabel
          {...props}
          fill={chartConfig.erro.color}
          fontSize={labelFontSize}
          fontWeight={labelFontWeight}
          fontFamily={labelFontFamily}
        />
      ),
    }),
    [chartConfig.erro.color, labelFontSize, labelFontWeight, labelFontFamily],
  );

  const chartMargin = useMemo(
    () => ({
      top: chartTopMargin,
      right: 80,
      left: 0,
      bottom: 20,
    }),
    [chartTopMargin],
  );

  return (
    <Card
      className={cn(
        isFiori
          ? "fiori-analytical-card border-0 shadow-none"
          : "border-none shadow-xs bg-white rounded-none overflow-hidden h-full flex flex-col",
      )}
    >
      <div
        className={cn(
          isFiori
            ? "fiori-analytical-card__header"
            : "bg-white/50 py-4 px-6 md:px-8 border-b border-slate-100 flex items-center justify-between",
        )}
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h4
            className={cn(
              isFiori
                ? "fiori-analytical-card__title"
                : "text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2",
            )}
          >
            {isFiori ? (
              <>
                <span className="fiori-analytical-card__title-icon">
                  <Timer className="w-3.5 h-3.5" />
                </span>
                <span>Resultados da carga de dados migrados por objeto</span>
              </>
            ) : (
              <>
                <Timer className="w-3 h-3 text-indigo-500" />
                Resultados da Carga de Dados Migrados por Objeto
              </>
            )}
          </h4>
          {isFiori ? (
            (isSearchActive && displayedChartData.length > 0) && (
              <p className="fiori-analytical-card__subtitle">
                <span className="fiori-analytical-card__filter-meta">
                  {displayedChartData.length} de {totalDataCount} objetos
                </span>
              </p>
            )
          ) : (
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">
              Quantitativos de registros processados e erros por objeto
              {isSearchActive && displayedChartData.length > 0 && (
                <span className="ml-2 text-slate-500 normal-case">
                  · {displayedChartData.length} de {totalDataCount} objetos
                </span>
              )}
            </p>
          )}
        </div>
        <ChartPanelSearchField
          value={searchTerm}
          onSearchCommit={setSearchTerm}
          isFiori={isFiori}
          ariaLabel="Buscar objeto no gráfico de resultados"
        />
      </div>
      <CardContent
        className={cn(
          isFiori
            ? "fiori-analytical-card__body pt-6 pb-4 px-0 overflow-hidden"
            : "pt-8 pb-4 px-0 overflow-hidden",
        )}
      >
        {isFilteredEmpty ? (
          <div className={cn(
            "flex flex-col items-center justify-center w-full h-[350px] gap-2 px-6 text-center",
            isFiori ? "fiori-analytical-card__empty" : "text-slate-400",
          )}>
            <Search className={cn("opacity-40", isFiori ? "w-8 h-8" : "w-6 h-6")} />
            <p className={isFiori ? "text-sm font-normal text-[var(--fiori-label)]" : "text-[10px] font-medium italic"}>
              Nenhum objeto encontrado para &quot;{searchTerm.trim()}&quot;.
            </p>
          </div>
        ) : (
        <div className="flex w-full h-[350px]">
          <div
            className={cn(
              "w-[70px] h-full shrink-0 z-10 flex flex-col justify-center",
              isFiori ? "fiori-analytical-card__axis" : "bg-white border-r border-slate-50",
            )}
          >
            <ChartContainer config={chartConfig} className="h-full w-full [&>div]:!aspect-auto">
              <BarChart
                data={displayedChartData}
                margin={{ top: 20, right: 0, left: 15, bottom: 20 }}
              >
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  domain={[0, "auto"]}
                  ticks={[0, 1, 2, 3, 4, 5, 6]}
                  tick={{ fill: tickFill, fontSize: 9, fontWeight: isFiori ? 600 : 700 }}
                  tickFormatter={(val: number) => {
                    if (val === 0) return "0";
                    const real = Math.pow(10, val);
                    return real >= 1000000
                      ? `${(real / 1000000).toFixed(0)}M`
                      : real >= 1000
                        ? `${(real / 1000).toFixed(0)}k`
                        : String(Math.round(real));
                  }}
                />
                <Bar dataKey="sucesso" hide />
                <Bar dataKey="erro" hide />
              </BarChart>
            </ChartContainer>
          </div>

          <div ref={chartScrollRef} className="flex-1 h-full overflow-x-auto overflow-y-visible pb-2 custom-scrollbar">
            <div
              style={{
                minWidth: `${Math.max(800, displayedChartData.length * 80)}px`,
                height: "100%",
                paddingRight: "100px",
              }}
            >
              <div ref={chartRootRef} className="relative h-full w-full">
                <ChartContainer config={chartConfig} className="h-full w-full [&>div]:!aspect-auto">
                  <BarChart
                    data={displayedChartData}
                    margin={chartMargin}
                    barGap={1}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: tickFill, fontSize: 8, fontWeight: isFiori ? 600 : 700 }}
                      interval={0}
                    />
                    <Bar
                      dataKey="sucesso"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={28}
                      minPointSize={(_value, index) =>
                        minBarPixelSize(displayedChartData[index]?.sucesso_label ?? 0)
                      }
                      fill={chartConfig.sucesso.color}
                      fillOpacity={0.9}
                      isAnimationActive={false}
                      label={sucessoLabelConfig as React.ComponentProps<typeof Bar>["label"]}
                    />
                    <Bar
                      dataKey="erro"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={28}
                      minPointSize={(_value, index) =>
                        minBarPixelSize(displayedChartData[index]?.erro_label ?? 0)
                      }
                      fill={chartConfig.erro.color}
                      fillOpacity={0.9}
                      isAnimationActive={false}
                      label={erroLabelConfig as React.ComponentProps<typeof Bar>["label"]}
                    />
                  </BarChart>
                </ChartContainer>

                <BarHoverOverlay
                  chartRootRef={chartRootRef}
                  data={displayedChartData}
                  sucessoFill={chartConfig.sucesso.color}
                  erroFill={chartConfig.erro.color}
                  labelFontSize={labelFontSize}
                  fontFamily={labelFontFamily}
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
};
