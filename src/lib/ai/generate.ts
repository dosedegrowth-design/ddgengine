/**
 * Engine de geração de conteúdo (single-pass MVP).
 *
 * Pipeline simples pra fim de semana:
 * 1. Carrega briefing + brand RAG do site
 * 2. Single-pass Claude com prompt rico
 * 3. Salva post no banco + custos
 *
 * Multi-pass + quality gates ficam pra semana 2.
 */
import { generateWithClaude, parseJsonResponse } from "./claude";
import { retrieveBrandContext } from "@/lib/rag/brand";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export interface GenerateInput {
  siteId: string;
  type: "long_form" | "faq_page";
  targetKeyword?: string;
  targetQuestion?: string;
  topic?: string;
}

export interface GenerationOutput {
  postId: string;
  slug: string;
  title: string;
  word_count: number;
  cost_usd: number;
}

const SYSTEM_LONG = `Você é um redator especialista em SEO + GEO (Generative Engine Optimization) brasileiro.

Sua missão: escrever um artigo de blog otimizado pra:
1. Ranquear no Google (SEO clássico)
2. Ser citado em respostas de ChatGPT, Perplexity, Claude e Gemini (GEO)

REGRAS OBRIGATÓRIAS:
- Idioma: português brasileiro natural (não pt-PT)
- 1500-3500 palavras (long-form)
- Estrutura clara: H1 (1x), H2 (4-7), H3 quando necessário
- Q&A blocks no meio do texto (formato pergunta-resposta direta)
- Use parágrafos curtos (3-4 linhas máximo)
- Inclua dados concretos, estatísticas, exemplos verificáveis
- Cite fontes quando fizer claims factuais (formato: "segundo [fonte]")
- NÃO use frases vazias tipo "no mundo de hoje", "cada vez mais", "vale ressaltar"
- NÃO use emojis (a menos que o briefing da marca peça)
- Mantenha o tom de voz EXATAMENTE como descrito no briefing

ESTRUTURA QUE GOOGLE+CHATGPT FAVORECEM:
- Primeiro parágrafo responde a query principal em 2-3 frases
- Use TL;DR quando apropriado
- FAQ section no final com 3-5 perguntas
- Schema FAQPage aumenta citação em IA em 41%

OUTPUT: Responda APENAS com JSON neste formato:
{
  "title": "Título do post (50-65 caracteres, com keyword principal)",
  "meta_description": "Descrição (140-160 caracteres)",
  "slug": "url-friendly-slug-do-post",
  "outline": ["H2 1", "H2 2", "H2 3", ...],
  "content_markdown": "# Título\\n\\nConteúdo completo em markdown...",
  "schema_faqs": [
    {"question": "...", "answer": "..."},
    ...
  ],
  "target_entities": ["entidade 1", "entidade 2"]
}`;

const SYSTEM_FAQ = `Você é um redator especialista em GEO (otimização pra IAs como ChatGPT/Perplexity).

Sua missão: escrever uma FAQ page que responde UMA pergunta específica de forma DIRETA, COMPLETA e CITÁVEL.

REGRAS OBRIGATÓRIAS:
- Idioma: português brasileiro natural
- 400-800 palavras
- Estrutura: H1 (a pergunta) + resposta direta nos primeiros 100 caracteres + desenvolvimento
- Use TL;DR no topo: 1 parágrafo de 2-3 frases que já responde a pergunta
- Adicione 3-5 perguntas relacionadas no final (cada uma com resposta de 50-100 palavras)
- Cite fontes pra claims factuais
- NÃO enrole. Vá direto ao ponto.
- Mantenha o tom de voz do briefing

OUTPUT: Responda APENAS com JSON neste formato:
{
  "title": "A pergunta exata (50-70 caracteres)",
  "meta_description": "Resposta resumida em 140-160 caracteres",
  "slug": "url-friendly-slug",
  "tldr": "Resposta direta em 2-3 frases",
  "content_markdown": "# Pergunta\\n\\n**TL;DR:** ...\\n\\nResposta completa...",
  "schema_faqs": [
    {"question": "Pergunta principal", "answer": "Resposta direta"},
    {"question": "Pergunta relacionada 1", "answer": "..."},
    ...
  ]
}`;

export async function generatePost(input: GenerateInput): Promise<GenerationOutput> {
  const supabase = createServiceClient();

  // 1. Carrega site + briefing
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

  // 2. Determina tópico/keyword
  const topic =
    input.topic ||
    input.targetKeyword ||
    input.targetQuestion ||
    (briefing.target_keywords?.[0] as string | undefined) ||
    "tópico geral do negócio";

  // 3. Retrieval Brand RAG
  const brandContext = await retrieveBrandContext(input.siteId, topic, 5);

  // 4. Monta prompt
  const ragContext = brandContext.length
    ? `\n\n## CONTEXTO DA MARCA (use isso pra calibrar o tom de voz):\n${brandContext
        .map((b, i) => `[${i + 1}] ${b.content}`)
        .join("\n\n")}`
    : "";

  const briefingSummary = `
## SOBRE A EMPRESA
- Negócio: ${briefing.business_description ?? "n/a"}
- Público: ${briefing.audience_type ?? "n/a"}
- Região: ${briefing.region ?? "Brasil"}
- Diferencial: ${briefing.differentiator ?? "n/a"}

## TOM DE VOZ (escala 1-5)
- Formal: ${briefing.tone_formal ?? 3}/5
- Casual: ${briefing.tone_casual ?? 3}/5
- Técnico: ${briefing.tone_technical ?? 3}/5
- Didático: ${briefing.tone_didactic ?? 4}/5

${briefing.loved_words?.length ? `Palavras que a marca AMA: ${briefing.loved_words.join(", ")}` : ""}
${briefing.forbidden_words?.length ? `Palavras PROIBIDAS: ${briefing.forbidden_words.join(", ")}` : ""}
${briefing.required_disclaimers ? `Disclaimer obrigatório: ${briefing.required_disclaimers}` : ""}
${ragContext}
`.trim();

  const userPrompt =
    input.type === "long_form"
      ? `Escreva um artigo long-form completo sobre: **${topic}**

${input.targetKeyword ? `Palavra-chave principal alvo: "${input.targetKeyword}"` : ""}
${input.targetQuestion ? `Pergunta principal a responder: "${input.targetQuestion}"` : ""}

${briefingSummary}

Lembre: responda APENAS com o JSON especificado.`
      : `Escreva uma FAQ page que responde a pergunta: **${input.targetQuestion ?? topic}**

${briefingSummary}

Lembre: responda APENAS com o JSON especificado.`;

  // 5. Cria post em estado "generating"
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
      generation_mode: "single_pass",
    })
    .select()
    .single();

  if (postErr || !post) throw new Error(`Erro ao criar post: ${postErr?.message}`);

  try {
    // 6. Gera com Claude
    const result = await generateWithClaude({
      system: input.type === "long_form" ? SYSTEM_LONG : SYSTEM_FAQ,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: input.type === "long_form" ? 8000 : 3000,
      temperature: 0.7,
    });

    const parsed = parseJsonResponse<{
      title: string;
      meta_description: string;
      slug: string;
      tldr?: string;
      outline?: string[];
      content_markdown: string;
      schema_faqs?: { question: string; answer: string }[];
      target_entities?: string[];
    }>(result.text);

    const wordCount = parsed.content_markdown.split(/\s+/).filter(Boolean).length;

    // 7. Constrói schema markup
    const schemaMarkup = buildSchemaMarkup({
      type: input.type,
      title: parsed.title,
      description: parsed.meta_description,
      content: parsed.content_markdown,
      faqs: parsed.schema_faqs ?? [],
      orgName: (site as any).organizations?.name ?? "Blog",
      slug: parsed.slug,
      orgSlug: (site as any).organizations?.slug ?? "blog",
    });

    // 8. Garante slug único
    const baseSlug = slugify(parsed.slug || initialSlug).slice(0, 100);
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

    // 9. Atualiza post com conteúdo + auto-publica em modo AUTO
    const approvalMode = briefing.approval_mode ?? "auto";
    const finalStatus = approvalMode === "auto" ? "published" : "in_review";

    const { error: updErr } = await supabase
      .from("posts")
      .update({
        slug: finalSlug,
        title: parsed.title,
        meta_description: parsed.meta_description,
        outline: parsed.outline ?? null,
        content_markdown: parsed.content_markdown,
        content_html: null, // renderizado on-the-fly
        schema_markup: schemaMarkup,
        status: finalStatus,
        published_at: finalStatus === "published" ? new Date().toISOString() : null,
        tokens_input: result.input_tokens,
        tokens_output: result.output_tokens,
        cost_usd: result.cost_usd,
        quality_passed: true,
        generation_passes: [
          {
            pass: "single_pass",
            model: result.model,
            tokens_in: result.input_tokens,
            tokens_out: result.output_tokens,
            cache_read: result.cache_read_input_tokens,
            cost: result.cost_usd,
          },
        ],
      })
      .eq("id", post.id);

    if (updErr) throw new Error(`Erro ao salvar post: ${updErr.message}`);

    return {
      postId: post.id,
      slug: finalSlug,
      title: parsed.title,
      word_count: wordCount,
      cost_usd: result.cost_usd,
    };
  } catch (err) {
    await supabase
      .from("posts")
      .update({
        status: "failed",
        metadata: { error: err instanceof Error ? err.message : "unknown error" },
      })
      .eq("id", post.id);
    throw err;
  }
}

function buildSchemaMarkup(args: {
  type: "long_form" | "faq_page";
  title: string;
  description: string;
  content: string;
  faqs: { question: string; answer: string }[];
  orgName: string;
  slug: string;
  orgSlug: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ddg-engine.com";
  const url = `${baseUrl}/blog/${args.orgSlug}/${args.slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": args.type === "long_form" ? "Article" : "FAQPage",
    headline: args.title,
    description: args.description,
    url,
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: {
      "@type": "Organization",
      name: args.orgName,
    },
    publisher: {
      "@type": "Organization",
      name: args.orgName,
    },
  };

  const faqSchema = args.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: args.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      }
    : null;

  return faqSchema ? [articleSchema, faqSchema] : [articleSchema];
}
