/**
 * /blog/{orgSlug}/search?q= — busca nos posts publicados do org.
 *
 * Estratégia: ILIKE em title + meta + content (cobre PT-BR sem precisar
 * configurar FTS tsconfig portuguese, que vira complicado em scale).
 * Pra volume futuro: trocar por search_vector + websearch_to_tsquery.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { CategoryNav } from "@/components/blog/category-nav";
import { BlogShell } from "@/components/blog/blog-shell";
import { loadBlogShellContext } from "@/lib/blog/load-shell-context";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps) {
  const { q } = await searchParams;
  return {
    title: q ? `Buscar "${q}" · Blog` : `Buscar · Blog`,
  };
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { orgSlug } = await params;
  const { q } = await searchParams;
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const { template, tokens, siteIds } = await loadBlogShellContext(org.id);
  if (siteIds.length === 0) notFound();

  const { data: categories } = await supabase
    .from("blog_categories")
    .select("name, slug")
    .in("site_id", siteIds)
    .order("display_order", { ascending: true });

  type Hit = {
    id: string;
    slug: string;
    title: string | null;
    meta_description: string | null;
    type: string;
    published_at: string | null;
    og_image_url: string | null;
  };

  let hits: Hit[] = [];

  if (q && q.trim()) {
    const term = q.trim();
    const pattern = `%${term}%`;
    const { data } = await supabase
      .from("posts")
      .select("id, slug, title, meta_description, type, published_at, og_image_url")
      .in("site_id", siteIds)
      .eq("status", "published")
      .or(
        `title.ilike.${pattern},meta_description.ilike.${pattern},content_markdown.ilike.${pattern}`
      )
      .order("published_at", { ascending: false })
      .limit(50);
    hits = (data ?? []) as Hit[];
  }

  return (
    <BlogShell template={template} tokens={tokens} orgSlug={org.slug} orgName={org.name}>
      <div className="container mx-auto max-w-4xl px-6 py-12">
        <Link
          href={`/blog/${orgSlug}`}
          className="inline-flex items-center gap-1.5 text-sm opacity-60 hover:opacity-100 mb-8 transition-opacity"
        >
          <ChevronLeft className="w-4 h-4" /> Blog
        </Link>

        <header className="mb-10">
          <div className="inline-flex items-center gap-2 mb-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <Search className="w-3.5 h-3.5" />
            Busca
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
            {q ? `Resultados para “${q}”` : "Buscar no blog"}
          </h1>
          <form
            method="GET"
            action={`/blog/${orgSlug}/search`}
            className="flex gap-2 max-w-md mt-4"
          >
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Digite e pressione Enter…"
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-md bg-foreground text-background text-sm font-medium"
            >
              Buscar
            </button>
          </form>
        </header>

        <CategoryNav orgSlug={orgSlug} categories={categories ?? []} />

        {!q ? (
          <p className="text-center py-12 text-muted-foreground mt-8">
            Digite um termo na busca acima pra começar.
          </p>
        ) : hits.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground mt-8">
            Nenhum post encontrado pra <strong>“{q}”</strong>. Tente outro termo.
          </p>
        ) : (
          <div className="space-y-6 mt-8">
            <p className="text-sm text-muted-foreground">
              {hits.length} {hits.length === 1 ? "resultado" : "resultados"}
            </p>
            {hits.map((p) => (
              <Link
                key={p.id}
                href={`/blog/${orgSlug}/${p.slug}`}
                className="flex gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-all"
              >
                {p.og_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.og_image_url}
                    alt=""
                    className="shrink-0 w-32 h-24 object-cover rounded-md border"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
                    <span>{p.type === "long_form" ? "Artigo" : "FAQ"}</span>
                    {p.published_at && (
                      <>
                        <span>·</span>
                        <span>{formatDate(p.published_at)}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight mb-1.5 line-clamp-2">
                    {p.title}
                  </h2>
                  {p.meta_description && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {p.meta_description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </BlogShell>
  );
}
