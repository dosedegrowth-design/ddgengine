/**
 * Multi-pass content engine — 7 passes com self-critique.
 *
 * Pass 1: Outline
 * Pass 2: Draft (rascunho)
 * Pass 3: SEO check (otimização Google)
 * Pass 4: GEO check (otimização IAs)
 * Pass 5: Brand voice (RAG dos textos do cliente)
 * Pass 6: Fact check (citações + fontes)
 * Pass 7: Polish (meta, OG, schema final)
 *
 * Cada pass usa o output do anterior como input.
 * Custos rastreados por pass.
 */
import { parseJsonResponse } from "./claude";
import { generateLLMWithFallback as generateWithClaude } from "./with-fallback";
import { retrieveBrandContext } from "@/lib/rag/brand";
import { createServiceClient } from "@/lib/supabase/server";
import { runAllGates, type QualityGateInput } from "./quality-gates";
import { slugify } from "@/lib/utils";
import { dispatchPostPendingReview, dispatchPostPublished } from "@/lib/notifications/dispatcher";

export interface MultiPassInput {
  siteId: string;
  type: "long_form" | "faq_page";
  targetKeyword?: string;
  targetQuestion?: string;
  topic?: string;
}

export interface MultiPassOutput {
  postId: string;
  slug: string;
  title: string;
  word_count: number;
  total_cost_usd: number;
  passes_run: number;
  gates_passed: number;
  gates_total: number;
}

interface PassLog {
  pass: string;
  duration_ms: number;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  output_preview: string;
}

const PASS_1_OUTLINE = `Você é especialista em SEO+GEO. Sua tarefa: criar um outline detalhado pra um artigo.

OUTPUT JSON:
{
  "title": "Título do post (50-65 caracteres, com keyword)",
  "primary_question": "Pergunta principal que o post responde",
  "tldr_text": "Resposta direta em 2-3 frases (vai no topo)",
  "h2_sections": [
    {"heading": "...", "content_brief": "o que abordar nesta seção", "key_points": ["...", "..."]},
    ... (mínimo 4, máximo 7)
  ],
  "faq_questions": ["...", "..."],
  "target_entities": ["entidade 1", "entidade 2"],
  "schema_type": "Article"
}`;

const PASS_2_DRAFT = `Você é redator brasileiro premium em SEO+GEO. Escreva o artigo completo seguindo o outline.

REGRAS:
- Português brasileiro natural
- Parágrafos curtos (3-4 linhas)
- Use os H2 e H3 do outline
- Inclua TL;DR no topo (após H1)
- Inclua FAQ section no final (com schema FAQPage)
- 1500-3500 palavras (long_form) ou 400-800 (faq_page)
- NÃO use frases vazias ("no mundo de hoje", "vale ressaltar", "cada vez mais")
- Inclua data points concretos quando puder
- Mantenha o tom de voz do brand context

OUTPUT JSON:
{
  "content_markdown": "# Título\\n\\n**TL;DR:** ...\\n\\n## H2...",
  "schema_faqs": [{"question": "...", "answer": "..."}]
}`;

const PASS_3_SEO = `Você é auditor SEO. Revise o texto e devolva versão melhorada.

VERIFIQUE:
- Title tem 50-65 caracteres? (corrija se não)
- Meta description tem 120-165? (gere se faltar)
- Headings com hierarquia clara (H1 > H2 > H3)
- Pelo menos 2 links internos/externos (use markdown links)
- Densidade de keyword sem keyword stuffing
- Parágrafos curtos

OUTPUT JSON:
{
  "title": "title final",
  "meta_description": "meta final 120-165 chars",
  "slug": "slug-friendly-url",
  "content_markdown": "texto refinado",
  "seo_improvements": ["lista do que mudou"]
}`;

const PASS_4_GEO = `Você é especialista em Generative Engine Optimization (GEO). Aprimore o texto pra IAs (ChatGPT, Perplexity, Claude, Gemini) citarem.

VERIFIQUE:
- TL;DR no topo, em formato direto
- Q&A blocks claros (heading com ? + resposta abaixo)
- Pelo menos 3 FAQ items no final (com schema FAQPage)
- Data points concretos (números, datas, percentuais)
- Citações de fontes ("segundo X", "de acordo com Y")
- Listas bem estruturadas (bullets ou numeradas)

OUTPUT JSON:
{
  "content_markdown": "texto refinado",
  "schema_faqs": [{"question": "...", "answer": "..."}],
  "geo_improvements": ["lista do que mudou"]
}`;

const PASS_5_BRAND_VOICE = `Você ajusta o texto pra ENCAIXAR PERFEITAMENTE no tom de voz da marca.

CONTEXTO DA MARCA (use isso pra calibrar):
{{BRAND_CONTEXT}}

VERIFIQUE:
- Vocabulário (palavras que a marca usa)
- Tom (formal/casual/técnico/didático conforme briefing)
- Palavras proibidas removidas
- Disclaimer obrigatório presente (se houver)

OUTPUT JSON:
{
  "content_markdown": "texto refinado",
  "voice_adjustments": ["lista do que ajustou"]
}`;

const PASS_6_FACT_CHECK = `Você é checador de fatos. Identifique claims factuais no texto e:
1. Se for verificável e provavelmente correto, mantém + adiciona linkagem "segundo X" quando fizer sentido
2. Se for duvidoso ou impossível verificar, suaviza ou remove
3. Se for completamente falso (você sabe), corrige

NUNCA invente fontes ou estatísticas. Se faltar dado concreto, remova o claim.

OUTPUT JSON:
{
  "content_markdown": "texto refinado",
  "fact_check_notes": ["lista do que foi verificado/ajustado"]
}`;

const PASS_7_POLISH = `Você é editor final. Última passada antes de publicar.

FAÇA:
- Revise gramática e fluidez
- Garanta primeiro parágrafo respondendo à query principal
- Adicione CTA sutil no final ("entre em contato", "saiba mais")
- Confirme schema markup completo
- Gere meta tags finais

OUTPUT JSON:
{
  "title": "title final",
  "meta_description": "meta final",
  "slug": "slug-final",
  "content_markdown": "TEXTO PRONTO PRA PUBLICAR",
  "schema_markup": [{...Article ou BlogPosting...}, {...FAQPage se aplicável...}],
  "og_image_suggestion": "descrição da imagem ideal (não geramos imagem agora)"
}`;

export async function generatePostMultiPass(input: MultiPassInput): Promise<MultiPassOutput> {
  const supabase = createServiceClient();

  // Carrega site + briefing
  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .select("*, organizations(name, slug)")
    .eq("id", input.siteId)
    .single();
  if (siteErr || !site) throw new Error("Site não encontrado");

  const { data: briefing } = await supabase
    .from("briefings")
    .select("*")
    .eq("site_id", input.siteId)
    .maybeSingle();
  if (!briefing) throw new Error("Briefing não preenchido");

  const topic = input.topic || input.targetKeyword || input.targetQuestion || briefing.target_keywords?.[0] || "tópico geral";
  const brandContext = await retrieveBrandContext(input.siteId, topic, 5);
  const brandContextText = brandContext.length
    ? brandContext.map((b, i) => `[${i + 1}] ${b.content}`).join("\n\n")
    : "Sem contexto de marca disponível.";

  const briefingSummary = `
## SOBRE A EMPRESA
Negócio: ${briefing.business_description ?? "n/a"}
Público: ${briefing.audience_type ?? "n/a"}
Região: ${briefing.region ?? "Brasil"}
Diferencial: ${briefing.differentiator ?? "n/a"}

## TOM DE VOZ
Formal: ${briefing.tone_formal ?? 3}/5
Casual: ${briefing.tone_casual ?? 3}/5
Técnico: ${briefing.tone_technical ?? 3}/5
Didático: ${briefing.tone_didactic ?? 4}/5

${briefing.loved_words?.length ? `Palavras AMADAS: ${briefing.loved_words.join(", ")}` : ""}
${briefing.forbidden_words?.length ? `Palavras PROIBIDAS: ${briefing.forbidden_words.join(", ")}` : ""}
${briefing.required_disclaimers ? `Disclaimer obrigatório: ${briefing.required_disclaimers}` : ""}
`.trim();

  // Cria post inicial em "generating"
  const initialSlug = slugify(topic).slice(0, 80) || `post-${Date.now()}`;
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .insert({
      site_id: input.siteId,
      type: input.type,
      slug: `${initialSlug}-${Math.random().toString(36).slice(2, 6)}`,
      status: "generating",
      target_keyword: input.targetKeyword,
      target_question: input.targetQuestion,
      generation_mode: "multi_pass",
    })
    .select()
    .single();
  if (postErr || !post) throw new Error(`Erro ao criar post: ${postErr?.message}`);

  const passLogs: PassLog[] = [];
  let totalCost = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let workingDoc: any = {};

  try {
    // --- PASS 1: OUTLINE ---
    const p1Start = Date.now();
    const p1 = await generateWithClaude({
      system: PASS_1_OUTLINE,
      messages: [
        {
          role: "user",
          content: `Tópico: ${topic}\nKeyword alvo: ${input.targetKeyword ?? "n/a"}\nPergunta principal: ${input.targetQuestion ?? "n/a"}\n\n${briefingSummary}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });
    const outline = parseJsonResponse<any>(p1.text);
    workingDoc = { ...outline };
    passLogs.push(makePassLog("outline", p1, Date.now() - p1Start));
    totalCost += p1.cost_usd;
    totalTokensIn += p1.input_tokens;
    totalTokensOut += p1.output_tokens;

    // --- PASS 2: DRAFT ---
    const p2Start = Date.now();
    const p2 = await generateWithClaude({
      system: PASS_2_DRAFT,
      messages: [
        {
          role: "user",
          content: `Outline:\n${JSON.stringify(outline, null, 2)}\n\n${briefingSummary}\n\nEscreva o artigo completo seguindo o outline.`,
        },
      ],
      max_tokens: input.type === "long_form" ? 16000 : 6000,
      temperature: 0.7,
    });
    const draft = parseJsonResponse<any>(p2.text);
    workingDoc.content_markdown = draft.content_markdown;
    workingDoc.schema_faqs = draft.schema_faqs ?? [];
    passLogs.push(makePassLog("draft", p2, Date.now() - p2Start));
    totalCost += p2.cost_usd;
    totalTokensIn += p2.input_tokens;
    totalTokensOut += p2.output_tokens;

    // --- PASS 3: SEO ---
    const p3Start = Date.now();
    const p3 = await generateWithClaude({
      system: PASS_3_SEO,
      messages: [
        {
          role: "user",
          content: `Title atual: ${workingDoc.title}\nKeyword alvo: ${input.targetKeyword ?? "n/a"}\n\nTexto:\n${workingDoc.content_markdown}`,
        },
      ],
      max_tokens: input.type === "long_form" ? 16000 : 6000,
      temperature: 0.5,
    });
    const seo = parseJsonResponse<any>(p3.text);
    workingDoc.title = seo.title || workingDoc.title;
    workingDoc.meta_description = seo.meta_description;
    workingDoc.slug = seo.slug;
    workingDoc.content_markdown = seo.content_markdown;
    passLogs.push(makePassLog("seo", p3, Date.now() - p3Start));
    totalCost += p3.cost_usd;
    totalTokensIn += p3.input_tokens;
    totalTokensOut += p3.output_tokens;

    // --- PASS 4: GEO ---
    const p4Start = Date.now();
    const p4 = await generateWithClaude({
      system: PASS_4_GEO,
      messages: [
        {
          role: "user",
          content: `Texto:\n${workingDoc.content_markdown}`,
        },
      ],
      max_tokens: input.type === "long_form" ? 16000 : 6000,
      temperature: 0.5,
    });
    const geo = parseJsonResponse<any>(p4.text);
    workingDoc.content_markdown = geo.content_markdown;
    workingDoc.schema_faqs = geo.schema_faqs ?? workingDoc.schema_faqs ?? [];
    passLogs.push(makePassLog("geo", p4, Date.now() - p4Start));
    totalCost += p4.cost_usd;
    totalTokensIn += p4.input_tokens;
    totalTokensOut += p4.output_tokens;

    // --- PASS 5: BRAND VOICE ---
    const p5Start = Date.now();
    const p5 = await generateWithClaude({
      system: PASS_5_BRAND_VOICE.replace("{{BRAND_CONTEXT}}", brandContextText),
      messages: [
        {
          role: "user",
          content: `${briefingSummary}\n\nTexto:\n${workingDoc.content_markdown}`,
        },
      ],
      max_tokens: input.type === "long_form" ? 16000 : 6000,
      temperature: 0.5,
    });
    const voice = parseJsonResponse<any>(p5.text);
    workingDoc.content_markdown = voice.content_markdown;
    passLogs.push(makePassLog("brand_voice", p5, Date.now() - p5Start));
    totalCost += p5.cost_usd;
    totalTokensIn += p5.input_tokens;
    totalTokensOut += p5.output_tokens;

    // --- PASS 6: FACT CHECK ---
    const p6Start = Date.now();
    const p6 = await generateWithClaude({
      system: PASS_6_FACT_CHECK,
      messages: [
        {
          role: "user",
          content: `Texto:\n${workingDoc.content_markdown}`,
        },
      ],
      max_tokens: input.type === "long_form" ? 16000 : 6000,
      temperature: 0.3,
    });
    const fact = parseJsonResponse<any>(p6.text);
    workingDoc.content_markdown = fact.content_markdown;
    passLogs.push(makePassLog("fact_check", p6, Date.now() - p6Start));
    totalCost += p6.cost_usd;
    totalTokensIn += p6.input_tokens;
    totalTokensOut += p6.output_tokens;

    // --- PASS 7: POLISH ---
    const p7Start = Date.now();
    const orgName = (site as any).organizations?.name ?? "Blog";
    const orgSlug = (site as any).organizations?.slug ?? "blog";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.conteudai.com.br";
    const finalUrl = `${baseUrl}/blog/${orgSlug}/${workingDoc.slug}`;

    const p7 = await generateWithClaude({
      system: PASS_7_POLISH,
      messages: [
        {
          role: "user",
          content: `Org: ${orgName}\nURL final: ${finalUrl}\nFAQs do GEO: ${JSON.stringify(workingDoc.schema_faqs)}\n\nTexto atual:\n${workingDoc.content_markdown}`,
        },
      ],
      max_tokens: input.type === "long_form" ? 16000 : 6000,
      temperature: 0.4,
    });
    const polished = parseJsonResponse<any>(p7.text);
    workingDoc.title = polished.title || workingDoc.title;
    workingDoc.meta_description = polished.meta_description || workingDoc.meta_description;
    workingDoc.slug = polished.slug || workingDoc.slug;
    workingDoc.content_markdown = polished.content_markdown;
    workingDoc.schema_markup = polished.schema_markup;
    workingDoc.og_image_suggestion = polished.og_image_suggestion;
    passLogs.push(makePassLog("polish", p7, Date.now() - p7Start));
    totalCost += p7.cost_usd;
    totalTokensIn += p7.input_tokens;
    totalTokensOut += p7.output_tokens;

    // --- QUALITY GATES ---
    const gateInput: QualityGateInput = {
      siteId: input.siteId,
      type: input.type,
      title: workingDoc.title,
      content: workingDoc.content_markdown,
      metaDescription: workingDoc.meta_description,
      schemaMarkup: workingDoc.schema_markup,
      forbiddenWords: briefing.forbidden_words ?? undefined,
      requiredDisclaimers: briefing.required_disclaimers ?? undefined,
    };

    const gates = await runAllGates(gateInput);

    // Salva gate runs
    const gateRows = Object.entries(gates.results).map(([name, r]) => ({
      post_id: post.id,
      gate_name: name,
      passed: r.passed,
      score: r.score,
      threshold: r.threshold,
      details: { details: r.details, metadata: r.metadata } as Record<string, unknown>,
      pass_number: 1,
    }));
    await supabase.from("quality_gate_runs").insert(gateRows);

    // Slug único
    const baseSlug = slugify(workingDoc.slug || initialSlug).slice(0, 100);
    let finalSlug = baseSlug;
    for (let i = 1; i <= 5; i++) {
      const { data: existing } = await supabase
        .from("posts")
        .select("id")
        .eq("site_id", input.siteId)
        .eq("slug", finalSlug)
        .neq("id", post.id)
        .maybeSingle();
      if (!existing) break;
      finalSlug = `${baseSlug}-${i}`;
    }

    const approvalMode = briefing.approval_mode ?? "auto";
    const finalStatus = !gates.passed
      ? "in_review"
      : approvalMode === "auto"
      ? "published"
      : "in_review";

    await supabase
      .from("posts")
      .update({
        slug: finalSlug,
        title: workingDoc.title,
        meta_description: workingDoc.meta_description,
        outline: workingDoc.h2_sections ?? null,
        content_markdown: workingDoc.content_markdown,
        schema_markup: workingDoc.schema_markup,
        status: finalStatus,
        published_at: finalStatus === "published" ? new Date().toISOString() : null,
        tokens_input: totalTokensIn,
        tokens_output: totalTokensOut,
        cost_usd: totalCost,
        quality_passed: gates.passed,
        quality_scores: Object.fromEntries(
          Object.entries(gates.results).map(([k, v]) => [k, { passed: v.passed, score: v.score }])
        ),
        generation_passes: passLogs,
      })
      .eq("id", post.id);

    // Dispara notificações (fire-and-forget)
    const orgId = site.organization_id as string;
    if (finalStatus === "in_review") {
      void dispatchPostPendingReview({ orgId, siteId: input.siteId, postId: post.id });
    } else if (finalStatus === "published") {
      void dispatchPostPublished({ orgId, siteId: input.siteId, postId: post.id });
    }

    const wordCount = workingDoc.content_markdown.split(/\s+/).filter(Boolean).length;

    return {
      postId: post.id,
      slug: finalSlug,
      title: workingDoc.title,
      word_count: wordCount,
      total_cost_usd: totalCost,
      passes_run: passLogs.length,
      gates_passed: gates.passedCount,
      gates_total: gates.totalGates,
    };
  } catch (err) {
    await supabase
      .from("posts")
      .update({
        status: "failed",
        metadata: {
          error: err instanceof Error ? err.message : "unknown",
          passes_completed: passLogs.length,
        },
        generation_passes: passLogs,
        cost_usd: totalCost,
      })
      .eq("id", post.id);
    throw err;
  }
}

function makePassLog(
  pass: string,
  result: { input_tokens: number; output_tokens: number; cost_usd: number; text: string },
  durationMs: number
): PassLog {
  return {
    pass,
    duration_ms: durationMs,
    cost_usd: result.cost_usd,
    tokens_in: result.input_tokens,
    tokens_out: result.output_tokens,
    output_preview: result.text.slice(0, 200),
  };
}
