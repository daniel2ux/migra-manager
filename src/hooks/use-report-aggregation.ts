"use client";

import { useMemo } from "react";
import { normalizeMasterCatalogName } from "@/lib/migration/master-catalog";
import { isObjectParallelLoad } from "@/lib/migration/sequence-utils";

interface AggregatedObject {
  name: string;
  target: number;
  processed: number;
  error: number;
  success: number;
  durationMs: number;
  chargeGroup?: string;
  chargeOrder?: string | number;
  isParallel?: boolean;
  [key: string]: any;
}

interface ReportTotals {
  target: number;
  processed: number;
  success: number;
  error: number;
  durationMs: number;
}

export interface ReportData {
  projectName: string;
  mockName?: string;
  mockStart?: string;
  mockEnd?: string;
  company?: string;
  date: string;
  totals: ReportTotals;
  objects: AggregatedObject[];
  objectsCount: number;
}

function deduplicateObjects(objects: any[]): Map<string, any> {
  const projectObjectMap = new Map<string, any>();

  objects.forEach((obj) => {
    const pid = obj.projectId || "default";
    const name = obj.name || "Sem Nome";
    const key = `${pid}_${name}_${obj.chargeGroup || ""}_${obj.chargeOrder || ""}`;
    const existing = projectObjectMap.get(key);

    const objProcessed = Number(obj.processedRecordsCount) || 0;
    const existingProcessed = Number(existing?.processedRecordsCount) || 0;

    if (
      !existing ||
      objProcessed >= existingProcessed ||
      (obj.chargeEndTime && !existing.chargeEndTime)
    ) {
      projectObjectMap.set(key, obj);
    }
  });

  return projectObjectMap;
}

function aggregateByName(
  projectObjectMap: Map<string, any>,
): Map<string, AggregatedObject> {
  const aggregatedMap = new Map<string, AggregatedObject>();

  Array.from(projectObjectMap.values()).forEach((obj) => {
    const name = (obj.name || "Sem Nome").trim();
    const key = name.toUpperCase();

    const target = Number(obj.targetRecordsCount) || 0;
    const processed = Number(obj.processedRecordsCount) || 0;
    const error = Number(obj.errorRecordsCount) || 0;
    const duration = Number(obj.currentChargeDurationMs) || 0;
    const success = Math.max(0, processed - error);

    const existing = aggregatedMap.get(key);
    if (existing) {
      existing.target += target;
      existing.processed += processed;
      existing.error += error;
      existing.success += success;
      existing.durationMs += duration;

      if (processed > existing.processed) {
        existing.chargeGroup = obj.chargeGroup;
        existing.chargeOrder = obj.chargeOrder;
        existing.isParallel = obj.isParallel;
      }
    } else {
      aggregatedMap.set(key, {
        ...obj,
        name,
        target,
        processed,
        error,
        success,
        durationMs: duration,
      });
    }
  });

  return aggregatedMap;
}

function formatChargeOrder(chargeOrderRaw: any): string | undefined {
  if (!chargeOrderRaw) return undefined;
  const str = String(chargeOrderRaw);
  if (str.includes(".")) return str;
  if (isNaN(parseInt(str))) return str;
  return `${String(parseInt(str)).padStart(2, "0")}.00`;
}

/** Índice por nome normalizado; em duplicatas no catálogo, prefere registro ATIVO. */
export function buildMasterCatalogByName(masters: any[] | null | undefined): Map<string, any> {
  const map = new Map<string, any>();
  if (!masters) return map;

  for (const master of masters) {
    const key = normalizeMasterCatalogName(master.name ?? "");
    if (!key) continue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, master);
      continue;
    }

    const existingInactive = existing.status === "INATIVO";
    const incomingActive = master.status !== "INATIVO";
    if (existingInactive && incomingActive) {
      map.set(key, master);
    }
  }

  return map;
}

function enrichWithMasterCatalog(
  objects: AggregatedObject[],
  masterCatalogByName: Map<string, any>,
): AggregatedObject[] {
  return objects.map((obj) => {
    const key = normalizeMasterCatalogName(obj.name ?? "");
    const master = key ? masterCatalogByName.get(key) : undefined;
    const masterParallel = master ? isObjectParallelLoad(master) : false;

    return {
      ...obj,
      chargeGroup: master?.chargeGroup || obj.chargeGroup,
      chargeOrder: formatChargeOrder(master?.chargeOrder || obj.chargeOrder),
      isParallel: master ? masterParallel : obj.isParallel,
      targetRecordsCount: obj.target,
      processedRecordsCount: obj.processed,
      errorRecordsCount: obj.error,
      success: obj.success,
      currentChargeDurationMs: obj.durationMs,
    };
  });
}

function calculateTotals(objects: AggregatedObject[]): ReportTotals {
  return objects.reduce(
    (acc, obj) => ({
      target: acc.target + obj.target,
      processed: acc.processed + obj.processed,
      success: acc.success + obj.success,
      error: acc.error + obj.error,
      durationMs: acc.durationMs + obj.durationMs,
    }),
    { target: 0, processed: 0, success: 0, error: 0, durationMs: 0 },
  );
}

interface UseReportAggregationParams {
  objects: any[] | null;
  masterCatalog: any[] | null;
  projects: any[] | null;
  mockData: any | null;
  selectedProjectId: string;
}

export function useReportAggregation({
  objects,
  masterCatalog,
  projects,
  mockData,
  selectedProjectId,
}: UseReportAggregationParams): ReportData | null {
  const masterCatalogByName = useMemo(
    () => buildMasterCatalogByName(masterCatalog),
    [masterCatalog],
  );

  return useMemo(() => {
    if (!objects) return null;

    const deduped = deduplicateObjects(objects);
    const aggregated = aggregateByName(deduped);
    const finalObjectsList = enrichWithMasterCatalog(
      Array.from(aggregated.values()),
      masterCatalogByName,
    );

    const totals = calculateTotals(finalObjectsList);

    const project =
      selectedProjectId !== "all"
        ? projects?.find((p) => p.id === selectedProjectId)
        : null;

    return {
      projectName: project?.name || "Todos os Projetos Ativos",
      mockName: mockData?.name,
      mockStart: mockData?.startDate,
      mockEnd: mockData?.endDate,
      company: project?.company || "H2D Consultoria",
      date: new Date().toLocaleDateString("pt-BR"),
      totals,
      objects: finalObjectsList.sort((a, b) =>
        (a.name || "").localeCompare(b.name || ""),
      ),
      objectsCount: finalObjectsList.length,
    };
  }, [objects, masterCatalogByName, projects, mockData, selectedProjectId]);
}
