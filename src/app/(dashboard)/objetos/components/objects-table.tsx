"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  normalizeSeqForDisplay,
  parseSequence,
  resolveDisplayChargeOrder,
} from "@/lib/migration/sequence-utils";
import { normalizeMasterCatalogName } from "@/lib/migration/master-catalog";
import type { MasterObject } from "@/types/master-object";
import type { ActivityGroup } from "@/types/activity-group";
import {
  Box,
  Zap,
  GitFork,
  Network,
  Link2,
  ArrowRight,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ObjectsTableProps {
  objects: MasterObject[];
  duplicateMasterNameKeys?: Set<string>;
  allObjects?: MasterObject[] | null;
  activityGroups: ActivityGroup[];
  isAdmin: boolean;
  /** Chaves `projectId:mockId` por objeto mestre; usado para desabilitar excluir quando em uso. */
  usageMap?: Record<string, Set<string>>;
  isMockLocked?: boolean;
  selectedCardId: string | null;
  onSelectCard: (id: string) => void;
  onEdit: (obj: MasterObject) => void;
  onView: (obj: MasterObject) => void;
  onDelete: (id: string, name: string) => void;
  onOpenPrecedence: (obj: MasterObject) => void;
  onDependencies: (obj: MasterObject) => void;
  onSelectNext: (obj: MasterObject) => void;
  onSelectParallel: (obj: MasterObject) => void;
  displayChargeOrderById?: ReadonlyMap<string, string>;
}

export function ObjectsTable({
  objects,
  duplicateMasterNameKeys,
  allObjects = [],
  activityGroups: _activityGroups,
  isAdmin,
  usageMap,
  isMockLocked = false,
  selectedCardId,
  onSelectCard,
  onEdit,
  onView,
  onDelete,
  onOpenPrecedence,
  onDependencies,
  onSelectNext,
  onSelectParallel,
  displayChargeOrderById,
}: ObjectsTableProps) {
  return (
    <div className="relative w-full">
      <table className="w-full text-[11px] border-collapse">
        <colgroup>
          <col className="w-10" />
          <col className="w-40" />
          <col />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-28" />
          <col className="w-20" />
          <col className="w-20" />
          <col className="w-28" />
        </colgroup>
        <thead className="bg-slate-200 sticky top-0 z-10">
          <tr className="h-8 border-none hover:bg-transparent">
            {["", "NOME", "DESCRIÇÃO", "GRUPO", "SEQ. CARGA", "PARALELISMO", "STATUS", "TIPO", "AÇÕES"].map((h, index, arr) => (
              <th
                key={h}
                className={cn(
                  "py-0 text-[10px] font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300/40 bg-slate-200 whitespace-nowrap",
                  index === 0 ? "pl-4 md:pl-8 pr-3" : index === arr.length - 1 ? "pr-4 md:pr-8 pl-3" : "px-3"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {objects.map((obj, i) => {
            const usageCount = usageMap?.[obj.id]?.size ?? 0;
            const showDelete = isAdmin && obj.status === "INATIVO";
            const deleteDisabled = showDelete && usageCount > 0;
            const myParallelMajor = obj.parallelOrder ? parseSequence(obj.parallelOrder).major : 0;
            const otherParallel = (myParallelMajor > 0 ? allObjects?.filter(o =>
              o.id !== obj.id &&
              o.parallelOrder &&
              parseSequence(o.parallelOrder).major === myParallelMajor
            ) : []) || [];

            return (
              <tr
                key={obj.id}
                className={cn(
                  "border-b border-slate-100 hover:bg-slate-200/60 transition-all duration-200 cursor-default h-8",
                  i % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                  selectedCardId === obj.id && "bg-SkyBlue-50/70"
                )}
                onClick={() => onSelectCard(obj.id)}
              >
                <td className="pl-4 md:pl-8 pr-3 py-0 whitespace-nowrap align-middle">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-sm shrink-0",
                    (!obj.status || obj.status === 'ATIVO') ? "bg-emerald-500" :
                      obj.status === 'LEGACY' ? "bg-amber-500" :
                        "bg-rose-500"
                  )} />
                </td>
                <td className="px-3 py-0 font-bold text-slate-900 truncate whitespace-nowrap uppercase align-middle">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{obj.name}</span>
                    {duplicateMasterNameKeys?.has(normalizeMasterCatalogName(obj.name)) && (
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex shrink-0 cursor-help" tabIndex={0}>
                            <AlertTriangle className="w-3 h-3 text-amber-500" aria-hidden />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px] text-[10px] leading-snug">
                          Outro objeto mestre com o mesmo nome (ID diferente). Verifique qual está em uso nos mocks antes de excluir.
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </td>
                <td className="px-3 py-0 text-slate-500 truncate align-middle">
                  {obj.description || "—"}
                </td>
                <td className="px-3 py-0 text-center font-mono text-slate-600 align-middle">
                  {obj.chargeGroup || "—"}
                </td>
                <td className="px-3 py-0 text-center font-mono text-slate-600 align-middle">
                  {normalizeSeqForDisplay(
                    resolveDisplayChargeOrder(obj.id, obj.chargeOrder, displayChargeOrderById),
                  )}
                </td>
                <td className="px-3 py-0 text-center align-middle">
                  {obj.isParallel ? (
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3 text-violet-500 animate-pulse" />
                      <span className="font-mono text-[10px] text-violet-600 font-bold">{obj.parallelOrder || "—"}</span>
                      {otherParallel.length > 0 && (
                        <span className="text-[9px] text-slate-400">({otherParallel.length})</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-0 text-center align-middle">
                  <Badge variant="outline" className={cn(
                    "text-[8.5px] font-black uppercase tracking-widest border-none px-2 h-4 flex items-center gap-1.5 rounded-none shadow-xs",
                    (!obj.status || obj.status === 'ATIVO') ? "bg-emerald-50 text-emerald-600" :
                      obj.status === 'LEGACY' ? "bg-amber-50 text-amber-600" :
                        "bg-rose-50 text-rose-600"
                  )}>
                    <div className={cn(
                      "w-1 h-1 rounded-full",
                      (!obj.status || obj.status === 'ATIVO') ? "bg-emerald-500" :
                        obj.status === 'LEGACY' ? "bg-amber-500" :
                          "bg-rose-500"
                    )} />
                    {obj.status || 'ATIVO'}
                  </Badge>
                </td>
                <td className="px-3 py-0 text-center align-middle">
                  <div className="flex items-center justify-center gap-1">
                    {obj.isParallel ? (
                      <GitFork className="w-3 h-3 text-slate-500" />
                    ) : (
                      <Box className="w-3 h-3 text-slate-400" />
                    )}
                    <span className="text-[8px] font-black uppercase text-slate-600">
                      {obj.isParallel ? "PARALELO" : "SEQ."}
                    </span>
                  </div>
                </td>
                <td className="pl-3 pr-4 md:pr-8 py-0 align-middle">
                  <div className="flex items-center gap-1 justify-center">
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); isMockLocked ? onView(obj) : onEdit(obj); }}
                        disabled={false}
                        className={cn(
                          "h-6 px-1.5 text-[9px] font-black uppercase tracking-widest transition-colors border-0",
                          isMockLocked
                            ? "bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                            : "bg-slate-100 hover:bg-SkyBlue-50 text-slate-600 hover:text-SkyBlue-600"
                        )}
                      >
                        {isMockLocked ? 'VISUALIZAR' : 'EDITAR'}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenPrecedence(obj); }}
                      className="h-6 w-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors border-0"
                    >
                      <Network className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDependencies(obj); }}
                          disabled={isMockLocked}
                          className={cn(
                            "h-6 w-6 flex items-center justify-center bg-slate-100 transition-colors border-0",
                            isMockLocked
                              ? "text-slate-300 cursor-not-allowed"
                              : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectNext(obj); }}
                          disabled={isMockLocked}
                          className={cn(
                            "h-6 w-6 flex items-center justify-center bg-slate-100 transition-colors border-0",
                            isMockLocked
                              ? "text-slate-300 cursor-not-allowed"
                              : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectParallel(obj); }}
                          disabled={isMockLocked}
                          className={cn(
                            "h-6 w-6 flex items-center justify-center bg-slate-100 transition-colors border-0",
                            isMockLocked
                              ? "text-slate-300 cursor-not-allowed"
                              : obj.isParallel
                                ? "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                                : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <GitFork className="w-3.5 h-3.5" />
                        </button>
                        {showDelete && (
                          <button
                            type="button"
                            title={deleteDisabled ? `Em uso em ${usageCount} mock(s) ou projeto(s)` : "Excluir do catálogo"}
                            disabled={deleteDisabled}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!deleteDisabled) onDelete(obj.id, obj.name);
                            }}
                            className={cn(
                              "h-6 w-6 flex items-center justify-center bg-slate-100 transition-colors border-0",
                              deleteDisabled
                                ? "text-slate-300 cursor-not-allowed opacity-60"
                                : "text-slate-400 hover:bg-red-50 hover:text-red-500",
                            )}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Scroll container */}
      <div className="max-h-[calc(100vh-18rem)] overflow-auto custom-scrollbar" />
    </div>
  );
}
