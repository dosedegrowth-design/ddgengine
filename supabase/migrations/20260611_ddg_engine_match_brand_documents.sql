-- Função RPC pra retrieval similarity-ranked do Brand RAG.
-- Usada pelo pass 5 (Brand Voice) do multi-pass engine.
--
-- Recebe query embedding (1536d), site_id e quantidade max.
-- Retorna chunks mais similares por cosseno.

create or replace function ddg_engine.ddg_engine_match_brand_documents(
  query_embedding vector(1536),
  p_site_id uuid,
  match_count int default 5
)
returns table(
  id uuid,
  content text,
  source text,
  chunk_index int,
  similarity float
)
language sql
stable
as $$
  select
    bd.id,
    bd.content,
    bd.source,
    bd.chunk_index,
    1 - (bd.embedding <=> query_embedding) as similarity
  from ddg_engine.brand_documents bd
  where bd.site_id = p_site_id
    and bd.embedding is not null
  order by bd.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function ddg_engine.ddg_engine_match_brand_documents(vector, uuid, int)
  to service_role, authenticated;

comment on function ddg_engine.ddg_engine_match_brand_documents is
  'Brand RAG retrieval — top-N chunks por similaridade cosseno pro site_id.';
