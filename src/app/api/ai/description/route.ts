import { NextRequest, NextResponse } from "next/server";
import { aiDescriptionGenerator } from "@/ai/flows/ai-description-generator";
import { requireAdminOrMasterCaller } from "@/lib/api/caller-auth";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

function buildFallbackDescription(type: "project" | "mock" | "object", keywords: string): string {
  const scope = keywords.trim().toUpperCase();
  if (type === "project") {
    return `Projeto orientado a ${scope}, com foco em planejamento técnico, controle de execução e estabilidade operacional durante o ciclo de migração.`;
  }
  if (type === "mock") {
    return `Mock de validação para ${scope}, destinada a simular cenários de carga e aferir consistência técnica antes da janela produtiva.`;
  }
  return `Objeto técnico relacionado a ${scope}, com papel funcional na cadeia de migração e dependências tratadas para execução controlada.`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`ai:description:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em instantes." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const verification = await requireAdminOrMasterCaller(body, req);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? "Não autorizado." }, { status: 403 });
    }

    const userRate = checkRateLimit(`ai:description:user:${verification.decoded.uid}`, 30, 60_000);
    if (!userRate.allowed) {
      return NextResponse.json(
        { error: "Limite de gerações por usuário atingido. Aguarde um momento." },
        { status: 429, headers: { "Retry-After": String(userRate.retryAfterSec) } },
      );
    }

    const type = body?.type;
    const keywords = String(body?.keywords ?? "").trim();

    if (!type || !["project", "mock", "object"].includes(type) || !keywords) {
      return NextResponse.json(
        { error: "Parâmetros inválidos. Informe type e keywords." },
        { status: 400 },
      );
    }

    if (keywords.length > 500) {
      return NextResponse.json({ error: "Keywords muito longas." }, { status: 400 });
    }

    const hasAiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    if (!hasAiKey) {
      return NextResponse.json({
        description: buildFallbackDescription(type, keywords),
        source: "fallback",
      });
    }

    const result = await aiDescriptionGenerator({ type, keywords });
    return NextResponse.json({ description: result.description, source: "ai" });
  } catch (error) {
    console.error("[api/ai/description]", error);
    return NextResponse.json({ error: "Erro interno ao gerar descrição." }, { status: 500 });
  }
}
