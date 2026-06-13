/**
 * /api/keywords/refresh-universe — (re)popula o universo de palavra-chave de
 * um site. Gated por ?key=GOOGLE_ADS_SETUP_KEY. Base do futuro cron semanal.
 *
 * Params: ?key=...&org=<orgId>&site=<siteId>
 */
import { NextRequest, NextResponse } from "next/server";
import { refreshKeywordUniverse, getUniverseSummary } from "@/lib/seo/keyword-universe";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!process.env.GOOGLE_ADS_SETUP_KEY || key !== process.env.GOOGLE_ADS_SETUP_KEY) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const org = url.searchParams.get("org");
  const site = url.searchParams.get("site");
  if (!org || !site) {
    return NextResponse.json({ error: "Faltam org e site." }, { status: 400 });
  }

  const result = await refreshKeywordUniverse(org, site);
  const summary = result.ok ? await getUniverseSummary(site) : null;
  return NextResponse.json({ result, summary });
}
