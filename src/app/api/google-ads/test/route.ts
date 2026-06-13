/**
 * /api/google-ads/test — diagnóstico: roda uma busca real e GRAVA o resultado
 * (ou o erro cru do Google) em app_config['google_ads_last_test']. Assim dá
 * pra inspecionar o resultado pelo banco sem depender de ler a tela.
 *
 * Autoriza por ?key=GOOGLE_ADS_SETUP_KEY (bootstrap one-time).
 */
import { NextRequest, NextResponse } from "next/server";
import { generateKeywordIdeas } from "@/lib/seo/keyword-research";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.GOOGLE_ADS_SETUP_KEY || key !== process.env.GOOGLE_ADS_SETUP_KEY) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const seed = new URL(req.url).searchParams.get("seed") ?? "ração para cães";
  const result = await generateKeywordIdeas([seed], 8);

  const summary = result.ok
    ? { ok: true, count: result.ideas.length, sample: result.ideas.slice(0, 5) }
    : { ok: false, error: result.error, notConfigured: result.notConfigured ?? false };

  try {
    const sb = createServiceClient();
    await sb.from("app_config").upsert({
      key: "google_ads_last_test",
      value: JSON.stringify({ seed, ...summary, at: new Date().toISOString() }),
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* ignora falha de gravação */
  }

  return NextResponse.json(summary);
}
