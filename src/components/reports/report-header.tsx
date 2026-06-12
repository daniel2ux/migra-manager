"use client";

import { ReportData } from "@/hooks/use-report-aggregation";
import { formatDateTime } from "@/lib/formatters";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReportHeaderProps {
  reportData: ReportData;
  showMockBadge?: boolean;
}

export function ReportHeader({ reportData, showMockBadge = true }: ReportHeaderProps) {
  return (
    <div className="flex justify-between items-start pb-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-2 shadow-lg print:bg-slate-50 print:border print:border-slate-200">
            <Zap className="w-4 h-4 text-white fill-white print:text-SkyBlue-500 print:fill-SkyBlue-500" />
          </div>
          <span className="text-xl font-black tracking-tighter text-slate-900">
            Migra
          </span>
        </div>
        <div className="flex flex-col">
          <h2 className="text-base font-black text-slate-900 uppercase leading-none tracking-tight">
            {reportData.projectName}
          </h2>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] mt-1 leading-none">
            {reportData.company}
          </p>
          {showMockBadge && reportData.mockName && (
            <Badge
              variant="outline"
              className="w-fit text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 leading-none py-0 px-1 rounded-none"
            >
              Mock: {reportData.mockName}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right space-y-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Data de Emissão
        </p>
        <p className="text-xs font-black text-slate-900">
          {reportData.date}
        </p>

        {reportData.mockStart && reportData.mockEnd && (
          <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-0.5">
              Cronograma
            </p>
            <div className="space-y-1">
              <ScheduleItem label="Início" date={reportData.mockStart} />
              <ScheduleItem label="TÉRMINO" date={reportData.mockEnd} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ScheduleItemProps {
  label: string;
  date: string;
}

function ScheduleItem({ label, date }: ScheduleItemProps) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[6px] font-black text-slate-300 uppercase leading-none tracking-widest">
        {label}
      </span>
      <span className="text-[9px] font-black text-slate-600 uppercase tabular-nums">
        {formatDateTime(date)}
      </span>
    </div>
  );
}
