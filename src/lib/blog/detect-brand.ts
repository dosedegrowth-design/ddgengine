/**
 * Detecta brand tokens (cor + fonte) do site público do cliente.
 *
 * Estratégia MVP — leve, sem parser CSS pesado:
 *  1. Fetch HTML da URL
 *  2. Extrai <meta name="theme-color" content="#...">
 *  3. Extrai primeira Google Font referenciada (<link href="fonts.googleapis...">)
 *  4. Se nada disso, retorna {} (BlogShell usa defaults do template)
 *
 * Funciona sem dependências extras. Próxima evolução: HEAD request HTML
 * + Puppeteer headless pra computar cor do CSS principal.
 */
import type { BrandTokens } from "./templates";

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export async function detectBrandTokensFromUrl(
  siteUrl: string
): Promise<Partial<BrandTokens>> {
  const out: Partial<BrandTokens> = {};
  if (!siteUrl) return out;

  let html: string;
  try {
    const url = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DDGEngine/1.0; +https://ddgengine.vercel.app)",
        Accept: "text/html",
      },
      // 6s timeout
      signal: AbortSignal.timeout(6000),
      // Não acumula cache pra audits
      cache: "no-store",
    });
    if (!res.ok) return out;
    html = await res.text();
  } catch {
    return out;
  }

  // 1. theme-color
  const themeMatch = html.match(
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i
  );
  const themeColor = themeMatch?.[1]?.trim();
  if (themeColor && HEX_RE.test(themeColor)) {
    out.primary_color = themeColor.toLowerCase();
  }

  // 2. Open Graph theme-color (fallback)
  if (!out.primary_color) {
    const ogColorMatch = html.match(
      /<meta[^>]+property=["']og:theme-color["'][^>]+content=["']([^"']+)["']/i
    );
    const ogColor = ogColorMatch?.[1]?.trim();
    if (ogColor && HEX_RE.test(ogColor)) {
      out.primary_color = ogColor.toLowerCase();
    }
  }

  // 3. Google Font (primeiro link encontrado)
  const fontMatch = html.match(
    /<link[^>]+href=["']https:\/\/fonts\.googleapis\.com\/css2?\?family=([^"&']+)/i
  );
  if (fontMatch?.[1]) {
    const familyRaw = decodeURIComponent(fontMatch[1]).replace(/\+/g, " ");
    // 'Inter:wght@400;700' -> 'Inter'
    const family = familyRaw.split(":")[0].trim();
    if (family) {
      out.font_family = `"${family}", system-ui, sans-serif`;
      out.font_url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        family
      ).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
    }
  }

  return out;
}
