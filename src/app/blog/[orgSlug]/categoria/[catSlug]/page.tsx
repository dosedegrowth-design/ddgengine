/**
 * /blog/{orgSlug}/categoria/{catSlug} — listagem de posts de uma categoria.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Tag } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { CategoryNav } from "@/components/blog/category-nav";

interface Params {
  orgSlug: string;
  catSlug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { orgSlug, catSlug } = await params;
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("slug", orgSlug)
    .maybeSingle();

  const { data: sites } = await supabase
    .from("sites")
    .select("id")
    .eq("organization_id", org?.name ? undefined : undefined);

  const { data: cat } = await supabase
    .from("blog_categories")
    .select("name, description")
    .eq("slug", catSlug)
    .in("site_id", (sites ?? []).map((s) => s.id))
    .maybeSingle();

  if (!org || !cat) return { title: "Categoria não encontrada" };

  return {
    title: `${cat.name} · Blog · ${org.name}`,
    description: cat.description ?? `Posts da categoria ${cat.name}`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { orgSlug, catSlug } = await params;
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const { data: sites } = await supabase
    .from("sites")
    .select("id")
    .eq("organization_id", org.id);
  const siteIds = ((sites ?? []) as Array<{ id: string }>).map((s) => s.id);
  if (siteIds.length === 0) notFound();

  // Categoria pelo slug
  const { data: category } = await supabase
    .from("blog_categories")
    .select("id, name, slug, description")
    .in("site_id", siteIds)
    .eq("slug", catSlug)
    .maybeSingle();
  if (!category) notFound();

  // Todas as categorias do site pra menu nav
  const { data: allCategories } = await supabase
    .from("blog_categories")
    .select("name, slug")
    .in("site_id", siteIds)
    .order("display_order", { ascending: true });

  // Posts da categoria
  const { data: posts } = await supabase
    .from("posts")
    .select("id, slug, title, meta_description, type, published_at, og_image_url")
    .in("site_id", siteIds)
    .eq("status", "published")
    .eq("category_id", category.id)
    .order("published_at", { ascending: false })
    .limit(50);

  const list = posts ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-6 py-12">
        {/* Breadcrumb */}
        <Link
          href={`/blog/${orgSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {org.name} · Blog
        </Link>

        {/* Header da categoria */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 mb-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <Tag className="w-3.5 h-3.5" />
            Categoria
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-muted-foreground leading-relaxed max-w-2xl">
              {category.description}
            </p>
          )}
          <div className="text-sm text-muted-foreground mt-3">
            {list.length} {list.length === 1 ? "post" : "posts"}
          </div>
        </header>

        {/* Menu de categorias */}
        <CategoryNav
          orgSlug={orgSlug}
          categories={allCategories ?? []}
          activeCatSlug={catSlug}
        />

        {/* Lista de posts */}
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Ainda não temos posts nessa categoria. Volte em breve.
          </div>
        ) : (
          <div className="space-y-6 mt-8">
            {list.map((p) => (
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
    </div>
  );
}
