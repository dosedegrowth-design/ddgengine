/**
 * Repurpose Engine — transforma post em outros formatos.
 *
 * Newsletter, post LinkedIn, thread Twitter, post Instagram,
 * lead magnet (PDF guia), tradução.
 */
import { generateWithClaude, parseJsonResponse } from "./claude";
import { createServiceClient } from "@/lib/supabase/server";

interface BasePostData {
  title: string;
  meta_description: string | null;
  content_markdown: string;
}

async function loadPost(postId: string): Promise<BasePostData> {
  const supabase = createServiceClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title, meta_description, content_markdown")
    .eq("id", postId)
    .single();
  if (!post) throw new Error("Post não encontrado");
  return post as BasePostData;
}

// =================== NEWSLETTER ===================
export async function generateNewsletter(postId: string): Promise<{ subject: string; html: string; text: string; cost_usd: number }> {
  const post = await loadPost(postId);
  const result = await generateWithClaude({
    system: `Você transforma um post de blog num email de newsletter brasileira.

REGRAS:
- Subject curto (50-65 chars), instigante, sem clickbait barato
- Corpo: introdução pessoal (1 parágrafo) + 3-5 takeaways do post + CTA pra ler completo
- Tom: pessoa pra pessoa, não corporativo
- ~250-400 palavras

OUTPUT JSON:
{
  "subject": "...",
  "intro": "parágrafo de abertura, pessoal",
  "takeaways": ["ponto 1", "ponto 2", ...],
  "cta_label": "Ler completo no blog",
  "preview_text": "Pré-header de 80-120 chars que aparece na inbox antes de abrir"
}`,
    messages: [
      {
        role: "user",
        content: `Título: ${post.title}\n\nMeta: ${post.meta_description ?? ""}\n\nConteúdo:\n${post.content_markdown.slice(0, 6000)}`,
      },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  const parsed = parseJsonResponse<{
    subject: string;
    intro: string;
    takeaways: string[];
    cta_label: string;
    preview_text: string;
  }>(result.text);

  const html = renderNewsletterHtml(parsed, post);
  const text = `${parsed.intro}\n\nDestaques:\n${parsed.takeaways.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nLer completo: [link]`;

  return {
    subject: parsed.subject,
    html,
    text,
    cost_usd: result.cost_usd,
  };
}

function renderNewsletterHtml(content: { intro: string; takeaways: string[]; cta_label: string; preview_text: string }, post: BasePostData): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>${escapeHtml(post.title)}</title>
<meta name="description" content="${escapeHtml(content.preview_text)}"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,sans-serif;">
<div style="display:none">${escapeHtml(content.preview_text)}</div>
<table cellpadding="0" cellspacing="0" width="100%" style="padding:40px 16px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;">
<tr><td style="padding:32px;">
<h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;">${escapeHtml(post.title)}</h1>
<p style="margin:0 0 24px 0;color:#525252;line-height:1.6;">${escapeHtml(content.intro)}</p>
<h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#737373;margin:24px 0 12px 0;">Destaques</h2>
<ol style="margin:0 0 24px 0;padding-left:20px;color:#0a0a0a;line-height:1.6;">
${content.takeaways.map((t) => `<li style="margin-bottom:8px;">${escapeHtml(t)}</li>`).join("")}
</ol>
<p style="margin:24px 0;">
<a href="{{post_url}}" style="display:inline-block;padding:12px 24px;background:#0a0a0a;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;">${escapeHtml(content.cta_label)}</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// =================== LINKEDIN POST ===================
export async function generateLinkedInPost(postId: string): Promise<{ post: string; hashtags: string[]; cost_usd: number }> {
  const post = await loadPost(postId);
  const result = await generateWithClaude({
    system: `Você transforma post de blog em post LinkedIn em português brasileiro.

REGRAS:
- Hook poderoso na primeira linha (que aparece no preview)
- 1300-1500 caracteres (limite ideal LinkedIn)
- Quebras de linha generosas (linhas curtas)
- 1 emoji estratégico por bloco máximo
- Termina com pergunta convidando comentário
- 3-5 hashtags relevantes em pt-BR

OUTPUT JSON:
{
  "post": "texto completo com quebras \\n\\n",
  "hashtags": ["#x", "#y", "#z"]
}`,
    messages: [
      {
        role: "user",
        content: `Título: ${post.title}\n\nConteúdo:\n${post.content_markdown.slice(0, 6000)}`,
      },
    ],
    max_tokens: 1500,
    temperature: 0.75,
  });

  const parsed = parseJsonResponse<{ post: string; hashtags: string[] }>(result.text);
  return { post: parsed.post, hashtags: parsed.hashtags, cost_usd: result.cost_usd };
}

// =================== TWITTER THREAD ===================
export async function generateTwitterThread(postId: string): Promise<{ tweets: string[]; cost_usd: number }> {
  const post = await loadPost(postId);
  const result = await generateWithClaude({
    system: `Você transforma post em thread X/Twitter em pt-BR.

REGRAS:
- 5-8 tweets
- Cada tweet máx 280 caracteres
- Tweet 1 (hook): grande promessa ou contradição
- Último tweet: CTA + link [substituir]
- Sem hashtags repetitivas
- Numeração tipo "1/" no final de cada tweet

OUTPUT JSON: { "tweets": ["tweet 1...", "tweet 2..."] }`,
    messages: [
      {
        role: "user",
        content: `Título: ${post.title}\n\nConteúdo:\n${post.content_markdown.slice(0, 5000)}`,
      },
    ],
    max_tokens: 2000,
    temperature: 0.75,
  });

  const parsed = parseJsonResponse<{ tweets: string[] }>(result.text);
  return { tweets: parsed.tweets, cost_usd: result.cost_usd };
}

// =================== INSTAGRAM CAROUSEL ===================
export async function generateInstagramCarousel(postId: string): Promise<{ slides: Array<{ title: string; text: string }>; caption: string; cost_usd: number }> {
  const post = await loadPost(postId);
  const result = await generateWithClaude({
    system: `Você transforma post em carrossel Instagram em pt-BR.

REGRAS:
- 7-10 slides
- Slide 1: capa com pergunta/promessa forte
- Slide 2: contexto
- Slides 3-N: takeaways (1 ideia por slide)
- Último slide: CTA "salve e compartilhe" + perfil
- Cada slide: title (até 5 palavras) + text (até 100 chars)
- Caption: 200-400 chars com hashtags

OUTPUT JSON:
{
  "slides": [{"title":"...","text":"..."}, ...],
  "caption": "..."
}`,
    messages: [
      {
        role: "user",
        content: `Título: ${post.title}\n\nConteúdo:\n${post.content_markdown.slice(0, 5000)}`,
      },
    ],
    max_tokens: 2000,
    temperature: 0.75,
  });

  return { ...parseJsonResponse<{ slides: Array<{ title: string; text: string }>; caption: string }>(result.text), cost_usd: result.cost_usd };
}

// =================== LEAD MAGNET (Guia PDF) ===================
export async function generateLeadMagnet(postId: string): Promise<{ title: string; subtitle: string; chapters: Array<{ heading: string; content: string }>; html: string; cost_usd: number }> {
  const post = await loadPost(postId);
  const result = await generateWithClaude({
    system: `Você transforma post em lead magnet (guia gratuito em PDF) em pt-BR.

REGRAS:
- Versão expandida e aprofundada do post
- 4-6 capítulos
- Cada capítulo com heading + 200-400 palavras
- Tom didático, com exemplos
- Subtitle: promessa transformacional

OUTPUT JSON:
{
  "title": "Título do guia",
  "subtitle": "Promessa de transformação",
  "chapters": [{"heading":"...","content":"..."}, ...]
}`,
    messages: [
      {
        role: "user",
        content: `Post base — Título: ${post.title}\n\nConteúdo:\n${post.content_markdown.slice(0, 8000)}`,
      },
    ],
    max_tokens: 8000,
    temperature: 0.7,
  });

  const parsed = parseJsonResponse<{
    title: string;
    subtitle: string;
    chapters: Array<{ heading: string; content: string }>;
  }>(result.text);

  const html = renderLeadMagnetHtml(parsed);

  return { ...parsed, html, cost_usd: result.cost_usd };
}

function renderLeadMagnetHtml(magnet: { title: string; subtitle: string; chapters: Array<{ heading: string; content: string }> }): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
@page { size: A4; margin: 25mm; }
body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #0a0a0a; max-width: 700px; margin: 0 auto; padding: 20px; }
h1 { font-size: 48px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 12px 0; }
.subtitle { font-size: 20px; color: #525252; margin: 0 0 40px 0; }
h2 { font-size: 26px; margin: 40px 0 16px 0; letter-spacing: -0.01em; }
p { margin: 0 0 16px 0; }
.cover { padding: 80px 40px; background: linear-gradient(135deg, #0a0a0a, #1a1a1a); color: #fff; margin: 0 -20px 60px -20px; }
.cover h1 { color: #fff; }
.cover .subtitle { color: #a3a3a3; }
.footer { margin-top: 80px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #737373; font-size: 13px; }
</style></head>
<body>
<div class="cover">
<h1>${escapeHtml(magnet.title)}</h1>
<p class="subtitle">${escapeHtml(magnet.subtitle)}</p>
</div>
${magnet.chapters
  .map(
    (c) => `<h2>${escapeHtml(c.heading)}</h2><p>${escapeHtml(c.content).replace(/\n\n+/g, "</p><p>")}</p>`
  )
  .join("")}
<div class="footer">Gerado pelo DDG Engine · ddgengine.com.br</div>
</body></html>`;
}

// =================== TRANSLATION ===================
export async function translatePost(postId: string, targetLang: "en" | "es"): Promise<{ title: string; meta_description: string; content_markdown: string; cost_usd: number }> {
  const post = await loadPost(postId);
  const langName = targetLang === "en" ? "English" : "Spanish (Spain)";
  const result = await generateWithClaude({
    system: `You translate Brazilian Portuguese blog content to ${langName}.

RULES:
- Natural ${langName}, not literal translation
- Keep markdown formatting
- Adapt cultural references when needed
- Keep schema and CTAs equivalent

OUTPUT JSON: { "title": "...", "meta_description": "...", "content_markdown": "..." }`,
    messages: [
      {
        role: "user",
        content: `Title: ${post.title}\nMeta: ${post.meta_description ?? ""}\n\nContent:\n${post.content_markdown}`,
      },
    ],
    max_tokens: 8000,
    temperature: 0.5,
  });

  return { ...parseJsonResponse<{ title: string; meta_description: string; content_markdown: string }>(result.text), cost_usd: result.cost_usd };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
