import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { CategoryNav } from "@/components/blog/category-nav";
import { BlogShell } from "@/components/blog/blog-shell";
import { loadBlogShellContext } from "@/lib/blog/load-shell-context";
import { getBlogBasePath } from "@/lib/blog/base-path";

interface Params {
  orgSlug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { orgSlug } = await params;
  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("slug", orgSlug)
    .maybeSingle();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://conteudai.com.br";
  return {
    title: org ? `${org.name} · Blog` : "Blog",
    description: org ? `Conteúdo de ${org.name}` : "Blog",
    alternates: org
      ? {
          types: {
            "application/rss+xml": [
              { url: `${baseUrl}/blog/${orgSlug}/rss.xml`, title: `${org.name} · RSS` },
            ],
          },
        }
      : undefined,
  };
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { orgSlug } = await params;
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!org) notFound();

  const basePath = await getBlogBasePath(org.slug);

  const { template, tokens, siteIds } = await loadBlogShellContext(org.id);

  // Categorias do site pra menu
  const { data: categories } = await supabase
    .from("blog_categories")
    .select("name, slug")
    .in("site_id", siteIds)
    .order("display_order", { ascending: true });

  type PostListItem = {
    id: string;
    slug: string;
    title: string | null;
    meta_description: string | null;
    type: string;
    published_at: string | null;
    og_image_url: string | null;
  };

  const { data: posts } = await supabase
    .from("posts")
    .select("id, slug, title, meta_description, type, published_at, og_image_url")
    .in("site_id", siteIds)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const list = (posts ?? []) as PostListItem[];

  return (
    <BlogShell template={template} tokens={tokens} orgSlug={org.slug} orgName={org.name} basePath={basePath}>
      <div className="container mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12 text-center space-y-4">
          <h1 className="text-4xl md:text-5xl tracking-tight">
            Blog
          </h1>
          <p className="opacity-70">
            Conteúdo de {org.name}
          </p>
          <form method="GET" action={`${basePath}/search`} className="flex gap-2 max-w-md mx-auto pt-2">
            <input
              type="search"
              name="q"
              placeholder="Buscar no blog..."
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-md bg-foreground text-background text-sm font-medium"
            >
              Buscar
            </button>
          </form>
        </header>

        {/* Menu de categorias */}
        <CategoryNav orgSlug={org.slug} basePath={basePath} categories={categories ?? []} />

        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum post publicado ainda. Volte em breve.
          </div>
        ) : (
          <div className="space-y-6 mt-8">
            {list.map((p) => (
              <Link
                key={p.id}
                href={`${basePath}/${p.slug}`}
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
                  <h2 className="text-lg md:text-xl font-semibold tracking-tight mb-1.5 line-clamp-2">
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
