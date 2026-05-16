/**
 * Endpoint interno usado pelo Cloudflare Worker pra buscar o HTML do post.
 *
 * Quando visitante acessa cliente.com/blog/post-x, o Worker faz fetch
 * em `https://app.ddgengine.com.br/_proxy/[tenantSlug]/post-x` pra
 * pegar o HTML, reescrever URLs e devolver pro visitante.
 *
 * Esta rota NÃO requer auth (é pública por design).
 */
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

interface Params {
  tenantSlug: string;
  slug: string[];
}

export const revalidate = 300; // 5 min ISR

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { tenantSlug, slug } = await params;
  const postSlug = slug?.join("/") ?? "";
  const supabase = createServiceClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("tenant_slug", tenantSlug)
    .maybeSingle();
  if (!site) return { title: "Blog" };

  const { data: post } = await supabase
    .from("posts")
    .select("title, meta_description")
    .eq("site_id", site.id)
    .eq("slug", postSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return { title: "Post não encontrado" };
  return { title: post.title, description: post.meta_description };
}

export default async function ProxyPostPage({ params }: { params: Promise<Params> }) {
  const { tenantSlug, slug } = await params;
  const postSlug = slug?.join("/") ?? "";
  const supabase = createServiceClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id, domain, organization_id")
    .eq("tenant_slug", tenantSlug)
    .maybeSingle();
  if (!site) notFound();

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("site_id", site.id)
    .eq("slug", postSlug)
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
    <article className="min-h-screen bg-white text-black">
      {(schemas as unknown[]).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <div className="container mx-auto max-w-3xl px-6 py-16">
        <header className="mb-8 space-y-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {post.type === "long_form" ? "Artigo" : "FAQ"}
            {post.published_at && ` · ${formatDate(post.published_at)}`}
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            {post.title}
          </h1>
          {post.meta_description && (
            <p className="text-lg text-gray-600 leading-relaxed">{post.meta_description}</p>
          )}
        </header>

        <div
          className="prose prose-neutral max-w-none prose-headings:font-semibold"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </article>
  );
}
