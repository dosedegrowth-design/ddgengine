"use server";

import { revalidatePath } from "next/cache";
import { enqueueGeneration } from "@/lib/ai/generate-resumable";
import { extractFromUrl } from "@/lib/ai/source-extract";
import { analyzePost, type PostSeoReport } from "@/lib/seo/analyze-post";
import { getCurrentSite } from "@/lib/auth";
import { dispatchPostPublished } from "@/lib/notifications/dispatcher";

export async function generatePostAction(input: {
  type: "long_form" | "faq_page";
  topic?: string;
  targetKeyword?: string;
  targetQuestion?: string;
  /** Notas extras do cliente (texto livre ou áudio transcrito) sobre
   *  o que quer ver no post — entra como contexto adicional no prompt */
  extraNotes?: string;
  mode?: "single_pass" | "multi_pass";
}) {
  const { site } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  // Se cliente deu notas extras, anexa ao topic pra incluir no prompt
  const enrichedTopic = input.extraNotes?.trim()
    ? [input.topic, `Detalhes do cliente: ${input.extraNotes.trim()}`]
        .filter(Boolean)
        .join("\n\n")
    : input.topic;

  try {
    // Enfileira a geração (resumível). Retorna na hora — o post nasce em
    // 'generating' e o driver (cron 1min) completa em alguns minutos.
    const { postId } = await enqueueGeneration({
      siteId: site.id,
      type: input.type,
      topic: enrichedTopic,
      targetKeyword: input.targetKeyword,
      targetQuestion: input.targetQuestion,
    });

    revalidatePath("/posts");
    revalidatePath("/dashboard");

    return { success: true as const, queued: true as const, post: { id: postId, postId } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao gerar post",
    };
  }
}

/**
 * Pré-visualiza a extração de uma fonte (link) ANTES de gerar o post.
 * Devolve título + prévia do texto pro cliente confirmar que pegou o
 * conteúdo certo. Não gera nada — só lê.
 */
export async function previewSourceAction(url: string) {
  if (!url.trim()) return { error: "Cole um link." };
  const result = await extractFromUrl(url.trim());
  if (!result.ok) return { error: result.error };
  const { source } = result;
  return {
    success: true as const,
    title: source.title,
    type: source.type,
    chars: source.text.length,
    preview: source.text.slice(0, 600),
  };
}

/**
 * Gera um post ORIGINAL adaptado a partir de uma FONTE:
 *  - link (notícia, artigo, blog, post) → extrai o texto
 *  - link do YouTube → transcrição/descrição
 *  - texto colado direto → usa como base
 *
 * A engine usa o material só como insumo de fatos/ideias e reescreve 100%
 * na voz da marca (briefing + RAG), otimizado SEO/GEO. Sempre multi-pass.
 */
export async function generateFromSourceAction(input: {
  type: "long_form" | "faq_page";
  /** Link da fonte (artigo, vídeo, post). Opcional se rawText vier. */
  url?: string;
  /** Texto colado direto (quando não há link ou a extração falhou). */
  rawText?: string;
  /** Ângulo/foco que o cliente quer dar (vira o tema do post). Opcional. */
  angle?: string;
  targetKeyword?: string;
}) {
  const { site } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  let sourceTitle = "";
  let sourceText = (input.rawText ?? "").trim();
  let sourceUrl = "";

  // Se veio link, extrai (a não ser que o cliente já tenha colado texto).
  if (input.url?.trim() && sourceText.length < 200) {
    const extracted = await extractFromUrl(input.url.trim());
    if (!extracted.ok) return { error: extracted.error };
    sourceTitle = extracted.source.title;
    sourceText = extracted.source.text;
    sourceUrl = extracted.source.sourceUrl;
  }

  if (sourceText.length < 120) {
    return {
      error:
        "Preciso de mais conteúdo. Cole um link com texto/legendas ou cole o conteúdo manualmente.",
    };
  }

  // Tema conciso (dirige slug + RAG). O texto grande vai em extraContext.
  const topic =
    input.angle?.trim() ||
    sourceTitle ||
    sourceText.slice(0, 80);

  const extraContext = [
    sourceTitle ? `Título da fonte: ${sourceTitle}` : "",
    sourceUrl ? `Link da fonte: ${sourceUrl}` : "",
    input.angle?.trim() ? `Ângulo que o cliente quer: ${input.angle.trim()}` : "",
    "",
    sourceText,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  try {
    const { postId } = await enqueueGeneration({
      siteId: site.id,
      type: input.type,
      topic,
      targetKeyword: input.targetKeyword?.trim() || undefined,
      extraContext,
    });

    revalidatePath("/posts");
    revalidatePath("/dashboard");

    return { success: true as const, queued: true as const, post: { id: postId, postId } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao gerar post",
    };
  }
}

/**
 * Analisa o SEO/GEO on-page de um post (estilo RankMath), recalculado AO
 * VIVO sobre o conteúdo SALVO atual. Reflete edições depois de salvar.
 * Usa a palavra-chave de foco do post (target_keyword) quando houver.
 */
export async function analyzePostAction(
  postId: string
): Promise<{ report: PostSeoReport } | { error: string }> {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const { data: post } = await supabase
    .from("posts")
    .select(
      "type, title, content_markdown, meta_description, slug, schema_markup, target_keyword"
    )
    .eq("id", postId)
    .eq("site_id", site.id)
    .maybeSingle();

  if (!post) return { error: "Post não encontrado" };

  const report = analyzePost({
    type: (post.type as "long_form" | "faq_page") ?? "long_form",
    title: post.title ?? "",
    content: post.content_markdown ?? "",
    metaDescription: post.meta_description,
    slug: post.slug,
    schemaMarkup: (post.schema_markup as unknown[] | null) ?? null,
    focusKeyword: post.target_keyword,
  });

  return { report };
}

export async function approvePostAction(postId: string) {
  const { site, supabase, org } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const { error } = await supabase
    .from("posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      approval_method: "manual_dashboard",
    })
    .eq("id", postId)
    .eq("site_id", site.id);

  if (error) return { error: error.message };

  // Fire-and-forget notification
  void dispatchPostPublished({ orgId: org.id, siteId: site.id, postId });

  revalidatePath("/posts");
  revalidatePath("/inbox");
  revalidatePath(`/posts/${postId}`);
  return { success: true };
}

export async function deletePostAction(postId: string) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  // Só permite deletar posts em status NÃO publicado (falhou, draft, generating, archived)
  const { data: post } = await supabase
    .from("posts")
    .select("status")
    .eq("id", postId)
    .eq("site_id", site.id)
    .maybeSingle();
  if (!post) return { error: "Post não encontrado" };
  if (post.status === "published") {
    return { error: "Não dá pra apagar post já publicado. Arquive primeiro." };
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("site_id", site.id);

  if (error) return { error: error.message };

  revalidatePath("/posts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectPostAction(postId: string) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const { error } = await supabase
    .from("posts")
    .update({ status: "archived", approval_method: "manual_dashboard" })
    .eq("id", postId)
    .eq("site_id", site.id);

  if (error) return { error: error.message };

  revalidatePath("/posts");
  revalidatePath("/inbox");
  revalidatePath(`/posts/${postId}`);
  return { success: true };
}

export async function savePostEdits(
  postId: string,
  edits: { title?: string; meta_description?: string; content_markdown?: string }
) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const update: Record<string, unknown> = {};
  if (edits.title !== undefined) update.title = edits.title;
  if (edits.meta_description !== undefined) update.meta_description = edits.meta_description;
  if (edits.content_markdown !== undefined) update.content_markdown = edits.content_markdown;

  const { error } = await supabase
    .from("posts")
    .update(update)
    .eq("id", postId)
    .eq("site_id", site.id);

  if (error) return { error: error.message };

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  return { success: true };
}
