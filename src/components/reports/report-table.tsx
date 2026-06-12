"use client";

import { ReportData } from "@/hooks/use-report-aggregation";
import { formatNumber, renderDuration } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportTableProps {
  objects: ReportData["objects"];
}

export function ReportTable({ objects }: ReportTableProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-[0.2em] border-l-4 pl-3 mb-1">
        Detalhamento por Ativo
      </h3>
      <div className="border-b rounded-none overflow-hidden shadow-none bg-white">
        <Table>
          <TableHeader className="border-b border-slate-900">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-slate-900 font-bold text-[9px] uppercase tracking-widest h-8 pl-10">
                Objeto Técnico
              </TableHead>
              <TableHead className="text-slate-900 font-bold text-[9px] uppercase tracking-widest text-right h-8 px-4">
                Target
              </TableHead>
              <TableHead className="text-slate-900 font-bold text-[9px] uppercase tracking-widest text-right h-8 px-4">
                Migrados
              </TableHead>
              <TableHead className="text-slate-900 font-bold text-[9px] uppercase tracking-widest text-right h-8 px-4">
                Sucesso
              </TableHead>
              <TableHead className="text-slate-900 font-bold text-[9px] uppercase tracking-widest text-right h-8 px-4">
                Taxa Sucesso (%)
              </TableHead>
              <TableHead className="text-slate-900 font-bold text-[9px] uppercase tracking-widest text-right h-8 pr-10">
                Duração
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {objects.map((obj, i) => (
              <ReportTableRow key={i} obj={obj} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface ReportTableRowProps {
  obj: ReportData["objects"][number];
}

function ReportTableRow({ obj }: ReportTableRowProps) {
  const error = obj.errorRecordsCount || 0;
  const processed = obj.processedRecordsCount || 0;
  const success = Math.max(0, processed - error);
  const successRate = formatSuccessRate(success, obj.targetRecordsCount || 0, error > 0);

  return (
    <TableRow
      className={cn(
        "border-slate-100 hover:bg-slate-200/60 transition-all duration-200 cursor-default",
        obj.isParallel && "bg-emerald-50/30",
      )}
    >
      <TableCell className="py-1.5 pl-10">
        <div className="font-bold text-slate-900 uppercase text-xs tracking-tight">
          {obj.name}
        </div>
      </TableCell>

      <NumberCell value={obj.targetRecordsCount || 0} />
      <NumberCell value={processed} />
      <NumberCell value={success} className="text-emerald-600" />
      <TableCell className="text-right font-medium text-slate-900 text-xs font-mono tabular-nums bg-white/50 py-1.5 px-4">
        {successRate}
      </TableCell>
      <TableCell className="text-right font-medium text-xs font-mono tabular-nums py-1.5 pr-10">
        {renderDuration(obj.currentChargeDurationMs || 0)}
      </TableCell>
    </TableRow>
  );
}

interface NumberCellProps {
  value: number;
  className?: string;
}

function NumberCell({ value, className }: NumberCellProps) {
  return (
    <TableCell className={cn("text-right text-slate-600 font-medium text-xs font-mono tabular-nums py-1.5 px-4", className)}>
      {formatNumber(value)}
    </TableCell>
  );
}

function formatSuccessRate(
  success: number,
  target: number,
  hasErrors: boolean,
): string {
  if (target <= 0) return "0,00%";
  const pct = (success / target) * 100;
  const formatted = pct.toFixed(2);

  if (hasErrors && (pct >= 100 || formatted === "100.00")) {
    return "99,99%";
  }

  if (pct >= 100) return "100,00%";

  return formatted.replace(".", ",") + "%";
}
