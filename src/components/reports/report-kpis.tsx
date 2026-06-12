"use client";

import { ReportData } from "@/hooks/use-report-aggregation";
import { formatNumber, renderDuration } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportKPIsProps {
  reportData: ReportData;
}

export function ReportKPIs({ reportData }: ReportKPIsProps) {
  return (
    <div className="overflow-hidden rounded-none bg-white">
      <Table>
        <TableHeader className="bg-slate-100">
          <TableRow className="hover:bg-transparent border-none">
            <KPIColumnHeader>REGISTROS TOTAIS (TARGET)</KPIColumnHeader>
            <KPIColumnHeader>SUCESSO (REAL)</KPIColumnHeader>
            <KPIColumnHeader>ERROS DE CARGA</KPIColumnHeader>
            <KPIColumnHeader>TEMPO DE EXECUÇÃO</KPIColumnHeader>
            <KPIColumnHeader>OBJETOS TÉCNICOS</KPIColumnHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="border-none hover:bg-transparent">
            <KPICell value={formatNumber(reportData.totals.target)} />
            <KPICell value={formatNumber(reportData.totals.success)} />
            <KPICell value={formatNumber(reportData.totals.error)} />
            <KPICell value={renderDuration(reportData.totals.durationMs)} isComponent />
            <KPICell value={formatNumber(reportData.objectsCount)} />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function KPIColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center h-8 leading-tight border-r border-white px-2">
      {children}
    </TableHead>
  );
}

interface KPICellProps {
  value: string | React.ReactNode;
  isComponent?: boolean;
}

function KPICell({ value, isComponent = false }: KPICellProps) {
  return (
    <TableCell className="text-sm font-normal font-mono text-slate-700 text-center py-3 tabular-nums border-r border-white">
      {isComponent ? value : value}
    </TableCell>
  );
}
