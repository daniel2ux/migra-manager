"use client";

import { Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MigrationLog } from "@/types/migration";
import type { Timestamp } from "firebase/firestore";

function fmtTs(ts: Timestamp | null | undefined): string {
  if (!ts?.toDate) return "—";
  try { return ts.toDate().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { return "—"; }
}

interface SummaryRow {
  object: string;
  mock: string;
  errorId: string;
  errorNumber: string;
  message: string;
  messageCount: number;
  count: number;
  lastAt: Timestamp;
}

interface LogSummaryTableProps {
  summaryRows: SummaryRow[];
  filteredRows: MigrationLog[];
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
  onOpenDetail: (log: MigrationLog) => void;
  mockMap: Record<string, string>;
}

export function LogSummaryTable({
  summaryRows, filteredRows, expandedKeys, onToggleExpand, onOpenDetail, mockMap,
}: LogSummaryTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[860px] sm:min-w-[920px] lg:min-w-[980px] text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="sticky left-0 top-0 z-30 bg-slate-200 w-6 min-w-6 px-2 py-1.5 border-b border-slate-400" />
            {["OBJETO", "MOCK", "ERRO ID", "CÓD. ERRO", "OCORRÊNCIAS", "MENSAGEM", "ÚLTIMA OCORRÊNCIA"].map((h, idx) => {
              const stickyClass = idx === 0 ? "sticky left-6 z-20 w-[150px] min-w-[150px]" : "";
              return (
                <th
                  key={h}
                  className={cn(
                    "sticky top-0 bg-slate-200 px-3 py-1 text-[10px] font-black text-slate-700 uppercase tracking-widest whitespace-nowrap border-b border-slate-400",
                    stickyClass,
                    idx === 0 && "border-r border-slate-300 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.35)]",
                  )}
                >
                  {h}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {summaryRows.map((row, i) => {
            const key = `${row.object}::${row.mock}::${row.errorId}::${row.errorNumber}`;
            const isExpanded = expandedKeys.has(key);
            const detailRows = filteredRows.filter(
              r =>
                r.object === row.object &&
                r.mock === row.mock &&
                (r.errorId || '—') === row.errorId &&
                (r.errorNumber || '—') === row.errorNumber
            );
            const rowBg = i % 2 === 0 ? "bg-white" : "bg-slate-50/40";
            const stickyBg = isExpanded ? "bg-SkyBlue-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50";
            return (
              <Fragment key={key}>
                <tr onClick={() => onToggleExpand(key)} className={cn("border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-200/60", isExpanded ? "bg-SkyBlue-50/60" : rowBg)}>
                  <td className={cn("px-2 py-1 text-slate-400 sticky left-0 z-20", stickyBg)}>{isExpanded ? <ChevronDown className="w-3 h-3 text-SkyBlue-500" /> : <ChevronRight className="w-3 h-3" />}</td>
                  <td className={cn("px-3 py-1 text-[11px] font-bold text-slate-800 uppercase whitespace-nowrap max-w-[130px] truncate sticky left-6 z-10 w-[150px] min-w-[150px] border-r border-slate-200 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.25)]", stickyBg)}>{row.object}</td>
                  <td className="px-3 py-1 text-[11px] text-slate-600 whitespace-nowrap max-w-[110px] truncate">{mockMap[row.mock] || row.mock}</td>
                  <td className="px-3 py-1 text-[11px] font-mono text-slate-700 whitespace-nowrap">{row.errorId}</td>
                  <td className="px-3 py-1 text-[11px] font-mono text-red-600 font-bold whitespace-nowrap">{row.errorNumber}</td>
                  <td className="px-3 py-1 text-[11px] font-black text-slate-800 text-center font-mono">{row.count.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-1 text-[11px] text-slate-700 max-w-[400px] truncate" title={row.message}>
                    {row.messageCount > 1 ? `${row.message} (+${row.messageCount - 1} msg)` : row.message}
                  </td>
                  <td className="px-3 py-1 text-[11px] font-mono text-slate-500 whitespace-nowrap">{fmtTs(row.lastAt)}</td>
                </tr>
                 {isExpanded && detailRows.map((dr, di) => (
                  <tr key={`${key}-detail-${dr.id}`} onClick={(e) => { e.stopPropagation(); onOpenDetail(dr); }} className="border-b border-SkyBlue-100 bg-SkyBlue-50/30 cursor-pointer hover:bg-slate-200/60 transition-colors">
                    <td className="pl-2 py-1 border-l-2 border-SkyBlue-400 sticky left-0 z-20 bg-SkyBlue-50"><span className="text-[10px] font-black text-SkyBlue-500 font-mono">#{di + 1}</span></td>
                    <td className="px-3 py-1 text-[11px] font-mono text-slate-500 whitespace-nowrap sticky left-6 z-10 w-[150px] min-w-[150px] bg-SkyBlue-50 border-r border-SkyBlue-100 shadow-[4px_0_8px_-6px_rgba(14,116,144,0.25)]">{fmtTs(dr.importedAt)}</td>
                    <td className="px-3 py-1 text-[11px] font-mono text-slate-500 whitespace-nowrap max-w-[110px] truncate">{mockMap[dr.mock] || dr.mock}</td>
                    <td className="px-3 py-1 text-[11px] font-mono text-slate-700 whitespace-nowrap">{dr.errorId || '—'}</td>
                    <td className="px-3 py-1 text-[11px] font-mono text-red-600 font-bold whitespace-nowrap">{dr.errorNumber || '—'}</td>
                    <td className="px-3 py-1 text-[11px] font-mono text-slate-600 whitespace-nowrap max-w-[120px] truncate" title={dr.oldKey || dr.infoKey}>{dr.oldKey || dr.infoKey || '—'}</td>
                    <td className="px-3 py-1 text-[11px] text-slate-700 max-w-[400px] truncate" title={dr.message}>{dr.message || '—'}</td>
                    <td className="px-3 py-1 text-[11px] font-mono text-slate-500 whitespace-nowrap max-w-[180px] truncate" title={dr.filename}>{dr.filename || '—'}</td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
