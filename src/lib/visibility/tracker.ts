/**
 * AI Visibility Tracker — diferencial #3 do produto.
 *
 * Toda semana (cron), pra cada site ativo:
 * 1. Gera 50-200 prompts representativos do nicho (baseado no briefing)
 * 2. Dispara cada prompt em 2-4 LLMs (ChatGPT, Perplexity, Claude, Gemini)
 * 3. Analisa as respostas (citação, posição, sentimento, concorrentes)
 * 4. Salva snapshot semanal
 * 5. Cliente vê dashboard com share-of-voice e tendência
 */
import { createServiceClient } from "@/lib/supabase/server";
import { generateVisibilityPrompts } from "./prompts";
import { queryLLM, type LLMProvider } from "./llm-clients";
import { analyzeResponse } from "./analyzer";

// Configuração de prompts/LLMs por plano
const TRACKING_CONFIG: Record<string, { prompts: number; llms: LLMProvider[] }> = {
  trial: { prompts: 20, llms: ["chatgpt", "claude"] },
  starter: { prompts: 50, llms: ["chatgpt", "claude"] },
  light: { prompts: 100, llms: ["chatgpt", "claude", "gemini"] },
  pro: { prompts: 200, llms: ["chatgpt", "perplexity", "claude", "gemini"] },
  multi: { prompts: 200, llms: ["chatgpt", "perplexity", "claude", "gemini"] },
  agency: { prompts: 50, llms: ["chatgpt", "claude"] }, // por site, 30 sites
  native: { prompts: 200, llms: ["chatgpt", "perplexity", "claude", "gemini"] },
};

export interface RunResult {
  runId: string;
  totalPrompts: number;
  totalCitations: number;
  citationsByLlm: Record<string, number>;
  shareOfVoice: Record<string, number>;
  costUsd: number;
}

/**
 * Executa um run completo de tracking pra um site.
 */
export async function runVisibilityTracking(siteId: string): Promise<RunResult> {
  const supabase = createServiceClient();

  // 1. Carrega site + org + briefing
  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .select("*, organizations(name, plan)")
    .eq("id", siteId)
    .single();
  if (siteErr || !site) throw new Error("Site não encontrado");

  const { data: briefing } = await supabase
    .from("briefings")
    .select("*")
    .eq("site_id", siteId)
    .maybeSingle();
  if (!briefing) throw new Error("Briefing não preenchido");

  const plan = (site as any).organizations?.plan ?? "starter";
  const config = TRACKING_CONFIG[plan] ?? TRACKING_CONFIG.starter;

  // 2. Cria run
  const weekStart = startOfWeek(new Date());
  const { data: run, error: runErr } = await supabase
    .from("ai_visibility_runs")
    .insert({
      site_id: siteId,
      week_start: weekStart.toISOString().slice(0, 10),
      status: "running",
      total_prompts: 0,
    })
    .select()
    .single();
  if (runErr || !run) throw new Error(`Erro ao criar run: ${runErr?.message}`);

  try {
    // 3. Gera prompts representativos
    const prompts = await generateVisibilityPrompts({
      business_description: briefing.business_description,
      services: briefing.services,
      region: briefing.region,
      competitors: briefing.competitors,
      faq_questions: briefing.faq_questions,
      target_keywords: briefing.target_keywords,
      prompt_count: config.prompts,
    });

    const brandName = (site as any).organizations?.name ?? "";
    const brandDomain = site.domain as string;
    const competitorDomains: string[] = (
      (briefing.competitors as any[]) ?? []
    )
      .map((c) => (typeof c === "string" ? c : c?.url ?? ""))
      .filter(Boolean);

    // 4. Dispara prompts (com rate limiting suave)
    const citations: Array<{
      run_id: string;
      site_id: string;
      prompt: string;
      llm: LLMProvider;
      response_text: string;
      brand_mentioned: boolean;
      url_cited: boolean;
      sentiment: string;
      position: number | null;
      competitors_mentioned: string[];
      cost_usd: number;
    }> = [];

    let totalCost = 0;
    const citationsByLlm: Record<string, number> = {};
    const competitorsCount: Record<string, number> = {};
    let brandTotalMentions = 0;

    for (const prompt of prompts) {
      // Dispara em paralelo nas 4 LLMs
      const responses = await Promise.allSettled(
        config.llms.map((llm) => queryLLM(llm, prompt))
      );

      responses.forEach((settled, idx) => {
        const llm = config.llms[idx];
        if (settled.status !== "fulfilled") {
          console.warn(`LLM ${llm} falhou pra prompt "${prompt.slice(0, 50)}":`, settled.reason);
          return;
        }

        const { text, cost_usd } = settled.value;
        totalCost += cost_usd;

        const analysis = analyzeResponse({
          responseText: text,
          brandName,
          brandDomain,
          competitorDomains,
        });

        if (analysis.brand_mentioned) {
          citationsByLlm[llm] = (citationsByLlm[llm] ?? 0) + 1;
          brandTotalMentions += analysis.brand_mentions_count;
        }

        for (const c of analysis.competitors_mentioned) {
          competitorsCount[c] = (competitorsCount[c] ?? 0) + 1;
        }

        citations.push({
          run_id: run.id,
          site_id: siteId,
          prompt,
          llm,
          response_text: text.slice(0, 4000),
          brand_mentioned: analysis.brand_mentioned,
          url_cited: analysis.url_cited,
          sentiment: analysis.sentiment,
          position: analysis.position,
          competitors_mentioned: analysis.competitors_mentioned,
          cost_usd,
        });
      });

      // Suave throttle: pequena pausa a cada 5 prompts
      if (prompts.indexOf(prompt) % 5 === 4) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // 5. Salva citations em batches
    if (citations.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < citations.length; i += BATCH) {
        await supabase.from("ai_visibility_citations").insert(citations.slice(i, i + BATCH));
      }
    }

    // 6. Calcula share of voice
    const totalMentions = brandTotalMentions + Object.values(competitorsCount).reduce((s, n) => s + n, 0);
    const shareOfVoice: Record<string, number> = {
      brand: totalMentions > 0 ? brandTotalMentions / totalMentions : 0,
    };
    for (const [c, n] of Object.entries(competitorsCount)) {
      shareOfVoice[c] = totalMentions > 0 ? n / totalMentions : 0;
    }

    // 7. Atualiza run
    const totalCitations = citations.filter((c) => c.brand_mentioned).length;
    await supabase
      .from("ai_visibility_runs")
      .update({
        status: "completed",
        total_prompts: prompts.length,
        total_citations: totalCitations,
        citations_by_llm: citationsByLlm,
        share_of_voice: shareOfVoice,
        competitors_data: competitorsCount,
        cost_usd: totalCost,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    // 8. Audit log
    await supabase.from("audit_log").insert({
      organization_id: site.organization_id,
      site_id: siteId,
      event_type: "visibility_run_completed",
      event_data: { run_id: run.id, total_citations: totalCitations, cost_usd: totalCost },
    });

    return {
      runId: run.id,
      totalPrompts: prompts.length,
      totalCitations,
      citationsByLlm,
      shareOfVoice,
      costUsd: totalCost,
    };
  } catch (err) {
    await supabase
      .from("ai_visibility_runs")
      .update({
        status: "failed",
        metadata: { error: err instanceof Error ? err.message : "unknown" },
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw err;
  }
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // segunda-feira
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
