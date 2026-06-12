import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/supabase/admin";
import { verifyCallerRole } from "@/lib/admin-auth";
import { shouldRemoveFromMasterCatalog, normalizeMasterCatalogStatus } from "@/lib/migration/master-catalog-status";

export const maxDuration = 300;
export const runtime = "nodejs";

const BATCH_SIZE = 400;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callerToken, confirm, dryRun } = body as {
      callerToken?: string;
      confirm?: boolean;
      dryRun?: boolean;
    };

    if (!callerToken) {
      return NextResponse.json({ error: "callerToken é obrigatório." }, { status: 400 });
    }

    if (!confirm) {
      return NextResponse.json(
        { error: "Confirmação obrigatória. Envie { confirm: true }." },
        { status: 400 },
      );
    }

    const verification = await verifyCallerRole(callerToken, ["master"]);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? "Não autorizado." }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { data: allRows, error } = await admin.from("master_objects").select("id, name, status");
    if (error) throw error;

    const scanned = allRows?.length ?? 0;
    const toDelete = (allRows ?? [])
      .filter((row) => shouldRemoveFromMasterCatalog((row as { status?: string }).status))
      .map((row) => ({
        id: String((row as { id: string }).id),
        name: String((row as { name?: string }).name || "(sem nome)"),
        status: normalizeMasterCatalogStatus((row as { status?: string }).status),
      }));

    const byStatus = toDelete.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    if (dryRun || toDelete.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        scanned,
        deletedCount: 0,
        wouldDelete: toDelete.length,
        byStatus,
        sample: toDelete.slice(0, 50),
      });
    }

    let deletedCount = 0;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const chunk = toDelete.slice(i, i + BATCH_SIZE).map((r) => r.id);
      const { error: delError } = await admin.from("master_objects").delete().in("id", chunk);
      if (delError) throw delError;
      deletedCount += chunk.length;
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      scanned,
      deletedCount,
      byStatus,
    });
  } catch (err) {
    console.error("[clean-master-catalog]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 },
    );
  }
}
