"use client";

import { useRef } from "react";
import { ReportData } from "@/hooks/use-report-aggregation";
import { ReportHeader } from "./report-header";
import { ReportKPIs } from "./report-kpis";
import { ReportTable } from "./report-table";

interface ReportContentProps {
  reportData: ReportData;
}

export function ReportContent({ reportData }: ReportContentProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={reportRef}
      className="bg-white rounded-none shadow-none border border-slate-100 p-6 md:p-8 space-y-6 max-w-5xl mx-auto print:shadow-none print:border-none print:p-0 print:max-w-full report-print-wrapper"
    >
      <div className="report-print-content">
        <div className="report-print-content-cell">
          <ReportHeader reportData={reportData} />
          <ReportKPIs reportData={reportData} />
          <ReportTable objects={reportData.objects} />
        </div>
      </div>

      <div className="report-print-footer-group">
        <div className="report-print-footer-cell">
          <TechFooter />
        </div>
      </div>
    </div>
  );
}

function TechFooter() {
  return (
    <div className="report-print-footer pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
      <div className="flex items-center gap-4">
        <p>MIGRA DATA CORE v2.1.LE</p>
        <span className="w-1 h-1 bg-slate-200 rounded-full" />
        <p>AUDIT-PASS: YES</p>
      </div>
      <p className="font-mono tabular-nums text-slate-400">PAGE REF. 001/001-A</p>
    </div>
  );
}
