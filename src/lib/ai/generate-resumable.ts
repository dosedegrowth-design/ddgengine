/**
 * Geração RESUMÍVEL — mesmos 7 passes do multi-pass, mas quebrados em pedaços
 * que cabem no limite de 60s do serverless (Vercel Hobby).
 *
 * Fluxo:
 *  1. enqueueGeneration(): cria o post em 'generating' com gen_stage=0 e guarda
 *     o contexto em gen_doc. Retorna na hora (não trava o request).
 *  2. Um driver (cron 1min) chama tickPost() repetidamente: roda quantos passes
 *     couberem em ~50s, salva o progresso, e finaliza (gates + publica) no fim.
 *
 * Reaproveita 100% do código existente (prompts, Claude, gates, RAG, imagem).
 */
import { parseJsonResponse } from "./claude";
import { generateLLMWithFallback as generateWithClaude } from "./with-fallback";
import { generateHeroImage, buildVisualPromptFromTitle } from "./image-gen";
import { retrieveBrandContext } from "@/lib/rag/brand";
import { createServiceClient } from "@/lib/supabase/server";
import { uploadHeroImage } from "@/lib/storage/post-images";
import { runAllGates, type QualityGateInput } from "./quality-gates";
import { slugify } from "@/lib/utils";
import { dispatchPostPendingReview, dispatchPostPublished } from "@/lib/notifications/dispatcher";

const PASS_1_OUTLINE = `Você é especialista em SEO+GEO. Sua tarefa: criar um outline detalhado pra um artigo.

OUTPUT JSON:
{
  "title": "Título do post (50-65 caracteres, com keyword)",
  "primary_question": "Pergunta principal que o post responde",
  "tldr_text": "Resposta direta em 2-3 frases (vai no topo)",
  "h2_sections": [
    {"heading": "...", "content_brief": "o que abordar nesta seção", "key_points": ["...", "..."]}
  ],
  "faq_questions": ["...", "..."],
  "target_entities": ["entidade 1", "entidade 2"],
  "schema_type": "Article"
}
Mínimo 4, máximo 7 seções H2.`;

const PASS_2_DRAFT = `Você é redator brasileiro premium em SEO+GEO. Escreva o artigo completo seguindo o outline.

REGRAS:
- Português brasileiro natural
- Parágrafos curtos (3-4 linhas)
- Use os H2 e H3 do outline
- Inclua TL;DR no topo (após H1)
- Inclua FAQ section no final (com schema FAQPage)
- 1500-2200 palavras (long_form) ou 400-700 (faq_page) — seja completo mas conciso
- Cada seção H2 com 2-4 parágrafos densos (qualidade > quantidade)
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
  "schema_markup": [{"@type": "Article"}],
  "og_image_suggestion": "descrição da imagem ideal"
}`;

export interface EnqueueInput {
  siteId: string;
  type: "long_form" | "faq_page";
  topic?: string;
  targetKeyword?: string;
  targetQuestion?: string;
  extraContext?: string;
}

interface GenDoc {
  input: EnqueueInput;
  topic: string;
  briefingSummary: string;
  brandContextText: string;
  sourceBlock: string;
  orgName: string;
  orgSlug: string;
  baseUrl: string;
  forbiddenWords: string[];
  requiredDisclaimers: string | null;
  approvalMode: string;
  initialSlug: string;
  workingDoc: Record<string, unknown>;
  passLogs: Array<Record<string, unknown>>;
  totals: { cost: number; tin: number; tout: number };
}

const TOTAL_STAGES = 7;

/** Cria o post em 'generating' e guarda o contexto. Retorna na hora. */
export async function enqueueGeneration(input: EnqueueInput): Promise<{ postId: string }> {
  const supabase = createServiceClient();

  const { data: site } = await supabase
    .from("sites")
    .select("*, organizations(name, slug)")
    .eq("id", input.siteId)
    .maybeSingle();
  if (!site) throw new Error("Site não encontrado");

  const { data: briefing } = await supabase
    .from("briefings")
    .select("*")
    .eq("site_id", input.siteId)
    .maybeSingle();
  if (!briefing) throw new Error("Briefing não preenchido");

  const topic =
    input.topic ||
    input.targetKeyword ||
    input.targetQuestion ||
    briefing.target_keywords?.[0] ||
    "tópico geral";

  const brandContext = await retrieveBrandContext(input.siteId, topic, 5).catch(() => []);
  const brandContextText = brandContext.length
    ? brandContext.map((b: { content: string }, i: number) => `[${i + 1}] ${b.content}`).join("\n\n")
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

  const sourceBlock = input.extraContext?.trim()
    ? `\n\n## MATERIAL DE REFERÊNCIA (adaptar, NÃO copiar)\nUse os FATOS e IDEIAS, mas reescreva 100% original na nossa voz. NÃO copie frases.\n\n"""\n${input.extraContext.trim().slice(0, 12000)}\n"""`
    : "";

  const initialSlug = slugify(topic).slice(0, 80) || `post-${Date.now()}`;
  const orgName = (site.organizations as { name?: string } | null)?.name ?? "Blog";
  const orgSlug = (site.organizations as { slug?: string } | null)?.slug ?? "blog";

  const genDoc: GenDoc = {
    input,
    topic,
    briefingSummary,
    brandContextText,
    sourceBlock,
    orgName,
    orgSlug,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://conteudai.com.br",
    forbiddenWords: briefing.forbidden_words ?? [],
    requiredDisclaimers: briefing.required_disclaimers ?? null,
    approvalMode: briefing.approval_mode ?? "auto",
    initialSlug,
    workingDoc: {},
    passLogs: [],
    totals: { cost: 0, tin: 0, tout: 0 },
  };

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      site_id: input.siteId,
      type: input.type,
      slug: `${initialSlug}-${Math.random().toString(36).slice(2, 6)}`,
      status: "generating",
      target_keyword: input.targetKeyword,
      target_question: input.targetQuestion,
      generation_mode: "multi_pass",
      gen_stage: 0,
      gen_doc: genDoc as unknown as Record<string, unknown>,
      gen_started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !post) throw new Error(`Erro ao criar post: ${error?.message}`);

  return { postId: post.id };
}

// Cada passe: recebe o GenDoc, roda 1 chamada Claude, muta workingDoc.
async function runStage(stage: number, g: GenDoc, longForm: boolean): Promise<void> {
  const wd = g.workingDoc as Record<string, any>;
  // Cap menor que o multi-pass original: cada passe (que reescreve o artigo
  // inteiro) precisa caber em <60s do serverless. ~7000 tokens ≈ ~45s.
  const maxBody = longForm ? 7000 : 4000;
  const t0 = Date.now();
  let name = "";
  let res: { text: string; cost_usd: number; input_tokens: number; output_tokens: number };

  if (stage === 0) {
    name = "outline";
    res = await generateWithClaude({
      system: PASS_1_OUTLINE,
      messages: [{ role: "user", content: `Tópico: ${g.topic}\nKeyword alvo: ${g.input.targetKeyword ?? "n/a"}\nPergunta principal: ${g.input.targetQuestion ?? "n/a"}\n\n${g.briefingSummary}${g.sourceBlock}` }],
      max_tokens: 2000,
      temperature: 0.7,
    });
    const outline = parseJsonResponse<any>(res.text);
    Object.assign(wd, outline);
  } else if (stage === 1) {
    name = "draft";
    res = await generateWithClaude({
      system: PASS_2_DRAFT,
      messages: [{ role: "user", content: `Outline:\n${JSON.stringify(wd)}\n\n${g.briefingSummary}${g.sourceBlock}\n\nEscreva o artigo completo seguindo o outline.` }],
      max_tokens: maxBody,
      temperature: 0.7,
    });
    const draft = parseJsonResponse<any>(res.text);
    wd.content_markdown = draft.content_markdown;
    wd.schema_faqs = draft.schema_faqs ?? [];
  } else if (stage === 2) {
    name = "seo";
    res = await generateWithClaude({
      system: PASS_3_SEO,
      messages: [{ role: "user", content: `Title atual: ${wd.title}\nKeyword alvo: ${g.input.targetKeyword ?? "n/a"}\n\nTexto:\n${wd.content_markdown}` }],
      max_tokens: maxBody,
      temperature: 0.5,
    });
    const seo = parseJsonResponse<any>(res.text);
    wd.title = seo.title || wd.title;
    wd.meta_description = seo.meta_description;
    wd.slug = seo.slug;
    wd.content_markdown = seo.content_markdown;
  } else if (stage === 3) {
    name = "geo";
    res = await generateWithClaude({
      system: PASS_4_GEO,
      messages: [{ role: "user", content: `Texto:\n${wd.content_markdown}` }],
      max_tokens: maxBody,
      temperature: 0.5,
    });
    const geo = parseJsonResponse<any>(res.text);
    wd.content_markdown = geo.content_markdown;
    wd.schema_faqs = geo.schema_faqs ?? wd.schema_faqs ?? [];
  } else if (stage === 4) {
    name = "brand_voice";
    res = await generateWithClaude({
      system: PASS_5_BRAND_VOICE.replace("{{BRAND_CONTEXT}}", g.brandContextText),
      messages: [{ role: "user", content: `${g.briefingSummary}\n\nTexto:\n${wd.content_markdown}` }],
      max_tokens: maxBody,
      temperature: 0.5,
    });
    const voice = parseJsonResponse<any>(res.text);
    wd.content_markdown = voice.content_markdown;
  } else if (stage === 5) {
    name = "fact_check";
    res = await generateWithClaude({
      system: PASS_6_FACT_CHECK,
      messages: [{ role: "user", content: `Texto:\n${wd.content_markdown}` }],
      max_tokens: maxBody,
      temperature: 0.3,
    });
    const fact = parseJsonResponse<any>(res.text);
    wd.content_markdown = fact.content_markdown;
  } else {
    name = "polish";
    const finalUrl = `${g.baseUrl}/blog/${g.orgSlug}/${wd.slug}`;
    res = await generateWithClaude({
      system: PASS_7_POLISH,
      messages: [{ role: "user", content: `Org: ${g.orgName}\nURL final: ${finalUrl}\nFAQs do GEO: ${JSON.stringify(wd.schema_faqs)}\n\nTexto atual:\n${wd.content_markdown}` }],
      max_tokens: maxBody,
      temperature: 0.4,
    });
    const polished = parseJsonResponse<any>(res.text);
    wd.title = polished.title || wd.title;
    wd.meta_description = polished.meta_description || wd.meta_description;
    wd.slug = polished.slug || wd.slug;
    wd.content_markdown = polished.content_markdown;
    wd.schema_markup = polished.schema_markup;
    wd.og_image_suggestion = polished.og_image_suggestion;
  }

  g.passLogs.push({ pass: name, duration_ms: Date.now() - t0, cost_usd: res.cost_usd });
  g.totals.cost += res.cost_usd;
  g.totals.tin += res.input_tokens;
  g.totals.tout += res.output_tokens;
}

export interface TickResult {
  postId?: string;
  done: boolean;
  stage?: number;
  status?: string;
  error?: string;
}

/** Roda quantos passes couberem no budget; salva progresso; finaliza no fim. */
export async function tickPost(postId: string, budgetMs = 50000): Promise<TickResult> {
  const supabase = createServiceClient();
  const start = Date.now();

  const { data: post } = await supabase
    .from("posts")
    .select("id, site_id, type, gen_stage, gen_doc, gen_started_at")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.gen_stage === null || post.gen_stage === undefined) {
    return { postId, done: true, error: "post sem job de geração" };
  }

  // timeout de segurança: job preso há > 20min vira failed
  if (post.gen_started_at && Date.now() - new Date(post.gen_started_at).getTime() > 20 * 60 * 1000) {
    await supabase.from("posts").update({ status: "failed", gen_stage: null, gen_error: "timeout (20min)" }).eq("id", postId);
    return { postId, done: true, status: "failed", error: "timeout" };
  }

  const g = post.gen_doc as unknown as GenDoc;
  const longForm = post.type === "long_form";
  let stage = post.gen_stage as number;

  try {
    // roda passes enquanto houver budget E estágios
    while (stage < TOTAL_STAGES && Date.now() - start < budgetMs) {
      await runStage(stage, g, longForm);
      stage++;
      // persiste progresso a cada passe (resiliência)
      await supabase
        .from("posts")
        .update({ gen_stage: stage, gen_doc: g as unknown as Record<string, unknown> })
        .eq("id", postId);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro no passe";
    await supabase.from("posts").update({ gen_error: msg, gen_doc: g as unknown as Record<string, unknown> }).eq("id", postId);
    return { postId, done: false, stage, error: msg };
  }

  if (stage < TOTAL_STAGES) {
    return { postId, done: false, stage };
  }

  // ===== FINALIZAÇÃO =====
  return finalizePost(postId, g);
}

async function finalizePost(postId: string, g: GenDoc): Promise<TickResult> {
  const supabase = createServiceClient();
  const wd = g.workingDoc as Record<string, any>;
  const input = g.input;

  // Carrega org_id pra notificações
  const { data: post } = await supabase
    .from("posts")
    .select("id, site_id, sites(organization_id)")
    .eq("id", postId)
    .maybeSingle();
  const orgId = (post?.sites as { organization_id?: string } | null)?.organization_id ?? "";

  // Quality gates
  const gateInput: QualityGateInput = {
    siteId: input.siteId,
    type: input.type,
    title: wd.title,
    content: wd.content_markdown,
    metaDescription: wd.meta_description,
    schemaMarkup: wd.schema_markup,
    forbiddenWords: g.forbiddenWords,
    requiredDisclaimers: g.requiredDisclaimers ?? undefined,
  };
  const gates = await runAllGates(gateInput);

  await supabase.from("quality_gate_runs").insert(
    Object.entries(gates.results).map(([name, r]) => ({
      post_id: postId,
      gate_name: name,
      passed: r.passed,
      score: r.score,
      threshold: r.threshold,
      details: { details: r.details, metadata: r.metadata } as Record<string, unknown>,
      pass_number: 1,
    }))
  );

  // Slug único
  const baseSlug = slugify(wd.slug || g.initialSlug).slice(0, 100);
  let finalSlug = baseSlug;
  for (let i = 1; i <= 5; i++) {
    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("site_id", input.siteId)
      .eq("slug", finalSlug)
      .neq("id", postId)
      .maybeSingle();
    if (!existing) break;
    finalSlug = `${baseSlug}-${i}`;
  }

  const finalStatus = !gates.passed ? "in_review" : g.approvalMode === "auto" ? "published" : "in_review";

  await supabase
    .from("posts")
    .update({
      slug: finalSlug,
      title: wd.title,
      meta_description: wd.meta_description,
      outline: wd.h2_sections ?? null,
      content_markdown: wd.content_markdown,
      schema_markup: wd.schema_markup,
      status: finalStatus,
      published_at: finalStatus === "published" ? new Date().toISOString() : null,
      tokens_input: g.totals.tin,
      tokens_output: g.totals.tout,
      cost_usd: g.totals.cost,
      quality_passed: gates.passed,
      quality_scores: Object.fromEntries(
        Object.entries(gates.results).map(([k, v]) => [k, { passed: v.passed, score: v.score }])
      ),
      generation_passes: g.passLogs,
      gen_stage: null,
      gen_doc: null,
      gen_error: null,
    })
    .eq("id", postId);

  // Notificação (fire-and-forget)
  if (orgId) {
    if (finalStatus === "in_review") void dispatchPostPendingReview({ orgId, siteId: input.siteId, postId });
    else void dispatchPostPublished({ orgId, siteId: input.siteId, postId });
  }

  // Hero image (best-effort, dentro do que sobrar de tempo)
  try {
    const visualPrompt = buildVisualPromptFromTitle(wd.title, undefined);
    const img = await generateHeroImage({ prompt: visualPrompt, style: "photo", size: "1536x1024" });
    const uploaded = await uploadHeroImage({
      postId,
      siteId: input.siteId,
      bytes: img.bytes,
      contentType: "image/png",
    });
    await supabase.from("posts").update({ og_image_url: uploaded.url }).eq("id", postId);
  } catch {
    /* imagem é opcional */
  }

  return { postId, done: true, status: finalStatus };
}

/** Acha o post 'generating' mais antigo com job pendente e avança 1 ciclo. */
export async function tickOldestPending(budgetMs = 50000): Promise<TickResult & { picked: boolean }> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("posts")
    .select("id")
    .eq("status", "generating")
    .not("gen_stage", "is", null)
    .order("gen_started_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return { picked: false, done: true };
  const r = await tickPost(data.id, budgetMs);
  return { ...r, picked: true };
}
