import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { calculateReadingTime, formatReadingTime } from "@/lib/posts/reading-time";
import { findRelatedPosts } from "@/lib/posts/related";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { SocialShare } from "@/components/blog/social-share";
import { NewsletterForm } from "@/components/blog/newsletter-form";

interface Params {
  orgSlug: string;
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { orgSlug, slug } = await params;
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!org) return { title: "Post não encontrado" };

  const { data: sites } = await supabase
    .from("sites")
    .select("id")
    .eq("organization_id", org.id);
  const siteIds = ((sites ?? []) as Array<{ id: string }>).map((s) => s.id);

  const { data: post } = await supabase
    .from("posts")
    .select("title, meta_description, published_at")
    .in("site_id", siteIds)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return { title: "Post não encontrado" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const ogImage = `${baseUrl}/blog/${orgSlug}/${slug}/og`;
  const canonicalUrl = `${baseUrl}/blog/${orgSlug}/${slug}`;

  return {
    title: post.title,
    description: post.meta_description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: post.title ?? "",
      description: post.meta_description ?? "",
      type: "article",
      publishedTime: post.published_at ?? undefined,
      url: canonicalUrl,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title ?? "",
      description: post.meta_description ?? "",
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { orgSlug, slug } = await params;
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!org) notFound();

  const { data: sites } = await supabase
    .from("sites")
    .select("id, domain")
    .eq("organization_id", org.id);
  const siteIds = ((sites ?? []) as Array<{ id: string; domain: string }>).map((s) => s.id);

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .in("site_id", siteIds)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post || !post.content_markdown) notFound();

  // Categoria do post (se houver) — pra breadcrumb e link "ver mais"
  let category: { name: string; slug: string } | null = null;
  if (post.category_id) {
    const { data: cat } = await supabase
      .from("blog_categories")
      .select("name, slug")
      .eq("id", post.category_id)
      .maybeSingle();
    if (cat) category = cat;
  }

  const html = renderMarkdown(post.content_markdown);
  const schemas = Array.isArray(post.schema_markup)
    ? post.schema_markup
    : post.schema_markup
    ? [post.schema_markup]
    : [];

  const reading = calculateReadingTime(post.content_markdown);
  const related = await findRelatedPosts(post.id, 3);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fullUrl = `${baseUrl}/blog/${org.slug}/${slug}`;

  return (
    <article className="min-h-screen bg-background">
      <ReadingProgress />

      {/* Schema markup */}
      {(schemas as unknown[]).map((schema, i: number) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <div className="container mx-auto max-w-3xl px-6 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8" aria-label="Breadcrumb">
          <Link href={`/blog/${org.slug}`} className="hover:text-foreground transition-colors">
            Blog
          </Link>
          {category && (
            <>
              <span>/</span>
              <Link
                href={`/blog/${org.slug}/categoria/${category.slug}`}
                className="hover:text-foreground transition-colors"
              >
                {category.name}
              </Link>
            </>
          )}
        </nav>

        <header className="mb-8 space-y-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {post.type === "long_form" ? "Artigo" : "FAQ"}
            {post.published_at && ` · ${formatDate(post.published_at)}`}
            {" · "}
            {formatReadingTime(reading.minutes)}
            {category && (
              <>
                {" · "}
                <Link
                  href={`/blog/${org.slug}/categoria/${category.slug}`}
                  className="text-foreground hover:underline"
                >
                  {category.name}
                </Link>
              </>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            {post.title}
          </h1>
          {post.meta_description && (
            <p className="text-lg text-muted-foreground leading-relaxed">
              {post.meta_description}
            </p>
          )}
          <div className="pt-2">
            <SocialShare url={fullUrl} title={(post.title as string) ?? ""} />
          </div>
        </header>

        <div
          className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-4 prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-a:text-foreground prose-a:underline prose-a:underline-offset-2 prose-code:before:hidden prose-code:after:hidden"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Social share final */}
        <div className="mt-12 pt-6 border-t">
          <SocialShare url={fullUrl} title={(post.title as string) ?? ""} />
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="mt-16 pt-8 border-t">
            <h2 className="text-xl font-semibold tracking-tight mb-6">
              Continue lendo
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/blog/${org.slug}/${r.slug}`}
                  className="block p-4 rounded-lg border hover:shadow-md transition-shadow"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {r.type === "long_form" ? "Artigo" : "FAQ"}
                  </div>
                  <div className="font-medium leading-tight">{r.title}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Newsletter */}
        <div className="mt-12">
          <NewsletterForm orgSlug={org.slug as string} orgName={org.name as string} />
        </div>

        <footer className="mt-16 pt-8 border-t text-sm text-muted-foreground space-y-2">
          <div>Publicado por {org.name}</div>
          <div>
            Conteúdo gerado com{" "}
            <Link href="/" className="underline hover:text-foreground">
              DDG Engine
            </Link>
          </div>
        </footer>
      </div>
    </article>
  );
}
