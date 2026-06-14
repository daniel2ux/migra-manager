import { NextRequest, NextResponse } from "next/server";
import { aiPerformanceAnalystFlow } from "@/ai/flows/ai-performance-analyst";
import { requireAuthenticatedCaller } from "@/lib/api/caller-auth";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`ai:performance:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em instantes." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const verification = await requireAuthenticatedCaller(body, req);
    if (verification.error || !verification.decoded) {
      return NextResponse.json({ error: verification.error ?? "Não autorizado." }, { status: 403 });
    }

    const userRate = checkRateLimit(`ai:performance:user:${verification.decoded.uid}`, 20, 60_000);
    if (!userRate.allowed) {
      return NextResponse.json(
        { error: "Limite de análises por usuário atingido. Aguarde um momento." },
        { status: 429, headers: { "Retry-After": String(userRate.retryAfterSec) } },
      );
    }

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
      referenceMockName: String(referenceMockName).slice(0, 200),
      targetMockName: String(targetMockName).slice(0, 200),
      objects: objects.slice(0, 40),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI Performance] Error:", error);
    return NextResponse.json({ error: "Erro ao realizar análise de performance." }, { status: 500 });
  }
}
