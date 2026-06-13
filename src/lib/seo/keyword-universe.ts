/**
 * keyword-universe — o "mapa de oportunidades" de palavra-chave por site.
 *
 * 1×/semana (ou sob demanda) expande os temas do briefing no Keyword Planner,
 * pontua cada palavra por OPORTUNIDADE (volume × ganhabilidade × tendência),
 * marca as que já viraram post como "cobertas", e guarda tudo. Alimenta as
 * Sugestões (e, no futuro, o auto-pilot diário).
 *
 * Pesquisa = semanal (volume não muda dia a dia). Geração = diária (pega da
 * fila). Por isso o universo fica salvo, não é re-pesquisado a cada post.
 */
import { createServiceClient } from "@/lib/supabase/server";
import { generateKeywordIdeas } from "./keyword-research";

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.,]+$/, "")
    .replace(/\s+/g, " ");
}

/**
 * Score de oportunidade 0-100.
 *  - volume (log): 1k≈60, 10k≈80, 100k≈100
 *  - ganhabilidade: concorrência baixa = melhor (100 - índice)
 *  - tendência: subindo dá bônus
 * Pesos: 45% volume, 45% ganhabilidade, 10% tendência.
 */
export function opportunityScore(
  volume: number,
  competitionIndex: number | null,
  trend: number | null
): number {
  if (!volume || volume <= 0) return 0;
  const volScore = Math.min(100, (Math.log10(volume + 1) / 5) * 100);
  const comp = competitionIndex == null ? 50 : competitionIndex;
  const winnability = 100 - comp;
  const t = trend == null ? 0 : Math.max(-20, Math.min(20, trend));
  const trendScore = ((t + 20) / 40) * 100;
  return Math.round(volScore * 0.45 + winnability * 0.45 + trendScore * 0.1);
}

interface RefinedBriefShape {
  seo?: { primary_keywords?: string[]; secondary_keywords?: string[] };
}

export interface RefreshResult {
  ok: boolean;
  discovered?: number;
  opportunities?: number;
  covered?: number;
  error?: string;
}

/**
 * Pesquisa os temas do briefing no Keyword Planner e (re)popula o universo.
 */
export async function refreshKeywordUniverse(
  orgId: string,
  siteId: string
): Promise<RefreshResult> {
  const sb = createServiceClient();

  const { data: briefing } = await sb
    .from("briefings")
    .select("refined_brief")
    .eq("organization_id", orgId)
    .maybeSingle();
  const brief = (briefing?.refined_brief as RefinedBriefShape | null) ?? null;

  const seeds = [
    ...(brief?.seo?.primary_keywords ?? []),
    ...(brief?.seo?.secondary_keywords ?? []),
  ]
    .filter(Boolean)
    .slice(0, 10);

  if (seeds.length === 0) {
    return { ok: false, error: "Sem palavras-chave no briefing pra pesquisar." };
  }

  const res = await generateKeywordIdeas(seeds, 80);
  if (!res.ok) return { ok: false, error: res.error };

  // Posts existentes → marca palavras já cobertas
  const { data: posts } = await sb
    .from("posts")
    .select("id, target_keyword, title")
    .eq("site_id", siteId)
    .neq("status", "archived");

  const coveredByKw = new Map<string, string>();
  const titles: string[] = [];
  for (const p of posts ?? []) {
    if (p.target_keyword) coveredByKw.set(norm(p.target_keyword as string), p.id as string);
    if (p.title) titles.push(norm(p.title as string));
  }

  const nowIso = new Date().toISOString();
  let coveredCount = 0;

  const rows = res.ideas.map((k) => {
    const nk = norm(k.keyword);
    const coveredPost = coveredByKw.get(nk) ?? null;
    const inTitle = titles.some((t) => t.includes(nk));
    const isCovered = Boolean(coveredPost) || inTitle;
    if (isCovered) coveredCount++;
    return {
      site_id: siteId,
      keyword: k.keyword,
      volume: k.volume,
      competition: k.competition,
      competition_index: k.competitionIndex,
      trend: k.trend,
      source_seed: seeds[0],
      opportunity_score: opportunityScore(k.volume, k.competitionIndex, k.trend),
      status: isCovered ? "covered" : "opportunity",
      post_id: coveredPost,
      updated_at: nowIso,
    };
  });

  const { error } = await sb
    .from("keyword_universe")
    .upsert(rows, { onConflict: "site_id,keyword" });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    discovered: rows.length,
    opportunities: rows.length - coveredCount,
    covered: coveredCount,
  };
}

export interface OpportunityRow {
  keyword: string;
  volume: number;
  competition: string | null;
  competition_index: number | null;
  trend: number | null;
  opportunity_score: number;
}

/** Top oportunidades (não cobertas) ordenadas por score. */
export async function getTopOpportunities(
  siteId: string,
  limit = 8
): Promise<OpportunityRow[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("keyword_universe")
    .select("keyword, volume, competition, competition_index, trend, opportunity_score")
    .eq("site_id", siteId)
    .eq("status", "opportunity")
    .order("opportunity_score", { ascending: false })
    .limit(limit);
  return (data as OpportunityRow[]) ?? [];
}

/** Resumo do universo pro relatório (contagens + cobertura). */
export async function getUniverseSummary(siteId: string): Promise<{
  total: number;
  covered: number;
  opportunities: number;
  coveragePct: number;
}> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("keyword_universe")
    .select("status")
    .eq("site_id", siteId);
  const rows = data ?? [];
  const total = rows.length;
  const covered = rows.filter((r) => r.status === "covered").length;
  const opportunities = rows.filter((r) => r.status === "opportunity").length;
  const coveragePct = total > 0 ? Math.round((covered / total) * 100) : 0;
  return { total, covered, opportunities, coveragePct };
}
