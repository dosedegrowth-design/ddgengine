/**
 * Gerador de relatórios mensais.
 *
 * Coleta:
 * - Métricas (metrics_daily)
 * - Visibility runs (ai_visibility_runs)
 * - Posts publicados no período
 *
 * Gera:
 * - Summary executivo (via Claude)
 * - 3 recomendações acionáveis
 * - Salva em reports
 * - (Futuramente) gera PDF + envia por email/WhatsApp
 */
import { createServiceClient } from "@/lib/supabase/server";
import { generateWithClaude, parseJsonResponse } from "@/lib/ai/claude";

export interface GenerateReportResult {
  reportId: string;
  summary: string;
  recommendations: string[];
}

export async function generateMonthlyReport(
  siteId: string,
  periodStart: string
): Promise<GenerateReportResult> {
  const supabase = createServiceClient();

  const { data: site } = await supabase
    .from("sites")
    .select("*, organizations(name, slug)")
    .eq("id", siteId)
    .single();
  if (!site) throw new Error("Site não encontrado");

  // Período = mês inteiro do periodStart
  const start = new Date(periodStart);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(0); // último dia do mês

  // Pega métricas
  const { data: metrics } = await supabase
    .from("metrics_daily")
    .select("*")
    .eq("site_id", siteId)
    .gte("date", start.toISOString().slice(0, 10))
    .lte("date", end.toISOString().slice(0, 10));

  const totals = (metrics ?? []).reduce(
    (acc: any, m: any) => ({
      pageviews: acc.pageviews + (m.pageviews ?? 0),
      sessions: acc.sessions + (m.sessions ?? 0),
      impressions: acc.impressions + (m.gsc_impressions ?? 0),
      clicks: acc.clicks + (m.gsc_clicks ?? 0),
      ai_citations: acc.ai_citations + (m.ai_citations ?? 0),
    }),
    { pageviews: 0, sessions: 0, impressions: 0, clicks: 0, ai_citations: 0 }
  );

  // Mês anterior pra comparação
  const prevStart = new Date(start);
  prevStart.setMonth(prevStart.getMonth() - 1);
  const prevEnd = new Date(start);
  prevEnd.setDate(0);

  const { data: prevMetrics } = await supabase
    .from("metrics_daily")
    .select("*")
    .eq("site_id", siteId)
    .gte("date", prevStart.toISOString().slice(0, 10))
    .lte("date", prevEnd.toISOString().slice(0, 10));

  const prevTotals = (prevMetrics ?? []).reduce(
    (acc: any, m: any) => ({
      pageviews: acc.pageviews + (m.pageviews ?? 0),
      impressions: acc.impressions + (m.gsc_impressions ?? 0),
    }),
    { pageviews: 0, impressions: 0 }
  );

  const deltaPageviews =
    prevTotals.pageviews > 0
      ? ((totals.pageviews - prevTotals.pageviews) / prevTotals.pageviews) * 100
      : 0;

  // Visibility runs do mês
  const { data: visRuns } = await supabase
    .from("ai_visibility_runs")
    .select("*")
    .eq("site_id", siteId)
    .gte("week_start", start.toISOString().slice(0, 10))
    .lte("week_start", end.toISOString().slice(0, 10));

  const totalAiCitations = (visRuns ?? []).reduce(
    (s: number, r: any) => s + (r.total_citations ?? 0),
    0
  );

  // Posts publicados no mês
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, type, published_at")
    .eq("site_id", siteId)
    .eq("status", "published")
    .gte("published_at", start.toISOString())
    .lte("published_at", end.toISOString());

  // Gera summary com Claude
  const monthLabel = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const summaryPrompt = `Você gera resumos executivos de relatórios de SEO/marketing pra PMEs brasileiras.

Site: ${site.domain}
Mês: ${monthLabel}

NÚMEROS:
- Tráfego: ${totals.pageviews.toLocaleString("pt-BR")} visitas (${deltaPageviews >= 0 ? "+" : ""}${deltaPageviews.toFixed(1)}% vs mês anterior)
- Impressões Google: ${totals.impressions.toLocaleString("pt-BR")}
- Cliques Google: ${totals.clicks.toLocaleString("pt-BR")}
- Citações em IA: ${totalAiCitations}
- Posts publicados: ${posts?.length ?? 0}

Gere:
1. summary: 2-3 frases executivas em pt-BR, tom direto, sem jargão. NÃO use "como podemos ver" ou similares.
2. recommendations: 3 ações concretas pra próximo mês baseadas nos dados.

OUTPUT JSON:
{"summary": "...", "recommendations": ["...", "...", "..."]}`;

  let summary = `Relatório de ${monthLabel} — ${site.domain}`;
  let recommendations: string[] = [];

  try {
    const aiResult = await generateWithClaude({
      system: "Você é especialista em relatórios de marketing pra PMEs.",
      messages: [{ role: "user", content: summaryPrompt }],
      max_tokens: 800,
      temperature: 0.7,
    });
    const parsed = parseJsonResponse<{ summary: string; recommendations: string[] }>(aiResult.text);
    summary = parsed.summary;
    recommendations = parsed.recommendations ?? [];
  } catch (err) {
    console.warn("Falha gerando summary com Claude:", err);
  }

  // Salva report
  const { data: report } = await supabase
    .from("reports")
    .upsert(
      {
        site_id: siteId,
        period_type: "monthly",
        period_start: start.toISOString().slice(0, 10),
        period_end: end.toISOString().slice(0, 10),
        summary,
        metrics: { ...totals, delta_pageviews: deltaPageviews, ai_citations: totalAiCitations },
        recommendations,
      },
      { onConflict: "site_id,period_type,period_start" }
    )
    .select()
    .single();

  return {
    reportId: report?.id ?? "",
    summary,
    recommendations,
  };
}
