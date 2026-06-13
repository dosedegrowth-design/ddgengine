/**
 * Sugestões de tópicos pra gerar próximos posts.
 *
 * Estratégia:
 * 1. Pega seeds do briefing refinado: primary_keywords[], secondary_keywords[],
 *    target_questions[], differentials[], unique_value, description
 * 2. Cruza com `posts.target_keyword`, `posts.target_question`, `posts.title`
 *    existentes do site → REMOVE o que já virou post (ou tá gerando)
 * 3. Retorna até 3 sugestões variadas (keyword, question, differential)
 * 4. Se acabaram os seeds nativos, gera variações combinando
 *    keyword + diferencial + cliente ideal
 */
import { createClient } from "@/lib/supabase/server";
import { getTopOpportunities } from "@/lib/seo/keyword-universe";

export interface TopicSuggestion {
  kind: "keyword" | "question" | "differential" | "opportunity";
  label: string;
  description: string;
  /** Dados reais de busca (quando vem do universo de palavra-chave). */
  metric?: {
    volume: number;
    competition: string | null;
    trend: number | null;
    score: number;
  };
  payload:
    | { type: "long_form"; topic?: string; targetKeyword?: string }
    | { type: "faq_page"; targetQuestion: string };
}

interface RefinedBriefShape {
  identity?: { company_name?: string; description?: string };
  audience?: { ideal_customer?: string; main_pain?: string };
  positioning?: { differentials?: string[]; unique_value?: string };
  seo?: { primary_keywords?: string[]; secondary_keywords?: string[] };
  visibility_goal?: { target_questions?: string[] };
}

/** Normalize pra comparar — lowercase, trim, sem pontuação dupla */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[?!.,]+$/, "").replace(/\s+/g, " ");
}

/**
 * Gera até 3 sugestões de tópicos pro user, filtrando os que já viraram post.
 *
 * Server-side (lê do DB). Chamar do Server Component ou action.
 */
export async function suggestTopics(orgId: string, siteId: string): Promise<TopicSuggestion[]> {
  const supabase = await createClient();

  // 1) Carrega briefing
  const { data: briefing } = await supabase
    .from("briefings")
    .select("refined_brief")
    .eq("organization_id", orgId)
    .maybeSingle();
  const brief = (briefing?.refined_brief as RefinedBriefShape | null) ?? null;
  if (!brief) return [];

  // 2) Carrega posts existentes do site (todos os status exceto 'archived')
  const { data: existingPosts } = await supabase
    .from("posts")
    .select("target_keyword, target_question, title")
    .eq("site_id", siteId)
    .neq("status", "archived");

  const usedKeywords = new Set(
    (existingPosts ?? [])
      .map((p) => p.target_keyword)
      .filter(Boolean)
      .map((s) => normalize(s as string))
  );
  const usedQuestions = new Set(
    (existingPosts ?? [])
      .map((p) => p.target_question)
      .filter(Boolean)
      .map((s) => normalize(s as string))
  );
  const usedTitles = new Set(
    (existingPosts ?? [])
      .map((p) => p.title)
      .filter(Boolean)
      .map((s) => normalize(s as string))
  );

  function alreadyUsedKeyword(kw: string) {
    const n = normalize(kw);
    return usedKeywords.has(n) || [...usedTitles].some((t) => t.includes(n));
  }
  function alreadyUsedQuestion(q: string) {
    return usedQuestions.has(normalize(q));
  }
  function alreadyUsedTopic(t: string) {
    const n = normalize(t);
    return [...usedTitles].some((title) => title.includes(n));
  }

  const out: TopicSuggestion[] = [];
  const addedKw = new Set<string>();

  // 2.5) OPORTUNIDADES (universo de palavra-chave, dado real do Google) —
  // entram primeiro porque são escolha por VOLUME × ganhabilidade, não chute.
  try {
    const opps = await getTopOpportunities(siteId, 6);
    for (const o of opps) {
      if (out.length >= 4) break;
      if (alreadyUsedKeyword(o.keyword) || addedKw.has(normalize(o.keyword))) continue;
      addedKw.add(normalize(o.keyword));
      const compTxt = o.competition ? `concorrência ${o.competition}` : "";
      out.push({
        kind: "opportunity",
        label: `Artigo sobre "${o.keyword}"`,
        description: [
          `${o.volume.toLocaleString("pt-BR")} buscas/mês`,
          compTxt,
          o.trend && o.trend > 5 ? "📈 em alta" : "",
        ]
          .filter(Boolean)
          .join(" · "),
        metric: {
          volume: o.volume,
          competition: o.competition,
          trend: o.trend,
          score: o.opportunity_score,
        },
        payload: { type: "long_form", targetKeyword: o.keyword },
      });
    }
  } catch {
    /* universo ainda vazio — segue com sugestões do briefing */
  }

  // 3) Keyword (SEO) — do briefing, se ainda sobra espaço
  const allKeywords = [
    ...(brief.seo?.primary_keywords ?? []),
    ...(brief.seo?.secondary_keywords ?? []),
  ].filter(Boolean);
  const kw = allKeywords.find(
    (k) => !alreadyUsedKeyword(k) && !addedKw.has(normalize(k))
  );
  if (kw && out.length < 4) {
    out.push({
      kind: "keyword",
      label: `Artigo sobre "${kw}"`,
      description:
        "Conteúdo SEO otimizado pra ranquear no Google nessa palavra-chave.",
      payload: { type: "long_form", targetKeyword: kw },
    });
  }

  // 4) Question (FAQ pra IAs)
  const allQuestions = brief.visibility_goal?.target_questions ?? [];
  const q = allQuestions.find((qq) => !alreadyUsedQuestion(qq));
  if (q) {
    out.push({
      kind: "question",
      label: `Resposta pra "${q}"`,
      description:
        "FAQ otimizado pra aparecer quando alguém pergunta isso em ChatGPT/Google.",
      payload: { type: "faq_page", targetQuestion: q },
    });
  } else if (brief.identity?.description || brief.audience?.ideal_customer) {
    // Fallback derivado se exauriram as perguntas-alvo do briefing
    const fallback = brief.identity?.description
      ? `Como ${brief.identity.description.toLowerCase().replace(/\.$/, "")}?`
      : `Como ajudar ${brief.audience!.ideal_customer!.toLowerCase()}?`;
    if (!alreadyUsedQuestion(fallback)) {
      out.push({
        kind: "question",
        label: `Resposta pra "${fallback}"`,
        description:
          "FAQ derivado do seu briefing pra cobrir mais perguntas em IAs.",
        payload: { type: "faq_page", targetQuestion: fallback },
      });
    }
  }

  // 5) Differential / unique value
  const candidatesDiff = [
    brief.positioning?.unique_value,
    ...(brief.positioning?.differentials ?? []),
  ].filter(Boolean) as string[];
  const diff = candidatesDiff.find((d) => !alreadyUsedTopic(d));
  if (diff) {
    out.push({
      kind: "differential",
      label: `Artigo sobre "${diff}"`,
      description:
        "Conteúdo focado em mostrar seu diferencial — pra quem chega no site converter.",
      payload: { type: "long_form", topic: diff },
    });
  }

  // 6) Se ainda não tem 3, gera combinações (kw × cliente / kw × diferencial)
  if (out.length < 3) {
    const idealCustomer = brief.audience?.ideal_customer;
    const remainingKws = allKeywords.filter((k) => !alreadyUsedKeyword(k));
    for (const k of remainingKws) {
      if (out.length >= 3) break;
      // evita duplicar a primeira (já adicionada)
      if (out.some((s) => s.kind === "keyword" && s.label.includes(k))) continue;
      const topic = idealCustomer
        ? `${k} pra ${idealCustomer}`
        : `${k} — guia completo`;
      if (!alreadyUsedTopic(topic)) {
        out.push({
          kind: "keyword",
          label: `Artigo sobre "${topic}"`,
          description:
            "Variação combinando palavra-chave + público-alvo do briefing.",
          payload: { type: "long_form", topic, targetKeyword: k },
        });
      }
    }
  }

  return out.slice(0, 3);
}
