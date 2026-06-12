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

  const base = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  let html: string;
  try {
    const url = base;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ConteudaiBot/1.0; +https://conteudai.com.br)",
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
      ).replace(/%20/g, "+")}:wght@400;500;600;700;800&display=swap`;
    }
  }

  // 4. Cores da marca a partir do CSS do site (quando não veio theme-color).
  //    Baixa as folhas de estilo linkadas + cores inline, conta as cores
  //    "de marca" (saturadas, nem branco/preto/cinza) e usa as 2 mais
  //    frequentes como primary (escura, p/ contraste) e accent.
  try {
    const brand = await detectBrandColorsFromCss(base, html);
    if (brand.primary && !out.primary_color) out.primary_color = brand.primary;
    if (brand.accent) out.accent_color = brand.accent;
  } catch {
    // silencioso — defaults do template cobrem
  }

  return out;
}

/** Resolve URL do CSS relativa ao site. */
function absUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

interface BrandColors {
  primary?: string;
  accent?: string;
}

/**
 * Baixa o(s) CSS do site + cores inline do HTML, conta as cores "de marca"
 * (HSL com saturação e luminância no meio — exclui branco/preto/cinza) e
 * devolve as 2 mais frequentes: primary = a mais ESCURA (melhor contraste
 * pra títulos/links), accent = a outra mais frequente.
 */
async function detectBrandColorsFromCss(
  base: string,
  html: string
): Promise<BrandColors> {
  // Coleta CSS: arquivos linkados (até 3) + <style> inline
  const cssTexts: string[] = [];

  const linkHrefs = Array.from(
    html.matchAll(
      /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi
    )
  )
    .map((m) => absUrl(m[1], base))
    .filter(Boolean)
    .slice(0, 3);

  for (const href of linkHrefs) {
    try {
      const r = await fetch(href, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (r.ok) cssTexts.push(await r.text());
    } catch {
      /* ignora css que falha */
    }
  }
  // <style> inline + atributos style do próprio HTML
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    cssTexts.push(m[1]);
  }
  cssTexts.push(html);

  // Conta cores hex
  const counts = new Map<string, number>();
  for (const css of cssTexts) {
    for (const m of css.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
      const hex = normalizeHex(`#${m[1]}`);
      if (!hex) continue;
      if (!isBrandColor(hex)) continue;
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return {};

  // Ordena por frequência
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  const top = ranked.slice(0, 6);

  // primary = a cor de marca mais ESCURA do top (contraste); accent = a mais
  // frequente que não seja a primary.
  const darkest = [...top].sort((a, b) => luminance(a) - luminance(b))[0];
  const accent = ranked.find((c) => c !== darkest);

  return { primary: darkest, accent };
}

function normalizeHex(hex: string): string | null {
  let h = hex.toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(h)) {
    h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  return /^#[0-9a-f]{6}$/.test(h) ? h : null;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** É cor "de marca"? exclui branco/preto/cinza e tons quase-neutros. */
function isBrandColor(hex: string): boolean {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = luminance(hex);
  // muito claro (quase branco) ou muito escuro (quase preto) → fora
  if (lum > 235 || lum < 18) return false;
  // saturação baixa (cinza) → fora
  const sat = max === 0 ? 0 : (max - min) / max;
  if (sat < 0.18) return false;
  return true;
}
