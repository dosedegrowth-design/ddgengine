/**
 * Source Extract — pega um link (notícia, artigo, blog, post, vídeo do
 * YouTube) e extrai o conteúdo pra a engine adaptar num post original.
 *
 * Tipos suportados:
 *  - youtube: transcrição (legendas) + título/descrição
 *  - article: texto principal de páginas HTML (heurística readability-lite)
 *
 * Best-effort: se não conseguir extrair, devolve erro claro pro usuário
 * (ele pode colar o texto manualmente).
 */

// UA de browser real reduz bloqueios 403 de sites com proteção anti-bot.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface ExtractedSource {
  type: "youtube" | "article";
  title: string;
  text: string;
  sourceUrl: string;
}

export async function extractFromUrl(rawUrl: string): Promise<
  | { ok: true; source: ExtractedSource }
  | { ok: false; error: string }
> {
  let url: URL;
  try {
    url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return { ok: false, error: "Link inválido." };
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
    return extractYouTube(url);
  }
  return extractArticle(url);
}

// ---------------- YouTube ----------------

function youtubeId(url: URL): string | null {
  if (url.hostname.includes("youtu.be")) {
    return url.pathname.slice(1) || null;
  }
  return url.searchParams.get("v");
}

async function extractYouTube(
  url: URL
): Promise<{ ok: true; source: ExtractedSource } | { ok: false; error: string }> {
  const id = youtubeId(url);
  if (!id) return { ok: false, error: "Não consegui ler o ID do vídeo." };

  let html: string;
  try {
    // hl=pt + bpctr fura a tela de consentimento que esconde as legendas.
    const res = await fetch(
      `https://www.youtube.com/watch?v=${id}&hl=pt&bpctr=9999999999`,
      {
        headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
        signal: AbortSignal.timeout(8000),
      }
    );
    html = await res.text();
  } catch {
    return { ok: false, error: "Não consegui acessar o vídeo." };
  }

  // Título
  const title =
    html.match(/<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/ - YouTube$/, "") ??
    "Vídeo do YouTube";
  const description =
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
    )?.[1] ?? "";

  // Transcrição: extrai os pares (baseUrl, languageCode) das legendas direto
  // via regex (sem JSON.parse — nomes de track com "]" quebram o parse).
  let transcript = "";
  try {
    const tracks = Array.from(
      html.matchAll(
        /"baseUrl":"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"[\s\S]*?"languageCode":"([^"]+)"/g
      )
    ).map((m) => ({
      baseUrl: m[1].replace(/\\u0026/g, "&"),
      lang: m[2],
    }));
    // prefere pt, senão a primeira
    const track = tracks.find((t) => t.lang?.startsWith("pt")) ?? tracks[0];
    if (track?.baseUrl) {
      const tRes = await fetch(track.baseUrl, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(8000),
      });
      const xml = await tRes.text();
      transcript = Array.from(xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g))
        .map((m) => decodeHtml(m[1]))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }
  } catch {
    /* sem transcrição — usa título + descrição */
  }

  const text = [description, transcript].filter(Boolean).join("\n\n").trim();
  if (!text) {
    return {
      ok: false,
      error:
        "Esse vídeo não tem legendas/descrição que eu consiga ler. Cola o texto ou um resumo manualmente.",
    };
  }

  return {
    ok: true,
    source: { type: "youtube", title: cleanText(title), text: text.slice(0, 12000), sourceUrl: url.toString() },
  };
}

// ---------------- Artigo / página HTML ----------------

async function extractArticle(
  url: URL
): Promise<{ ok: true; source: ExtractedSource } | { ok: false; error: string }> {
  let html: string;
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "pt-BR,pt;q=0.9" },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) {
      return { ok: false, error: `A página respondeu ${res.status}. Cola o texto manualmente.` };
    }
    html = await res.text();
  } catch {
    return { ok: false, error: "Não consegui acessar a página. Cola o texto manualmente." };
  }

  // Título
  const title =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "") ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1] ??
    "Artigo";

  // Remove ruído
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "");

  // Prefere <article> ou <main> se existir
  const articleBlock =
    body.match(/<article[\s\S]*?<\/article>/i)?.[0] ??
    body.match(/<main[\s\S]*?<\/main>/i)?.[0] ??
    body;

  // Extrai parágrafos
  const paras = Array.from(articleBlock.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((m) => cleanText(m[1]))
    .filter((p) => p.length > 40); // descarta parágrafos curtos (menu/legendas)

  let text = paras.join("\n\n").trim();

  // Fallback: og:description se não achou parágrafos
  if (text.length < 200) {
    const ogDesc = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    )?.[1];
    if (ogDesc) text = cleanText(ogDesc);
  }

  if (text.length < 120) {
    return {
      ok: false,
      error:
        "Não consegui extrair texto suficiente dessa página. Cola o conteúdo manualmente.",
    };
  }

  return {
    ok: true,
    source: { type: "article", title: cleanText(title), text: text.slice(0, 14000), sourceUrl: url.toString() },
  };
}

// ---------------- helpers ----------------

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function cleanText(s: string): string {
  return decodeHtml(s.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
