/**
 * GET /blog/{orgSlug}/sitemap.xml — mapa do site pro Google + crawlers de IA.
 *
 * Inclui:
 * - Index do blog
 * - Cada categoria
 * - Cada post publicado
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const supabase = createServiceClient();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://conteudai.com.br";
  const blogRoot = `${baseUrl}/blog/${orgSlug}`;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) return new NextResponse("Not found", { status: 404 });

  const { data: sites } = await supabase
    .from("sites")
    .select("id")
    .eq("organization_id", org.id);
  const siteIds = (sites ?? []).map((s) => s.id);

  const [{ data: posts }, { data: cats }] = await Promise.all([
    supabase
      .from("posts")
      .select("slug, published_at, updated_at")
      .in("site_id", siteIds)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5000),
    supabase
      .from("blog_categories")
      .select("slug, updated_at")
      .in("site_id", siteIds),
  ]);

  const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [
    { loc: blogRoot, changefreq: "daily", priority: "0.9" },
  ];
  for (const c of cats ?? []) {
    urls.push({
      loc: `${blogRoot}/categoria/${c.slug}`,
      lastmod: (c.updated_at as string) ?? undefined,
      changefreq: "weekly",
      priority: "0.7",
    });
  }
  for (const p of posts ?? []) {
    urls.push({
      loc: `${blogRoot}/${p.slug}`,
      lastmod: (p.updated_at ?? p.published_at) as string,
      changefreq: "monthly",
      priority: "0.8",
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escape(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq ?? "weekly"}</changefreq>
    <priority>${u.priority ?? "0.5"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
