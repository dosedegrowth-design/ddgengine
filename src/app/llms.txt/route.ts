/**
 * llms.txt manifest — formato proposto pra LLMs entenderem o site rapidamente.
 * Spec: https://llmstxt.org/
 */
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  type PostRow = {
    title: string | null;
    meta_description: string | null;
    slug: string;
    sites: unknown;
  };
  let posts: PostRow[] = [];

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          db: { schema: "ddg_engine" },
          auth: { autoRefreshToken: false, persistSession: false },
        }
      );

      const { data } = await supabase
        .from("posts")
        .select("title, meta_description, slug, sites(organizations(slug))")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);

      posts = (data ?? []) as PostRow[];
    } catch {
      // ignora — retorna manifest estático
    }
  }

  function getOrgSlug(sites: unknown): string | null {
    if (!sites) return null;
    const arr = Array.isArray(sites) ? sites : [sites];
    for (const s of arr) {
      const orgs = (s as { organizations?: unknown }).organizations;
      const orgArr = Array.isArray(orgs) ? orgs : orgs ? [orgs] : [];
      for (const o of orgArr) {
        const slug = (o as { slug?: string }).slug;
        if (slug) return slug;
      }
    }
    return null;
  }

  let content = `# Conteudai

> Visibilidade automática no Google e ChatGPT. SaaS brasileiro de blog automation com IA.

A primeira plataforma brasileira de visibilidade em IA + Google. Conecta seu site, preenche briefing de 7 minutos, IA escreve, otimiza e publica no seu domínio. Aprovação por WhatsApp. PIX. Setup sem plugin, sem código.

## Como funciona

- Conecta seu site (1 minuto)
- Preenche briefing inteligente (5 minutos)
- A IA escreve, otimiza, publica e mede
- Funciona em qualquer site (WordPress, Wix, Webflow, Shopify, custom)

## Diferenciais

- Funciona em qualquer site sem plugin
- Mede sua presença em ChatGPT, Perplexity, Claude e Gemini
- Aprovação por WhatsApp em 1 clique
- Briefing de 15 perguntas que vira contexto pra IA
- Auditoria automática do seu site antes de cobrar
- Forecast com banda de confiança

## Pricing

- Starter: R$ 97/mês — 4 artigos + 8 FAQs
- Light: R$ 197/mês — 6 artigos + 12 FAQs
- Pro: R$ 297/mês — 8 artigos + 16 FAQs + WhatsApp
- Multi: R$ 897/mês — 3 sites

`;

  if (posts.length > 0) {
    content += `## Posts recentes\n\n`;
    for (const p of posts) {
      const orgSlug = getOrgSlug(p.sites);
      if (orgSlug) {
        content += `- [${p.title}](${baseUrl}/blog/${orgSlug}/${p.slug}): ${p.meta_description ?? ""}\n`;
      }
    }
  }

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
