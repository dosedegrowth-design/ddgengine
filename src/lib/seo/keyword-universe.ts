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

// Stopwords PT pra dedup sem\u00e2ntico (varia\u00e7\u00f5es = mesmo tema)
const STOP = new Set([
  "a", "o", "as", "os", "de", "da", "do", "das", "dos", "em", "no", "na",
  "nos", "nas", "para", "pra", "por", "com", "e", "ou", "que", "um", "uma",
  "ao", "aos", "the", "of",
]);

/**
 * Chave can\u00f4nica: tokens significativos ordenados. Junta "doen\u00e7a de pele em
 * cachorro" / "no cachorro" / "cachorro doen\u00e7a pele" no mesmo tema.
 */
function canonicalKey(keyword: string): string {
  return norm(keyword)
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .sort()
    .join(" ");
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

  // DEDUP SEMÂNTICO: agrupa por chave canônica, mantém a de maior volume.
  const byCanon = new Map<string, (typeof res.ideas)[number]>();
  for (const idea of res.ideas) {
    const ck = canonicalKey(idea.keyword);
    if (!ck) continue;
    const cur = byCanon.get(ck);
    if (!cur || idea.volume > cur.volume) byCanon.set(ck, idea);
  }
  const deduped = [...byCanon.values()];

  // Posts existentes → marca palavras já cobertas (por chave canônica)
  const { data: posts } = await sb
    .from("posts")
    .select("id, target_keyword, title")
    .eq("site_id", siteId)
    .neq("status", "archived");

  const coveredCanon = new Map<string, string>();
  for (const p of posts ?? []) {
    if (p.target_keyword) coveredCanon.set(canonicalKey(p.target_keyword as string), p.id as string);
    if (p.title) coveredCanon.set(canonicalKey(p.title as string), p.id as string);
  }

  // Status atual (preserva 'queued' que ainda não virou post)
  const { data: existing } = await sb
    .from("keyword_universe")
    .select("keyword, status")
    .eq("site_id", siteId);
  const prevStatus = new Map<string, string>();
  for (const e of existing ?? []) prevStatus.set(norm(e.keyword as string), e.status as string);

  const nowIso = new Date().toISOString();
  let coveredCount = 0;

  const rows = deduped.map((k) => {
    const ck = canonicalKey(k.keyword);
    const coveredPost = coveredCanon.get(ck) ?? null;
    const prev = prevStatus.get(norm(k.keyword));
    let status: string;
    if (coveredPost) {
      status = "covered";
      coveredCount++;
    } else if (prev === "queued") {
      status = "queued"; // já está em produção — não rebaixa
    } else {
      status = "opportunity";
    }
    return {
      site_id: siteId,
      keyword: k.keyword,
      volume: k.volume,
      competition: k.competition,
      competition_index: k.competitionIndex,
      trend: k.trend,
      source_seed: seeds[0],
      opportunity_score: opportunityScore(k.volume, k.competitionIndex, k.trend),
      status,
      post_id: coveredPost,
      updated_at: nowIso,
    };
  });

  const { error } = await sb
    .from("keyword_universe")
    .upsert(rows, { onConflict: "site_id,keyword" });
  if (error) return { ok: false, error: error.message };

  // marca o site como sincronizado agora
  await sb.from("sites").update({ keyword_universe_synced_at: nowIso }).eq("id", siteId);

  return {
    ok: true,
    discovered: rows.length,
    opportunities: rows.filter((r) => r.status === "opportunity").length,
    covered: coveredCount,
  };
}

/**
 * Pega a melhor oportunidade não-coberta e TRAVA (status 'queued') pra o
 * auto-pilot não pegar a mesma duas vezes. Retorna null se não houver.
 */
export async function pickAndLockNextOpportunity(
  siteId: string
): Promise<{ keyword: string; volume: number; score: number } | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("keyword_universe")
    .select("id, keyword, volume, opportunity_score")
    .eq("site_id", siteId)
    .eq("status", "opportunity")
    .order("opportunity_score", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  // trava condicional (só se ainda 'opportunity' — evita corrida)
  const { data: locked } = await sb
    .from("keyword_universe")
    .update({ status: "queued", updated_at: new Date().toISOString() })
    .eq("id", data.id)
    .eq("status", "opportunity")
    .select("id")
    .maybeSingle();
  if (!locked) return null;

  return {
    keyword: data.keyword as string,
    volume: data.volume as number,
    score: data.opportunity_score as number,
  };
}

/** Marca a palavra como coberta (após o post nascer). */
export async function markKeywordCovered(
  siteId: string,
  keyword: string,
  postId: string
): Promise<void> {
  const sb = createServiceClient();
  await sb
    .from("keyword_universe")
    .update({ status: "covered", post_id: postId, updated_at: new Date().toISOString() })
    .eq("site_id", siteId)
    .eq("keyword", keyword);
}

/**
 * Reconcilia: palavras 'queued' que JÁ viraram post (canônica bate) → 'covered'.
 * Roda antes do release pra não soltar (e regerar) o que já foi feito.
 */
export async function reconcileQueued(siteId: string): Promise<number> {
  const sb = createServiceClient();
  const { data: queued } = await sb
    .from("keyword_universe")
    .select("id, keyword")
    .eq("site_id", siteId)
    .eq("status", "queued");
  if (!queued?.length) return 0;

  const { data: posts } = await sb
    .from("posts")
    .select("id, target_keyword, title")
    .eq("site_id", siteId)
    .neq("status", "archived");
  const postByCanon = new Map<string, string>();
  for (const p of posts ?? []) {
    if (p.target_keyword) postByCanon.set(canonicalKey(p.target_keyword as string), p.id as string);
    if (p.title) postByCanon.set(canonicalKey(p.title as string), p.id as string);
  }

  let n = 0;
  for (const k of queued) {
    const pid = postByCanon.get(canonicalKey(k.keyword as string));
    if (pid) {
      await sb
        .from("keyword_universe")
        .update({ status: "covered", post_id: pid, updated_at: new Date().toISOString() })
        .eq("id", k.id);
      n++;
    }
  }
  return n;
}

/** Solta de volta as travadas ('queued') antigas que nunca viraram post. */
export async function releaseStaleQueued(siteId: string, olderThanHours = 6): Promise<void> {
  const sb = createServiceClient();
  const cutoff = new Date(Date.now() - olderThanHours * 3600 * 1000).toISOString();
  await sb
    .from("keyword_universe")
    .update({ status: "opportunity" })
    .eq("site_id", siteId)
    .eq("status", "queued")
    .is("post_id", null)
    .lt("updated_at", cutoff);
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
