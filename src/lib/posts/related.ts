/**
 * Algoritmo de related posts.
 *
 * Estratégia: embedding similarity (cosine) via pgvector + recência.
 * Fallback: posts mais recentes do mesmo site.
 */
import { createServiceClient } from "@/lib/supabase/server";
import { embed } from "@/lib/ai/embeddings";

export interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  meta_description: string | null;
  type: string;
  published_at: string | null;
  similarity?: number;
}

/**
 * Acha posts relacionados a um post específico.
 * Usa título + meta description como query.
 */
export async function findRelatedPosts(
  postId: string,
  limit = 3
): Promise<RelatedPost[]> {
  const supabase = createServiceClient();

  // Carrega post base
  const { data: post } = await supabase
    .from("posts")
    .select("id, site_id, title, meta_description, type")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return [];

  // Tenta similarity search via embeddings dos brand_documents
  // (Não temos embeddings nos posts diretamente — usamos brand_documents)
  try {
    const query = `${post.title}\n\n${post.meta_description ?? ""}`;
    const queryEmbedding = await embed(query);

    // RPC pra buscar posts similares dentro do mesmo site (excluindo o próprio)
    const { data: similar } = await supabase.rpc(
      "ddg_engine_find_similar_posts",
      {
        p_site_id: post.site_id,
        p_exclude_post_id: postId,
        query_embedding: queryEmbedding,
        match_count: limit,
      }
    );

    if (similar && Array.isArray(similar) && similar.length > 0) {
      return (similar as Array<RelatedPost>);
    }
  } catch {
    // RPC pode não existir ainda — fallback
  }

  // Fallback: posts mais recentes do mesmo site, mesmo tipo
  const { data: fallback } = await supabase
    .from("posts")
    .select("id, slug, title, meta_description, type, published_at")
    .eq("site_id", post.site_id)
    .eq("status", "published")
    .neq("id", postId)
    .order("published_at", { ascending: false })
    .limit(limit);

  return (fallback ?? []) as RelatedPost[];
}
