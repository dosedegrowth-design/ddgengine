/**
 * GET /blog/{orgSlug}/rss.xml — feed RSS pra agregadores e ferramentas
 * de IA que indexam por RSS (Apple News, etc).
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
    .select("id, name")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) return new NextResponse("Not found", { status: 404 });

  const { data: sites } = await supabase
    .from("sites")
    .select("id")
    .eq("organization_id", org.id);
  const siteIds = (sites ?? []).map((s) => s.id);

  const { data: posts } = await supabase
    .from("posts")
    .select("slug, title, meta_description, published_at, og_image_url")
    .in("site_id", siteIds)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (posts ?? [])
    .map(
      (p) => `    <item>
      <title>${escape(p.title ?? "")}</title>
      <link>${blogRoot}/${p.slug}</link>
      <guid>${blogRoot}/${p.slug}</guid>
      <pubDate>${p.published_at ? new Date(p.published_at).toUTCString() : new Date().toUTCString()}</pubDate>
      <description><![CDATA[${p.meta_description ?? ""}]]></description>${
        p.og_image_url
          ? `\n      <enclosure url="${escape(p.og_image_url)}" type="image/png" />`
          : ""
      }
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(org.name)} · Blog</title>
    <link>${blogRoot}</link>
    <description>Conteúdo de ${escape(org.name)}</description>
    <language>pt-BR</language>
    <atom:link href="${blogRoot}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
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
