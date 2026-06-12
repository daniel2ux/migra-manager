import { getDocs, query, collection, where, limit } from "firebase/firestore";
import type { ErrorEmailRow } from "@/components/email/email-compose-dialog";
import type { ErrorItemRow } from "@/lib/export/error-excel-sheets";
import { formatImportedAtField } from "@/lib/export/error-excel-sheets";

export interface ErrorObj {
  name: string;
  mockId: string;
  migrador: string;
  dataMigr: string;
  hrExecMig: string;
  empresa: string;
}

function docToErrorItemRow(data: Record<string, unknown>, obj: ErrorObj): ErrorItemRow {
  return {
    migrador: obj.migrador,
    dataMigr: obj.dataMigr,
    hrExecMig: obj.hrExecMig,
    empresa: obj.empresa,
    objeto: obj.name,
    seq: data.seq !== undefined && data.seq !== null ? (data.seq as number | string) : "—",
    infoKey: String(data.oldKey ?? (data as { infoKey?: string }).infoKey ?? "—"),
    status: String(data.status ?? "—"),
    errorId: String(data.errorId ?? "—"),
    errorNumber: String(data.errorNumber ?? "—"),
    message: String(data.message ?? "—"),
    filename: String(data.filename ?? "—"),
    importedAt: formatImportedAtField(data.importedAt),
  };
}

async function fetchErrorExportDataInternal(db: any, objects: ErrorObj[]): Promise<{
  summaries: ErrorEmailRow[];
  itemRows: ErrorItemRow[];
}> {
  if (!db) return { summaries: [], itemRows: [] };
  const summaries: ErrorEmailRow[] = [];
  const itemRows: ErrorItemRow[] = [];

  for (const obj of objects) {
    const q = query(
      collection(db, "migrationLogs"),
      where("mock", "==", obj.mockId),
      where("object", "==", obj.name),
      limit(500),
    );
    const snap = await getDocs(q);

    const summaryMap = new Map<string, { errorId: string; errorNumber: string; count: number; sample: string }>();
    snap.docs.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      itemRows.push(docToErrorItemRow(data, obj));
      const key = String(data.errorNumber || data.errorId || "–");
      const ex = summaryMap.get(key);
      if (ex) ex.count++;
      else
        summaryMap.set(key, {
          errorId: String(data.errorId || "–"),
          errorNumber: String(data.errorNumber || "–"),
          count: 1,
          sample: String(data.message || "–"),
        });
    });

    Array.from(summaryMap.values())
      .sort((a, b) => b.count - a.count)
      .forEach((s) =>
        summaries.push({
          migrador: obj.migrador,
          dataMigr: obj.dataMigr,
          hrExecMig: obj.hrExecMig,
          empresa: obj.empresa,
          objeto: obj.name,
          errorId: s.errorId,
          errorNumber: s.errorNumber,
          count: s.count,
          message: s.sample,
        }),
      );
  }

  return { summaries, itemRows };
}

/**
 * Busca sumários de erro para objetos com falhas na carga
 */
export async function fetchErrorSummaries(db: any, objects: ErrorObj[]): Promise<ErrorEmailRow[]> {
  const { summaries } = await fetchErrorExportDataInternal(db, objects);
  return summaries;
}

/**
 * Sumário + linhas de detalhe (cada registro importado) para planilha com abas por tipo de erro.
 */
export async function fetchErrorExportData(
  db: any,
  objects: ErrorObj[],
): Promise<{ summaries: ErrorEmailRow[]; itemRows: ErrorItemRow[] }> {
  return fetchErrorExportDataInternal(db, objects);
}
