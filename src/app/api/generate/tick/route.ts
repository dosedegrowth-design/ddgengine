/**
 * GET/POST /api/generate/tick — driver da geração resumível.
 *
 * Chamado a cada 1min por um cron (pg_cron no Supabase). Pega o post
 * 'generating' mais antigo com job pendente e avança quantos passes couberem
 * em ~50s. Quando o post termina, finaliza (gates + publica).
 *
 * Auth: CRON_SECRET (Bearer) OU ?key=GOOGLE_ADS_SETUP_KEY (pra teste manual).
 */
import { NextRequest, NextResponse } from "next/server";
import { tickOldestPending } from "@/lib/ai/generate-resumable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const key = new URL(req.url).searchParams.get("key");
  const ok =
    (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) ||
    (process.env.GOOGLE_ADS_SETUP_KEY && key === process.env.GOOGLE_ADS_SETUP_KEY);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // budget baixo = 1 passe por tick (cada passe reescreve o artigo ~30-50s;
  // garante nunca passar dos 60s do serverless). O cron 1min avança o resto.
  const result = await tickOldestPending(8000);
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
