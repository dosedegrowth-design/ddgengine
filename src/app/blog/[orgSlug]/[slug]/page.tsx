import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

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

  return {
    title: post.title,
    description: post.meta_description,
    openGraph: {
      title: post.title,
      description: post.meta_description,
      type: "article",
      publishedTime: post.published_at,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.meta_description,
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

  const html = renderMarkdown(post.content_markdown);
  const schemas = Array.isArray(post.schema_markup)
    ? post.schema_markup
    : post.schema_markup
    ? [post.schema_markup]
    : [];

  return (
    <article className="min-h-screen bg-background">
      {/* Schema markup */}
      {(schemas as unknown[]).map((schema, i: number) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <div className="container mx-auto max-w-3xl px-6 py-16">
        <Link
          href={`/blog/${org.slug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          Todos os posts
        </Link>

        <header className="mb-8 space-y-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {post.type === "long_form" ? "Artigo" : "FAQ"}
            {post.published_at && ` · ${formatDate(post.published_at)}`}
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            {post.title}
          </h1>
          {post.meta_description && (
            <p className="text-lg text-muted-foreground leading-relaxed">
              {post.meta_description}
            </p>
          )}
        </header>

        <div
          className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-4 prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-a:text-foreground prose-a:underline prose-a:underline-offset-2 prose-code:before:hidden prose-code:after:hidden"
          dangerouslySetInnerHTML={{ __html: html }}
        />

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
