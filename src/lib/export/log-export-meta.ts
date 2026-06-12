import { formatStatDate, formatStatTime } from "@/lib/export/stat-formatters";

export type LogExportMeta = {
  migrador: string;
  dataMigr: string;
  hrExecMig: string;
  empresa: string;
};

function coerceChargeStartTime(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "object" && value !== null) {
    const anyValue = value as { seconds?: number; _seconds?: number; toDate?: () => Date };
    if (typeof anyValue.toDate === "function") {
      try {
        return anyValue.toDate().toISOString();
      } catch {
        return undefined;
      }
    }
    const seconds = anyValue.seconds ?? anyValue._seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return undefined;
}

export function buildLogExportMeta(params: {
  migradorName?: string | null;
  chargeStartTime?: unknown;
  empresa?: string | null;
}): LogExportMeta {
  const chargeStart = coerceChargeStartTime(params.chargeStartTime);
  const dataMigr = formatStatDate(chargeStart);
  const hrExecMig = formatStatTime(chargeStart);
  return {
    migrador: params.migradorName?.trim() || "—",
    dataMigr: dataMigr || "—",
    hrExecMig: hrExecMig || "—",
    empresa: params.empresa?.trim() || "—",
  };
}

/** Segmento seguro para nome de arquivo (preserva letras, números, hífen e underscore). */
export function sanitizeExportFileSegment(value: string | undefined | null): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Padrão consolidado: {mock}-erros-carga.xlsx */
export function buildMockErrorsExportFileName(
  mockName?: string | null,
  mockId?: string | null,
): string {
  const mockSegment = sanitizeExportFileSegment(mockName) || sanitizeExportFileSegment(mockId) || "mock";
  return `${mockSegment}-erros-carga.xlsx`;
}

/** Padrão por objeto: {mock}-{objeto}-erros-carga.xlsx — prioriza nome legível da mock, não o id. */
export function buildErrorExportFileName(
  objectName: string,
  mockName?: string | null,
  mockId?: string | null,
): string {
  const mockSegment = sanitizeExportFileSegment(mockName) || sanitizeExportFileSegment(mockId) || "mock";
  const objectSegment = sanitizeExportFileSegment(objectName) || "objeto";
  return `${mockSegment}-${objectSegment}-erros-carga.xlsx`;
}

/** Export da tela Consulta de logs: múltiplos objetos / filtros. */
export function buildConsultaLogsExportFileName(params: {
  projectName?: string | null;
  mockName?: string | null;
  objectFilter?: string | null;
}): string {
  const projectSegment = sanitizeExportFileSegment(params.projectName) || "projeto";
  const mockSeg = params.mockName?.trim() ? sanitizeExportFileSegment(params.mockName) : "";
  const objSeg = params.objectFilter?.trim() ? sanitizeExportFileSegment(params.objectFilter) : "";
  const tail = new Date().toISOString().slice(0, 10);
  const mid = [mockSeg, objSeg].filter(Boolean).join("_");
  return mid
    ? `consulta-logs_${projectSegment}_${mid}_${tail}.xlsx`
    : `consulta-logs_${projectSegment}_${tail}.xlsx`;
}
