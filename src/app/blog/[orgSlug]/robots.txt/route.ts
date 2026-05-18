/**
 * GET /blog/{orgSlug}/robots.txt
 *
 * Permite todos os crawlers + aponta pro sitemap específico do org.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ddgengine.vercel.app";

  const body = `User-agent: *
Allow: /

# AI crawlers (LLMs/RAG bots) — explicitly allowed
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: ${baseUrl}/blog/${orgSlug}/sitemap.xml
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
