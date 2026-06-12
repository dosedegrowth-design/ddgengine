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
import { BlogShell } from "@/components/blog/blog-shell";
import { loadBlogShellContext } from "@/lib/blog/load-shell-context";
import { getBlogBasePath, publicBlogBaseUrl } from "@/lib/blog/base-path";

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
    .select("id, blog_host, cname_verified")
    .eq("organization_id", org.id);
  const siteRows = (sites ?? []) as Array<{
    id: string;
    blog_host: string | null;
    cname_verified: boolean | null;
  }>;
  const siteIds = siteRows.map((s) => s.id);

  const { data: post } = await supabase
    .from("posts")
    .select("title, meta_description, published_at, site_id")
    .in("site_id", siteIds)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return { title: "Post não encontrado" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // Canonical aponta pro subdomínio DO CLIENTE quando conectado (autoridade
  // SEO vai pro domínio dele, não pro nosso). Senão, cai no preview.
  const postSite = siteRows.find((s) => s.id === post.site_id);
  const publicBase = publicBlogBaseUrl({
    blogHost: postSite?.blog_host,
    cnameVerified: postSite?.cname_verified,
  });
  const ogImage = `${baseUrl}/blog/${orgSlug}/${slug}/og`;
  const canonicalUrl = publicBase
    ? `${publicBase}/${slug}`
    : `${baseUrl}/blog/${orgSlug}/${slug}`;

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

  const basePath = await getBlogBasePath(org.slug);

  const { template, tokens, siteIds } = await loadBlogShellContext(org.id);

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
  // URL de compartilhamento aponta pro subdomínio do cliente quando conectado.
  const { data: hostSite } = await supabase
    .from("sites")
    .select("blog_host, cname_verified")
    .eq("id", post.site_id as string)
    .maybeSingle();
  const sharePublicBase = publicBlogBaseUrl({
    blogHost: hostSite?.blog_host as string | null,
    cnameVerified: hostSite?.cname_verified as boolean | null,
  });
  const fullUrl = sharePublicBase
    ? `${sharePublicBase}/${slug}`
    : `${baseUrl}/blog/${org.slug}/${slug}`;

  return (
    <BlogShell template={template} tokens={tokens} orgSlug={org.slug} orgName={org.name} basePath={basePath}>
      <ReadingProgress />

      {/* Schema markup */}
      {(schemas as unknown[]).map((schema, i: number) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <article className="container mx-auto max-w-3xl px-6 py-12 md:py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8" aria-label="Breadcrumb">
          <Link href={basePath || "/"} className="hover:text-foreground transition-colors">
            Blog
          </Link>
          {category && (
            <>
              <span>/</span>
              <Link
                href={`${basePath}/categoria/${category.slug}`}
                className="hover:text-foreground transition-colors"
              >
                {category.name}
              </Link>
            </>
          )}
        </nav>

        <header className="mb-8 space-y-3">
          <div className="text-xs opacity-60 uppercase tracking-wide">
            {post.type === "long_form" ? "Artigo" : "FAQ"}
            {post.published_at && ` · ${formatDate(post.published_at)}`}
            {" · "}
            {formatReadingTime(reading.minutes)}
            {category && (
              <>
                {" · "}
                <Link
                  href={`${basePath}/categoria/${category.slug}`}
                  className="opacity-100 hover:underline"
                  style={{ color: "var(--blog-accent)" }}
                >
                  {category.name}
                </Link>
              </>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl tracking-tight text-balance">
            {post.title}
          </h1>
          {post.meta_description && (
            <p className="text-lg opacity-70 leading-relaxed">
              {post.meta_description}
            </p>
          )}
          <div className="pt-2">
            <SocialShare url={fullUrl} title={(post.title as string) ?? ""} />
          </div>
        </header>

        {/* Hero image (gerada pela IA ou upload manual) */}
        {post.og_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.og_image_url as string}
            alt={(post.title as string) ?? ""}
            className="w-full h-auto rounded-xl border border-current/10 mb-10"
            loading="lazy"
          />
        )}

        <div
          className="blog-prose prose prose-neutral max-w-none prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-4 prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-a:underline prose-a:underline-offset-2 prose-code:before:hidden prose-code:after:hidden"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Social share final */}
        <div className="mt-12 pt-6 border-t">
          <SocialShare url={fullUrl} title={(post.title as string) ?? ""} />
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="mt-16 pt-8 border-t border-current/10">
            <h2 className="text-xl tracking-tight mb-6">Continue lendo</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {related.map((r) => {
                const img = (r as { og_image_url?: string | null }).og_image_url;
                return (
                  <Link
                    key={r.id}
                    href={`${basePath}/${r.slug}`}
                    className="blog-card block rounded-lg border border-current/10 overflow-hidden hover:opacity-90 transition-all"
                  >
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="w-full h-32 object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-4">
                      <div className="text-xs opacity-60 mb-1">
                        {r.type === "long_form" ? "Artigo" : "FAQ"}
                      </div>
                      <div className="font-medium leading-tight line-clamp-3">
                        {r.title}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Newsletter */}
        <div className="mt-12">
          <NewsletterForm orgSlug={org.slug as string} orgName={org.name as string} />
        </div>
      </article>
    </BlogShell>
  );
}
