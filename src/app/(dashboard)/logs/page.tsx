"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs, getCountFromServer, QueryDocumentSnapshot, Timestamp,
} from "@/supabase/compat-db-shim";
import { useDb, useUser, useDoc, useMemoDb } from "@/supabase";
import { doc } from "@/supabase/compat-db-shim";
import type { MigrationLog, MigrationLogStatus, Project, UserProfile } from "@/types/migration";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Search, FileSearch, ShieldAlert, LayoutList, List, FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildConsultaLogsExportFileName } from "@/lib/export/log-export-meta";
import {
  buildMultiSheetErrorWorkbook,
  formatImportedAtField,
  type ErrorItemRow,
} from "@/lib/export/error-excel-sheets";
import type { ErrorEmailRow } from "@/components/email/email-compose-dialog";
import { LogFilterPanel } from "@/components/logs/log-filter-panel";
import { LogSummaryTable } from "@/components/logs/log-summary-table";
import { LogDetailModal } from "@/components/logs/log-detail-modal";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { useSessionStorageState } from "@/hooks/use-session-storage-state";
import { SESSION_KEYS } from "@/lib/constants";

type LogRow = MigrationLog & { _snap: QueryDocumentSnapshot };
interface Filters { object: string; mock: string; status: MigrationLogStatus | ""; dateFrom: string; dateTo: string; }
const PAGE_SIZE = 1000;
function defaultDateFrom(): string { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }
function defaultDateTo(): string { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().slice(0, 10); }
const EMPTY: Filters = { object: "", mock: "", status: "", dateFrom: defaultDateFrom(), dateTo: defaultDateTo() };

const PAGE_TOOLBAR_BTN_LABELED =
  "fiori-toolbar-btn fiori-toolbar-btn--labeled !rounded-[0.375rem] !h-8 min-h-0 !w-auto !px-2.5";

function fmtTs(ts: Timestamp | null | undefined): string {
  if (!ts?.toDate) return "—";
  try { return ts.toDate().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { return "—"; }
}

function buildWhereConstraints(f: Filters, projectId: string, mockMap: Record<string, string>) {
  const c: ReturnType<typeof where>[] = [];
  if (projectId) c.push(where("projectId", "==", projectId));
  if (f.status) c.push(where("status", "==", f.status));
  if (f.object.trim()) c.push(where("object", "==", f.object.trim()));
  if (f.mock.trim()) {
    const nameToId = Object.entries(mockMap).find(([, name]) => name.toLowerCase() === f.mock.trim().toLowerCase())?.[0];
    const mockFilter = nameToId ?? f.mock.trim();
    c.push(where("mockId", "==", mockFilter));
  }
  if (f.dateFrom) { const d = new Date(f.dateFrom); d.setHours(0, 0, 0, 0); c.push(where("importedAt", ">=", Timestamp.fromDate(d))); }
  if (f.dateTo) { const d = new Date(f.dateTo); d.setHours(23, 59, 59, 999); c.push(where("importedAt", "<=", Timestamp.fromDate(d))); }
  return c;
}

export default function LogsPage() {
  const [page, setPage] = useSessionStorageState<number>(SESSION_KEYS.LOGS_PAGE, 1);
  const { projectId: activeProjectId } = useActiveProjectId();
  const db = useDb();
  const { user } = useUser();

  const userDocRef = useMemoDb(() => (user ? doc(db!, "users", user.uid) : null), [db, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  const isAdminOrMaster = userProfile?.role === "admin" || userProfile?.role === "master" || userProfile?.role === "user";

  const [pageCursors, setPageCursors] = useState<Record<number, QueryDocumentSnapshot | null>>({ 1: null });
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [mockMap, setMockMap] = useState<Record<string, string>>({});
  const [objectOptions, setObjectOptions] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [textSearch, setTextSearch] = useState("");
  const [detail, setDetail] = useState<MigrationLog | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const [dashboardMockId, setDashboardMockId] = useSessionStorageState<string>(
    SESSION_KEYS.DASHBOARD_MOCK,
    "all"
  );
  const projectId = activeProjectId ?? "";

  const projectDocRef = useMemoDb(
    () => (projectId ? doc(db!, "projects", projectId) : null),
    [db, projectId],
  );
  const { data: projectData } = useDoc<Project>(projectDocRef);

  // Load mocks for project and sync with dashboard selection
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db!, "projects", projectId, "mocks"));
        if (cancelled) return;
        const m: Record<string, string> = {};
        let runningMockName = "";
        let firstMockName = "";
        let dashboardMockName = "";

        snap.docs.forEach(d => {
          const data = d.data();
          if (data.isActive === false) return;
          const name = (data.name as string) || d.id;
          m[d.id] = name;

          // Check if this is the dashboard's selected mock
          if (d.id === dashboardMockId) {
            dashboardMockName = name;
          }

          if (data.isRunning && !runningMockName) runningMockName = name;
          if (!firstMockName) firstMockName = name;
        });
        setMockMap(m);

        // Priority: 1) Dashboard's selected mock, 2) Running mock, 3) First mock
        const selectedMockName = dashboardMockName || runningMockName || firstMockName;
        if (selectedMockName) {
          setDraft(prev => ({ ...prev, mock: selectedMockName }));
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [db, projectId, dashboardMockId]);

  // Load object options for selected mock
  useEffect(() => {
    const mockId = Object.entries(mockMap).find(([, name]) => name === draft.mock)?.[0];
    if (!mockId || !projectId) { setObjectOptions([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db!, "projects", projectId, "mocks", mockId, "migrationObjects"));
        if (cancelled) return;
        setObjectOptions(snap.docs.map(d => (d.data().name as string)).filter(Boolean).sort());
      } catch { setObjectOptions([]); }
    })();
    return () => { cancelled = true; };
  }, [draft.mock, mockMap, db, projectId]);

  const execQuery = useCallback(async (f: Filters, cursor: QueryDocumentSnapshot | null, withCount: boolean) => {
    setLoading(true); setQueryError(null);
    try {
      const coll = collection(db!, "migrationLogs");
      const wheres = buildWhereConstraints(f, projectId, mockMap);
      const pageQ = query(coll, ...wheres, orderBy("importedAt", "desc"), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE + 1));
      const snap = await getDocs(pageQ);
      const docs = snap.docs; const more = docs.length > PAGE_SIZE;
      setRows(docs.slice(0, PAGE_SIZE).map(d => ({ ...(d.data() as unknown as MigrationLog), id: d.id, _snap: d })));
      setHasNext(more);
      if (withCount) { const countQ = query(coll, ...wheres); getCountFromServer(countQ).then(s => setTotal(s.data().count)).catch(() => setTotal(null)); }
    } catch (err) {
      console.error("Log query error:", err);
      setQueryError(err instanceof Error ? err.message : String(err));
      setRows([]); setHasNext(false);
    } finally { setLoading(false); }
  }, [db, projectId, mockMap]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || (nextPage > page && !hasNext)) return;
    setPage(nextPage);
    let cursor: QueryDocumentSnapshot | null = null;
    if (nextPage > 1) {
      if (nextPage === page + 1) { cursor = rows[rows.length - 1]._snap; setPageCursors(prev => ({ ...prev, [nextPage]: cursor })); }
      else { cursor = pageCursors[nextPage] || null; }
    }
    execQuery(draft, cursor, false);
  };

  const handleSearch = () => {
    setTotal(null); setHasSearched(true); setPageCursors({ 1: null });
    if (page !== 1) setPage(1);
    execQuery(draft, null, true);
  };

  const handleClear = () => {
    setDraft(EMPTY); setTotal(null); setRows([]); setTextSearch(""); setHasSearched(false); setPageCursors({ 1: null });
    if (page !== 1) setPage(1);
  };

  const toggleExpanded = (key: string) => { setExpandedKeys(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; }); };

  const filteredRows = textSearch.trim() ? rows.filter(row => { const q = textSearch.trim().toLowerCase(); const oldKey = (row.oldKey || row.infoKey || "").toLowerCase(); return row.message?.toLowerCase().includes(q) || oldKey.includes(q); }) : rows;

  const summaryRows = useMemo(() => {
    const map = new Map<string, {
      object: string;
      mock: string;
      errorId: string;
      errorNumber: string;
      message: string;
      messageCount: number;
      count: number;
      lastAt: Timestamp;
    }>();
    for (const row of filteredRows) {
      const key = `${row.object}::${row.mock}::${row.errorId || ''}::${row.errorNumber || ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        if (row.importedAt > existing.lastAt) existing.lastAt = row.importedAt;
        // conta mensagens distintas por categoria de erro
        if (row.message && row.message !== existing.message) {
          existing.messageCount++;
        }
      }
      else {
        map.set(key, {
          object: row.object,
          mock: row.mock,
          errorId: row.errorId || '—',
          errorNumber: row.errorNumber || '—',
          message: row.message || '—',
          messageCount: 1,
          count: 1,
          lastAt: row.importedAt,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [filteredRows]);

  const handleExportExcel = useCallback(async () => {
    if (filteredRows.length === 0) return;
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Migra";
    wb.created = new Date();

    const migrador = userProfile?.migradorName?.trim() || userProfile?.name?.trim() || "—";
    const empresa =
      projectData?.empresa?.trim() || projectData?.name?.trim() || "—";
    const metaMigr = { migrador, dataMigr: "—" as const, hrExecMig: "—" as const, empresa };

    const summaryExport: ErrorEmailRow[] = summaryRows.map((s) => ({
      ...metaMigr,
      objeto: `${s.object} (${mockMap[s.mock] || s.mock})`,
      errorId: s.errorId,
      errorNumber: s.errorNumber,
      count: s.count,
      message: s.message,
    }));

    const itemRows: ErrorItemRow[] = filteredRows.map((row) => ({
      ...metaMigr,
      objeto: row.object,
      seq: row.seq ?? "—",
      infoKey: String(row.oldKey ?? row.infoKey ?? "—"),
      status: row.status ?? "—",
      errorId: row.errorId ?? "—",
      errorNumber: row.errorNumber ?? "—",
      message: row.message ?? "—",
      filename: row.filename ?? "—",
      importedAt: formatImportedAtField(row.importedAt),
    }));

    buildMultiSheetErrorWorkbook(wb, summaryExport, itemRows);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildConsultaLogsExportFileName({
      projectName: projectData?.name,
      mockName: draft.mock || undefined,
      objectFilter: draft.object || undefined,
    });
    a.click();
    URL.revokeObjectURL(url);
  }, [
    filteredRows,
    summaryRows,
    userProfile,
    projectData,
    mockMap,
    draft.mock,
    draft.object,
  ]);

  const from = (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + rows.length;

  if (!isProfileLoading && !isAdminOrMaster) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader variant="fiori" title="Consulta de logs" backHref="/" />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-5 max-w-md w-full">
            <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-black text-red-700 uppercase tracking-widest">Acesso Restrito</p>
              <p className="text-[10px] text-red-600 mt-1">Esta página está disponível apenas para usuários com perfil Admin ou Master.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        variant="fiori"
        title="Consulta de logs"
        subtitle={
          hasSearched && total !== null
            ? `Exibindo ${filteredRows.length.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")} registro${total !== 1 ? "s" : ""}${total > PAGE_SIZE ? ` (máx. ${PAGE_SIZE.toLocaleString("pt-BR")} exibidos)` : ""} · Página ${page}`
            : "Logs de importação de migração"
        }
        empresa={projectData?.company ?? projectData?.empresa}
        projectName={projectData?.name}
        mockName={draft.mock || undefined}
        backHref="/"
        actions={
          <div className="fiori-toolbar">
            {hasSearched && rows.length > 0 && (
              <div className="fiori-on-off">
                <span className="fiori-on-off__label">Exibição</span>
                <div className="fiori-on-off__group" role="group" aria-label="Modo de visualização">
                  <button
                    type="button"
                    className={cn(
                      "fiori-on-off__btn inline-flex items-center gap-1",
                      viewMode === "summary" && "fiori-on-off__btn--selected",
                    )}
                    onClick={() => setViewMode("summary")}
                  >
                    <LayoutList className="w-3 h-3" aria-hidden />
                    Resumo
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "fiori-on-off__btn inline-flex items-center gap-1",
                      viewMode === "detail" && "fiori-on-off__btn--selected",
                    )}
                    onClick={() => setViewMode("detail")}
                  >
                    <List className="w-3 h-3" aria-hidden />
                    Todos
                  </button>
                </div>
              </div>
            )}
            {hasSearched && filteredRows.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleExportExcel()}
                disabled={loading}
                className={PAGE_TOOLBAR_BTN_LABELED}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Excel</span>
              </Button>
            )}
          </div>
        }
      />

      <LogFilterPanel
        draft={draft}
        onDraftChange={(newDraft) => {
          setDraft(newDraft);
          // Sync mock selection with dashboard when it changes
          if (newDraft.mock !== draft.mock && newDraft.mock) {
            // Find the mock ID by name
            const mockId = Object.entries(mockMap).find(([, name]) => name === newDraft.mock)?.[0];
            if (mockId) {
              setDashboardMockId(mockId);
            }
          }
        }}
        textSearch={textSearch}
        onTextSearchChange={setTextSearch}
        onSearch={handleSearch}
        onClear={handleClear}
        isLoading={loading}
        mockOptions={Object.values(mockMap).sort()}
        objectOptions={objectOptions}
        hasDraftFilters={Object.entries(draft).some(([k, v]) => v !== "" && v !== (EMPTY as unknown as Record<string, string>)[k])}
        total={total}
        page={page}
        hasNext={hasNext}
        from={from}
        to={to}
        onPageChange={handlePageChange}
      />

      <div className="flex-1 overflow-auto min-h-0 px-4 md:px-8 pb-6">
        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-300">
            <Search className="w-10 h-10" />
            <p className="text-[11px] font-bold uppercase tracking-widest">Selecione os filtros e clique em Buscar</p>
          </div>
        ) : queryError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 px-8">
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-400">Erro na consulta</p>
            <p className="text-[10px] text-slate-400 text-center max-w-xl break-all">{queryError}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300 animate-pulse">Carregando...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-300">
            <FileSearch className="w-10 h-10" />
            <p className="text-[11px] font-bold uppercase tracking-widest">Nenhum registro encontrado</p>
            <p className="text-[10px]">Ajuste os filtros e tente novamente</p>
          </div>
        ) : viewMode === 'summary' ? (
          <LogSummaryTable
            summaryRows={summaryRows}
            filteredRows={filteredRows}
            expandedKeys={expandedKeys}
            onToggleExpand={toggleExpanded}
            onOpenDetail={setDetail}
            mockMap={mockMap}
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[860px] sm:min-w-[920px] lg:min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  {["ERRO ID", "CÓD. ERRO", "OBJECT", "MOCK", "INFOKEY", "MESSAGE", "DATA/HORA"].map((h, idx) => {
                    const stickyClass = idx === 0
                      ? "sticky left-0 z-20"
                      : idx === 1
                        ? "sticky left-[110px] z-20"
                        : "";
                    const widthClass = idx === 0 || idx === 1 ? "w-[110px] min-w-[110px]" : "";
                    return (
                      <th
                        key={h}
                        className={cn(
                          "sticky top-0 bg-slate-200 px-3 py-1 text-[10px] font-black text-slate-700 uppercase tracking-widest whitespace-nowrap border-b border-slate-400",
                          stickyClass,
                          widthClass,
                          idx === 1 && "border-r border-slate-300 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.35)]",
                        )}
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={row.id} onClick={() => setDetail(row)} className={cn("border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-200/60", i % 2 === 0 ? "bg-white" : "bg-slate-50/40")}>
                    <td className={cn("px-3 py-1 text-[11px] font-mono text-slate-700 whitespace-nowrap w-[110px] min-w-[110px]", i % 2 === 0 ? "bg-white" : "bg-slate-50", "sticky left-0 z-10")}>{row.errorId || "—"}</td>
                    <td className={cn("px-3 py-1 text-[11px] font-mono text-red-600 font-bold whitespace-nowrap w-[110px] min-w-[110px]", i % 2 === 0 ? "bg-white" : "bg-slate-50", "sticky left-[110px] z-10 border-r border-slate-200 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.25)]")}>{row.errorNumber || "—"}</td>
                    <td className="px-3 py-1 text-[11px] font-bold text-slate-800 uppercase whitespace-nowrap max-w-[130px] truncate">{row.object}</td>
                    <td className="px-3 py-1 text-[11px] text-slate-600 whitespace-nowrap max-w-[110px] truncate">{mockMap[row.mock] || row.mock}</td>
                    <td className="px-3 py-1 text-[11px] font-mono text-slate-500 whitespace-nowrap max-w-[120px] truncate">{row.oldKey || row.infoKey || "—"}</td>
                    <td className="px-3 py-1 text-[11px] text-slate-700 max-w-[300px] truncate" title={row.message}>{row.message || "—"}</td>
                    <td className="px-3 py-1 text-[11px] font-mono text-slate-500 whitespace-nowrap">{fmtTs(row.importedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasNext && !loading && (
        <div className="shrink-0 border-t border-amber-100 bg-amber-50 px-8 py-2">
          <p className="text-[10px] text-amber-700 font-bold">Limite de {PAGE_SIZE.toLocaleString("pt-BR")} registros atingido. Refine os filtros para visualizar resultados mais específicos.</p>
        </div>
      )}

      <LogDetailModal log={detail} open={!!detail} onClose={() => setDetail(null)} mockMap={mockMap} />
    </div>
  );
}
