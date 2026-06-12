"use client";

import { useState, useCallback } from 'react';
import type { AggregatedObject, Project, Mock } from '@/types/migration';
import { getProjectCompanyDisplay } from '@/lib/migration/project-company';
import { formatStatDate, formatStatTime, formatStatDuration, fmtEmailDate, fmtEmailTime, fmtEmailDuration } from '@/lib/export/stat-formatters';
import { buildDataRow, buildSheet, buildErrorSheet, downloadExcel } from '@/lib/export/excel-builders';
import { fetchErrorExportData } from '@/lib/export/error-summary';
import { buildErrorExportFileName, buildMockErrorsExportFileName } from '@/lib/export/log-export-meta';
import type { ErrorItemRow } from '@/lib/export/error-excel-sheets';
import type { StatEmailRow, ErrorEmailRow } from '@/components/email/email-compose-dialog';

interface UseDashboardExportDeps {
  db: any;
  effectiveMockId: string | null | undefined;
  migradorName: string;
  projects: Project[] | null | undefined;
  mocksByIdMap: Map<string, Mock>;
}

/**
 * Gerencia exportação Excel/ZIP, envio por e-mail e busca de sumários de erro
 */
export function useDashboardExport({
  db, effectiveMockId, migradorName, projects, mocksByIdMap,
}: UseDashboardExportDeps) {
  const [statExcelMode, setStatExcelMode] = useState<'single' | 'per-object'>('single');
  const [statErrorRows, setStatErrorRows] = useState<ErrorEmailRow[]>([]);
  const [isFetchingErrors, setIsFetchingErrors] = useState(false);
  const [excelExportProgress, setExcelExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isEmailComposeOpen, setIsEmailComposeOpen] = useState(false);

  const getStatEmpresa = useCallback((obj: AggregatedObject): string => {
    const proj = projects?.find((p: Project) => p.id === obj.projectId);
    return getProjectCompanyDisplay(proj);
  }, [projects]);

  const statMockName = mocksByIdMap.get(effectiveMockId || '')?.name || effectiveMockId || 'mock';

  const [statEmailRows, setStatEmailRows] = useState<StatEmailRow[]>([]);

  const buildStatEmailRows = useCallback((statReportRows: AggregatedObject[]): StatEmailRow[] => {
    return statReportRows.map((obj: AggregatedObject) => {
      const total = obj.processedRecordsCount || 0;
      const erro = obj.errorRecordsCount || 0;
      const ok = total - erro;
      const proj = projects?.find((p: Project) => p.id === obj.projectId);
      const empresa = getProjectCompanyDisplay(proj);
      return {
        migrador: migradorName || '',
        dataMigr: fmtEmailDate(obj.chargeStartTime ?? undefined),
        hrExecMig: fmtEmailTime(obj.chargeStartTime ?? undefined),
        empresa,
        objeto: obj.name,
        isInProgress: obj.isInProgress || false,
        ok,
        erro: erro > 0 ? erro : '-',
        processados: total,
        pctOk: total > 0 ? ((ok / total) * 100).toFixed(2).replace('.', ',') + '%' : '—',
        pctErro: total > 0 ? ((erro / total) * 100).toFixed(2).replace('.', ',') + '%' : '—',
        dataModif: fmtEmailDate(obj.chargeEndTime ?? undefined),
        horaModif: fmtEmailTime(obj.chargeEndTime ?? undefined),
        tempTrab: fmtEmailDuration(obj.currentChargeDurationMs),
      } satisfies StatEmailRow;
    });
  }, [migradorName, projects]);

  // ── Objetos com erros para fetch ────────────────────────────────────────
  const buildObjsWithErrors = useCallback((statReportRows: AggregatedObject[]) =>
    statReportRows
      .filter(o => (o.errorRecordsCount ?? 0) > 0)
      .map(o => ({
        name: o.name,
        mockId: (o.mockId ?? effectiveMockId) || '',
        migrador: migradorName || '—',
        dataMigr: formatStatDate(o.chargeStartTime ?? undefined),
        hrExecMig: formatStatTime(o.chargeStartTime ?? undefined),
        empresa: getStatEmpresa(o),
      })), [effectiveMockId, migradorName, getStatEmpresa]);

  // ── Excel export ────────────────────────────────────────────────────────
  const handleExportStatExcel = async (statReportRows: AggregatedObject[]) => {
    if (statReportRows.length === 0) return;
    const ExcelJS = (await import('exceljs')).default;

    const objsWithErrors = buildObjsWithErrors(statReportRows);
    let errorSummaries: ErrorEmailRow[] = [];
    let errorItemRows: ErrorItemRow[] = [];
    try {
      if (objsWithErrors.length > 0) {
        const { summaries, itemRows } = await fetchErrorExportData(db, objsWithErrors);
        errorSummaries = summaries;
        errorItemRows = itemRows;
      }
    } catch { /* segue sem erros se o fetch falhar */ }

    if (statExcelMode === 'single') {
      setExcelExportProgress({ current: 0, total: 1 });
      const wb = new ExcelJS.Workbook();
      buildSheet(wb, 'Estatística de Carga', statReportRows.map(o => buildDataRow(o, migradorName, getStatEmpresa)));
      await downloadExcel(wb, `${statMockName}-estatisticas-carga.xlsx`);
      if (errorSummaries.length > 0 || errorItemRows.length > 0) {
        const wbErr = new ExcelJS.Workbook();
        buildErrorSheet(wbErr, errorSummaries, errorItemRows);
        await downloadExcel(wbErr, buildMockErrorsExportFileName(statMockName, effectiveMockId || undefined));
      }
      setExcelExportProgress({ current: 1, total: 1 });
    } else {
      const JSZipMod = (await import('jszip')).default;
      const zip = new JSZipMod();
      setExcelExportProgress({ current: 0, total: statReportRows.length });
      for (let i = 0; i < statReportRows.length; i++) {
        const obj = statReportRows[i];
        const wb = new ExcelJS.Workbook();
        buildSheet(wb, obj.name, [buildDataRow(obj, migradorName, getStatEmpresa)]);
        const buffer = await wb.xlsx.writeBuffer();
        zip.file(`${statMockName}-${obj.name}-estatistica-carga.xlsx`, buffer);
        const objSummaries = errorSummaries.filter(e => e.objeto === obj.name);
        const objItems = errorItemRows.filter(i => i.objeto === obj.name);
        if (objSummaries.length > 0 || objItems.length > 0) {
          const wbErr = new ExcelJS.Workbook();
          buildErrorSheet(wbErr, objSummaries, objItems);
          const errBuffer = await wbErr.xlsx.writeBuffer();
          zip.file(buildErrorExportFileName(obj.name, statMockName, effectiveMockId || undefined), errBuffer);
        }
        setExcelExportProgress({ current: i + 1, total: statReportRows.length });
      }
      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      const blob = new Blob([zipBuffer], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${statMockName}-estatisticas-carga.zip`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    await new Promise(r => setTimeout(r, 1200));
    setExcelExportProgress(null);
  };

  // ── Email stat ──────────────────────────────────────────────────────────
  const handleEmailStat = async (statReportRows: AggregatedObject[]) => {
    setStatEmailRows(buildStatEmailRows(statReportRows));
    const objsWithErrors = buildObjsWithErrors(statReportRows);
    if (objsWithErrors.length > 0) {
      setIsFetchingErrors(true);
      try {
        const { summaries } = await fetchErrorExportData(db, objsWithErrors);
        setStatErrorRows(summaries);
      }
      catch { setStatErrorRows([]); }
      finally { setIsFetchingErrors(false); }
    } else {
      setStatErrorRows([]);
    }
    setIsEmailComposeOpen(true);
  };

  return {
    statExcelMode, setStatExcelMode,
    statErrorRows, isFetchingErrors, excelExportProgress,
    isEmailComposeOpen, setIsEmailComposeOpen,
    statEmailRows, statMockName, getStatEmpresa,
    handleExportStatExcel, handleEmailStat,
  };
}

// Re-export formatters para compatibilidade
export { formatStatDate, formatStatTime, formatStatDuration };
