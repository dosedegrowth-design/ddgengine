/**
 * Brand RAG — Retrieval Augmented Generation com voz da marca.
 *
 * Após o cliente preencher o briefing, processamos os textos dele em embeddings
 * e armazenamos em pgvector. Na geração de cada post, fazemos retrieval pra
 * recuperar trechos relevantes que vão no prompt como contexto.
 */
import { embed, embedBatch, chunkText } from "@/lib/ai/embeddings";
import { createServiceClient } from "@/lib/supabase/server";

interface BriefingData {
  id: string;
  site_id: string;
  business_description: string | null;
  audience_type: string | null;
  region: string | null;
  services: unknown;
  differentiator: string | null;
  sample_texts: string | null;
  loved_words: string[] | null;
  forbidden_words: string[] | null;
  faq_questions: unknown;
  target_keywords: string[] | null;
  required_disclaimers: string | null;
}

/**
 * Processa o briefing inteiro em embeddings.
 * Chamado após o cliente submeter o briefing.
 */
export async function processBriefingEmbeddings(briefingId: string) {
  const supabase = createServiceClient();

  // Pega briefing
  const { data: briefing, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("id", briefingId)
    .single();

  if (error || !briefing) {
    throw new Error(`Briefing não encontrado: ${error?.message}`);
  }

  const b = briefing as BriefingData;

  // Marca como processando
  await supabase
    .from("briefings")
    .update({ embedding_status: "processing" })
    .eq("id", briefingId);

  // Apaga embeddings antigos desse site (refresh completo)
  await supabase
    .from("brand_documents")
    .delete()
    .eq("site_id", b.site_id)
    .eq("source", "briefing");

  // Constrói documentos a partir do briefing
  const documents: Array<{ content: string; source: string; chunk_index: number }> = [];

  // Doc 1: Negócio (business_description + services + region)
  if (b.business_description) {
    const services = Array.isArray(b.services) ? b.services : [];
    const businessDoc = [
      `Sobre o negócio: ${b.business_description}`,
      b.audience_type ? `Público-alvo: ${b.audience_type}` : null,
      b.region ? `Região atendida: ${b.region}` : null,
      services.length ? `Serviços/produtos principais: ${services.map((s: any) => typeof s === "string" ? s : s.name ?? "").filter(Boolean).join(", ")}` : null,
      b.differentiator ? `Diferencial competitivo: ${b.differentiator}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    documents.push({ content: businessDoc, source: "briefing", chunk_index: 0 });
  }

  // Doc 2: Voz da marca (sample_texts em chunks)
  if (b.sample_texts) {
    const chunks = chunkText(b.sample_texts, 2000, 200);
    chunks.forEach((chunk, idx) => {
      documents.push({
        content: `Exemplo de texto da marca (mantenha esse tom):\n\n${chunk}`,
        source: "briefing",
        chunk_index: 1 + idx,
      });
    });
  }

  // Doc 3: Vocabulário (loved/forbidden words)
  if ((b.loved_words?.length ?? 0) > 0 || (b.forbidden_words?.length ?? 0) > 0) {
    const vocabDoc = [
      b.loved_words?.length
        ? `Palavras e expressões que a marca AMA usar: ${b.loved_words.join(", ")}`
        : null,
      b.forbidden_words?.length
        ? `Palavras PROIBIDAS — nunca use: ${b.forbidden_words.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    documents.push({ content: vocabDoc, source: "briefing", chunk_index: 50 });
  }

  // Doc 4: FAQs + keywords
  const faqs = Array.isArray(b.faq_questions) ? b.faq_questions : [];
  if (faqs.length > 0 || (b.target_keywords?.length ?? 0) > 0) {
    const contentDoc = [
      faqs.length
        ? `Principais perguntas dos clientes:\n${faqs
            .map((q: any, i: number) => `${i + 1}. ${typeof q === "string" ? q : q.question ?? ""}`)
            .join("\n")}`
        : null,
      b.target_keywords?.length
        ? `Palavras-chave alvo: ${b.target_keywords.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    documents.push({ content: contentDoc, source: "briefing", chunk_index: 60 });
  }

  // Doc 5: Disclaimers
  if (b.required_disclaimers) {
    documents.push({
      content: `Disclaimer obrigatório em todos os conteúdos:\n${b.required_disclaimers}`,
      source: "briefing",
      chunk_index: 70,
    });
  }

  if (documents.length === 0) {
    await supabase
      .from("briefings")
      .update({ embedding_status: "done", completion_percent: 100 })
      .eq("id", briefingId);
    return { inserted: 0 };
  }

  // Gera embeddings em batch
  const embeddings = await embedBatch(documents.map((d) => d.content));

  // Insere com embeddings
  const rows = documents.map((doc, idx) => ({
    site_id: b.site_id,
    content: doc.content,
    embedding: embeddings[idx] as unknown as string, // pgvector aceita array; supabase serializa
    source: doc.source,
    chunk_index: doc.chunk_index,
    token_count: Math.ceil(doc.content.length / 4),
  }));

  const { error: insertError } = await supabase.from("brand_documents").insert(rows);

  if (insertError) {
    await supabase
      .from("briefings")
      .update({ embedding_status: "failed" })
      .eq("id", briefingId);
    throw new Error(`Erro ao inserir embeddings: ${insertError.message}`);
  }

  await supabase
    .from("briefings")
    .update({ embedding_status: "done", completion_percent: 100 })
    .eq("id", briefingId);

  return { inserted: rows.length };
}

/**
 * Retrieval — busca chunks relevantes pra uma query.
 * Usado durante a geração de conteúdo.
 */
export async function retrieveBrandContext(
  siteId: string,
  query: string,
  limit = 5
): Promise<Array<{ content: string; similarity: number }>> {
  const supabase = createServiceClient();
  const queryEmbedding = await embed(query);

  // Usa similaridade por cosseno
  const { data, error } = await supabase.rpc("ddg_engine_match_brand_documents", {
    query_embedding: queryEmbedding,
    p_site_id: siteId,
    match_count: limit,
  });

  if (error) {
    console.error("Erro no retrieval:", error);
    return [];
  }

  return (data as Array<{ content: string; similarity: number }>) ?? [];
}
