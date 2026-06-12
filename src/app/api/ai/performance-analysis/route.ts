
import { NextRequest, NextResponse } from "next/server";
import { aiPerformanceAnalystFlow } from "@/ai/flows/ai-performance-analyst";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { referenceMockName, targetMockName, objects } = body;

    if (!referenceMockName || !targetMockName || !objects || !Array.isArray(objects)) {
      return NextResponse.json(
        { error: "Parâmetros inválidos. Informe referenceMockName, targetMockName e a lista de objetos." },
        { status: 400 },
      );
    }

    const hasAiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    
    if (!hasAiKey) {
      return NextResponse.json(
        { error: "Chave de API da IA não configurada no ambiente." },
        { status: 503 },
      );
    }

    const result = await aiPerformanceAnalystFlow({
      referenceMockName,
      targetMockName,
      objects: objects.slice(0, 40), // Limite para evitar estouro de tokens no prompt
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI Performance] Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao realizar análise de performance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
