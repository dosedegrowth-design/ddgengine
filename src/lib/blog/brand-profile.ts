/**
 * Brand Profile — lê o site do cliente e monta um "DNA visual" completo
 * pro blog parecer uma extensão do site dele (não um template genérico).
 *
 * Pipeline:
 *  1. extractDesignSignals: baixa HTML + CSS, extrai sinais brutos
 *     (cores+frequência, fontes, raio de borda, sombras).
 *  2. refineWithLLM: manda os sinais pro Claude, que devolve um perfil
 *     estruturado com garantia de legibilidade (contraste AA).
 *  3. Retorna Partial<BrandTokens> + template recomendado.
 *
 * Tudo best-effort: se algo falhar, devolve o que conseguiu (o resolve
 * usa defaults do template pro resto).
 */
import type { BlogTemplate, BrandTokens } from "./templates";
import { generateJsonWithFallback } from "@/lib/ai/with-fallback";

export interface BrandProfileResult {
  tokens: Partial<BrandTokens>;
  template?: BlogTemplate;
  vibe?: string;
}

interface DesignSignals {
  colors: Array<{ hex: string; count: number }>;
  fonts: string[];
  googleFontUrls: string[];
  radii: string[];
  hasShadow: boolean;
  htmlSnippet: string;
}

const UA =
  "Mozilla/5.0 (compatible; ConteudaiBot/1.0; +https://conteudai.com.br)";

function absUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function isBrandColor(hex: string): boolean {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = luminance(hex);
  if (lum > 235 || lum < 18) return false;
  const sat = max === 0 ? 0 : (max - min) / max;
  return sat >= 0.15;
}
function normHex(h: string): string | null {
  let x = h.toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(x)) x = "#" + x[1] + x[1] + x[2] + x[2] + x[3] + x[3];
  return /^#[0-9a-f]{6}$/.test(x) ? x : null;
}

/** Baixa HTML + CSS e extrai sinais de design brutos. */
export async function extractDesignSignals(
  siteUrl: string
): Promise<DesignSignals | null> {
  const base = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  let html: string;
  try {
    const res = await fetch(base, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // CSS: até 3 folhas linkadas + <style> inline + HTML
  const cssTexts: string[] = [];
  const hrefs = Array.from(
    html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)
  )
    .map((m) => absUrl(m[1], base))
    .filter(Boolean)
    .slice(0, 3);
  for (const href of hrefs) {
    try {
      const r = await fetch(href, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (r.ok) cssTexts.push(await r.text());
    } catch {
      /* ignora */
    }
  }
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    cssTexts.push(m[1]);
  }
  const allCss = cssTexts.join("\n") + "\n" + html;

  // Cores
  const counts = new Map<string, number>();
  for (const m of allCss.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    const hex = normHex(`#${m[1]}`);
    if (hex && isBrandColor(hex)) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  const colors = [...counts.entries()]
    .map(([hex, count]) => ({ hex, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Fontes (font-family declarations)
  const fontSet = new Set<string>();
  for (const m of allCss.matchAll(/font-family\s*:\s*([^;}\n]+)/gi)) {
    const fam = m[1].split(",")[0].replace(/["']/g, "").trim();
    if (fam && !/^(inherit|initial|unset|sans-serif|serif|monospace)$/i.test(fam)) {
      fontSet.add(fam);
    }
  }
  const fonts = [...fontSet].slice(0, 6);

  // Google Fonts URLs
  const googleFontUrls = Array.from(
    html.matchAll(/<link[^>]+href=["'](https:\/\/fonts\.googleapis\.com\/[^"']+)["']/gi)
  )
    .map((m) => m[1])
    .slice(0, 3);

  // Raios de borda
  const radiiSet = new Set<string>();
  for (const m of allCss.matchAll(/border-radius\s*:\s*([^;}\n]+)/gi)) {
    radiiSet.add(m[1].trim());
  }
  const radii = [...radiiSet].slice(0, 8);

  const hasShadow = /box-shadow\s*:\s*(?!none)/i.test(allCss);

  // Snippet do HTML (header + hero) pro LLM entender estrutura
  const htmlSnippet = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+/g, " ")
    .slice(0, 2500);

  return { colors, fonts, googleFontUrls, radii, hasShadow, htmlSnippet };
}

const PROFILE_SYSTEM = `Você é um designer de marca. Recebe SINAIS de design extraídos do site de uma empresa e monta um perfil visual pro BLOG dela ficar parecido com o site (mesma identidade), mas SEMPRE legível.

Regras de legibilidade (obrigatórias):
- text_color: quase preto (ex #1c1917, #18181b), alto contraste sobre fundo claro.
- bg_color: branco ou um tom MUITO claro da marca (ex #ffffff, #f8faf9).
- primary_color (títulos/links): a cor de marca mais ESCURA o suficiente pra ter contraste AA sobre o bg. Se a cor da marca for clara, escureça ela.
- accent_color: a cor de marca vibrante pra detalhes/bordas/marcadores.

Devolva SÓ um JSON com este formato exato:
{
  "primary_color": "#hex",
  "accent_color": "#hex",
  "bg_color": "#hex",
  "text_color": "#hex",
  "body_font_family": "Nome da Fonte",
  "heading_font_family": "Nome da Fonte",
  "radius": "sharp|soft|round|pill",
  "shadow": "none|soft|elevated",
  "button_style": "solid|outline|soft",
  "template": "editorial|magazine|minimal|bold",
  "vibe": "descrição curta da identidade (1 frase)"
}
Use as fontes detectadas. Se só tem 1 fonte, use a mesma pros dois. Escolha o template que mais combina com a vibe.`;

interface LLMProfile {
  primary_color?: string;
  accent_color?: string;
  bg_color?: string;
  text_color?: string;
  body_font_family?: string;
  heading_font_family?: string;
  radius?: BrandTokens["radius"];
  shadow?: BrandTokens["shadow"];
  button_style?: BrandTokens["button_style"];
  template?: BlogTemplate;
  vibe?: string;
}

function googleFontUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)
    .replace(/%20/g, "+")}:wght@400;500;600;700;800&display=swap`;
}

/**
 * Constrói o perfil de marca completo a partir do site do cliente.
 * Best-effort: sem sinais ou sem LLM → retorna {} (defaults do template).
 */
export async function buildBrandProfile(
  siteUrl: string
): Promise<BrandProfileResult> {
  const signals = await extractDesignSignals(siteUrl);
  if (!signals || (signals.colors.length === 0 && signals.fonts.length === 0)) {
    return { tokens: {} };
  }

  // Resumo compacto pro LLM
  const summary = [
    `Cores (hex, frequência): ${signals.colors
      .map((c) => `${c.hex}(${c.count})`)
      .join(", ")}`,
    `Fontes detectadas: ${signals.fonts.join(", ") || "nenhuma"}`,
    `Raios de borda: ${signals.radii.join(" | ") || "nenhum"}`,
    `Usa sombras: ${signals.hasShadow ? "sim" : "não"}`,
    `Trecho do HTML: ${signals.htmlSnippet}`,
  ].join("\n");

  let p: LLMProfile = {};
  try {
    const { data } = await generateJsonWithFallback<LLMProfile>({
      system: PROFILE_SYSTEM,
      userPrompt: summary,
      max_tokens: 600,
      temperature: 0.2,
      json: true,
    });
    p = data ?? {};
  } catch {
    // sem LLM — cai no fallback heurístico abaixo
  }

  // Fallback heurístico se o LLM não veio (usa cor mais escura como primary)
  if (!p.primary_color && signals.colors.length > 0) {
    const darkest = [...signals.colors].sort(
      (a, b) => luminance(a.hex) - luminance(b.hex)
    )[0].hex;
    const accent = signals.colors.find((c) => c.hex !== darkest)?.hex;
    p.primary_color = darkest;
    p.accent_color = accent;
  }

  // Monta tokens finais
  const bodyFont = p.body_font_family || signals.fonts[0];
  const headFont = p.heading_font_family || bodyFont;
  const tokens: Partial<BrandTokens> = {};
  if (p.primary_color) tokens.primary_color = p.primary_color;
  if (p.accent_color) tokens.accent_color = p.accent_color;
  if (p.bg_color) tokens.bg_color = p.bg_color;
  if (p.text_color) tokens.text_color = p.text_color;
  if (bodyFont) {
    tokens.font_family = `"${bodyFont}", system-ui, sans-serif`;
    tokens.font_url = signals.googleFontUrls[0] || googleFontUrl(bodyFont);
  }
  if (headFont && headFont !== bodyFont) {
    tokens.heading_font_family = `"${headFont}", system-ui, sans-serif`;
    tokens.heading_font_url = googleFontUrl(headFont);
  }
  if (p.radius) tokens.radius = p.radius;
  if (p.shadow) tokens.shadow = p.shadow;
  if (p.button_style) tokens.button_style = p.button_style;

  return { tokens, template: p.template, vibe: p.vibe };
}
