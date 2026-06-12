import { NextRequest, NextResponse } from "next/server";
import { aiDescriptionGenerator } from "@/ai/flows/ai-description-generator";

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
    const body = await req.json();
    const type = body?.type;
    const keywords = String(body?.keywords ?? "").trim();

    if (!type || !["project", "mock", "object"].includes(type) || !keywords) {
      return NextResponse.json(
        { error: "Parâmetros inválidos. Informe type e keywords." },
        { status: 400 },
      );
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
    const message = error instanceof Error ? error.message : "Erro ao gerar descrição.";
    if (message.includes("GEMINI_API_KEY") || message.includes("GOOGLE_API_KEY")) {
      return NextResponse.json({
        description: buildFallbackDescription("mock", "migração"),
        source: "fallback",
      });
    }
    return NextResponse.json({ error: "Erro interno ao gerar descrição." }, { status: 500 });
  }
}

