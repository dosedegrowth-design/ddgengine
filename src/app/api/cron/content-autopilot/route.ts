/**
 * GET /api/cron/content-autopilot — o PILOTO AUTOMÁTICO.
 *
 * Roda 1×/dia (vercel.json). Pra cada site com autopilot_enabled:
 *  1. solta travas órfãs (geração que falhou) e reconcilia cobertas
 *  2. se o universo está velho (>7d), re-pesquisa as palavras (semanal)
 *  3. se ainda não bateu a cota da semana (autopilot_posts_per_week):
 *     - pega a MELHOR oportunidade não-coberta e TRAVA
 *     - dispara a geração mirada naquela palavra (7 passes → gates → publica)
 *
 * Auth: CRON_SECRET (Bearer). ?dry=1 simula sem gerar. ?site=ID roda 1 site.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generatePostMultiPass } from "@/lib/ai/multi-pass";
import {
  refreshKeywordUniverse,
  pickAndLockNextOpportunity,
  releaseStaleQueued,
  reconcileQueued,
  markKeywordCovered,
} from "@/lib/seo/keyword-universe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Quantos posts gerar por invocação (evita timeout com muitos sites).
// Geração é síncrona (~30-60s cada). Para escala maior, migrar pra Inngest.
const MAX_PER_RUN = 3;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const bypass = url.searchParams.get("key") === process.env.GOOGLE_ADS_SETUP_KEY;
  if (
    !bypass &&
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dry = url.searchParams.get("dry") === "1";
  const onlySite = url.searchParams.get("site");
  const sb = createServiceClient();

  let q = sb
    .from("sites")
    .select(
      "id, organization_id, autopilot_enabled, autopilot_posts_per_week, keyword_universe_synced_at"
    )
    .eq("autopilot_enabled", true);
  if (onlySite) q = q.eq("id", onlySite);
  const { data: sites } = await q;

  const report: Array<Record<string, unknown>> = [];
  let generatedThisRun = 0;

  for (const site of sites ?? []) {
    const siteId = site.id as string;
    const orgId = site.organization_id as string;
    const perWeek = (site.autopilot_posts_per_week as number) ?? 3;
    const r: Record<string, unknown> = { site: siteId };

    try {
      // 1) housekeeping: fecha o loop (queued→covered) e solta órfãs
      r.reconciled = await reconcileQueued(siteId);
      await releaseStaleQueued(siteId);

      // 2) universo velho? re-pesquisa (semanal)
      const syncedAt = site.keyword_universe_synced_at
        ? new Date(site.keyword_universe_synced_at as string).getTime()
        : 0;
      if (Date.now() - syncedAt > WEEK_MS) {
        const refresh = await refreshKeywordUniverse(orgId, siteId);
        r.refreshed = refresh.ok ? refresh.discovered : `erro: ${refresh.error}`;
      }

      // 3) cota da semana
      const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();
      const { count: postsThisWeek } = await sb
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("site_id", siteId)
        .gte("created_at", weekAgo)
        .neq("status", "archived");
      r.postsThisWeek = postsThisWeek ?? 0;
      r.quota = perWeek;

      if ((postsThisWeek ?? 0) >= perWeek) {
        r.action = "cota atingida — pula";
        report.push(r);
        continue;
      }

      // 4) próxima oportunidade
      const pick = dry
        ? await (async () => {
            const { data } = await sb
              .from("keyword_universe")
              .select("keyword, volume, opportunity_score")
              .eq("site_id", siteId)
              .eq("status", "opportunity")
              .order("opportunity_score", { ascending: false })
              .limit(1)
              .maybeSingle();
            return data
              ? { keyword: data.keyword as string, volume: data.volume as number, score: data.opportunity_score as number }
              : null;
          })()
        : await pickAndLockNextOpportunity(siteId);

      if (!pick) {
        r.action = "sem oportunidade na fila";
        report.push(r);
        continue;
      }

      r.keyword = pick.keyword;
      r.volume = pick.volume;
      r.score = pick.score;

      if (dry) {
        r.action = "DRY — geraria este post";
      } else if (generatedThisRun >= MAX_PER_RUN) {
        // já gerou o máximo nesta invocação — solta a trava pro próximo run
        await sb
          .from("keyword_universe")
          .update({ status: "opportunity" })
          .eq("site_id", siteId)
          .eq("keyword", pick.keyword);
        r.action = "limite por run — fica pro próximo";
      } else {
        try {
          const post = await generatePostMultiPass({
            siteId,
            type: "long_form",
            targetKeyword: pick.keyword,
          });
          await markKeywordCovered(siteId, pick.keyword, post.postId);
          await sb
            .from("sites")
            .update({ autopilot_last_run_at: new Date().toISOString() })
            .eq("id", siteId);
          generatedThisRun++;
          r.action = "post gerado";
          r.postId = post.postId;
          r.title = post.title;
        } catch (genErr) {
          // solta a trava pra tentar de novo no próximo run
          await sb
            .from("keyword_universe")
            .update({ status: "opportunity" })
            .eq("site_id", siteId)
            .eq("keyword", pick.keyword);
          r.action = "falha na geração";
          r.genError = genErr instanceof Error ? genErr.message : "erro";
        }
      }
    } catch (e) {
      r.error = e instanceof Error ? e.message : "erro";
    }
    report.push(r);
  }

  return NextResponse.json({ ok: true, dry, sites: report.length, report });
}
