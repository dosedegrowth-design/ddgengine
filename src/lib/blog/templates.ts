/**
 * Definição dos 4 templates de blog + helper de brand tokens.
 *
 * Filosofia: 1 layout base com 4 variantes via CSS variables.
 * O conteúdo (HTML) é o mesmo — o que muda é fonte, cor, espaçamento,
 * estilo de header e cards.
 */

export type BlogTemplate = "editorial" | "magazine" | "minimal" | "bold";

export interface BrandTokens {
  /** Cor primária da marca (hex). Usada em links, botões, accents. */
  primary_color: string;
  /** Cor secundária / contraste pra elementos especiais. */
  accent_color: string;
  /** Família de fontes principal (CSS font-family). */
  font_family: string;
  /** URL do CSS de fonte (Google Fonts, etc). Opcional. */
  font_url?: string;
}

export interface TemplateMeta {
  id: BlogTemplate;
  label: string;
  description: string;
  /** Boa pra qual nicho */
  bestFor: string;
  /** Características visuais resumidas */
  highlights: string[];
}

export const TEMPLATES_META: TemplateMeta[] = [
  {
    id: "editorial",
    label: "Editorial",
    description: "Foco em leitura confortável, tipo Substack ou Medium.",
    bestFor: "Consultoria, B2B, advocacia, mídia",
    highlights: ["Largura limitada pra leitura", "Sans pra UI + serif no texto", "Tipografia generosa"],
  },
  {
    id: "magazine",
    label: "Magazine",
    description: "Visual forte com grid de cards e hero edge-to-edge.",
    bestFor: "E-commerce, moda, beauty, lifestyle",
    highlights: ["Hero post em destaque", "Grid de cards visuais", "Tipografia bold"],
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Austero — preto, branco e um accent. Pouca distração.",
    bestFor: "SaaS, tech, fintech, design",
    highlights: ["Sem thumbs na lista", "Espaçamento generoso", "Tipografia sóbria"],
  },
  {
    id: "bold",
    label: "Bold",
    description: "Brutalist com bordas grossas, cores fortes e personalidade.",
    bestFor: "Agências, criativas, startups",
    highlights: ["Bordas pretas marcadas", "Cards quadrados", "Tipografia heavy"],
  },
];

/**
 * Defaults seguros se o site não tem brand_tokens preenchidos.
 * Combina com cada template (não com paleta DDG — o blog é DO cliente).
 */
const TEMPLATE_DEFAULTS: Record<BlogTemplate, BrandTokens> = {
  editorial: {
    primary_color: "#0f172a", // slate-900
    accent_color: "#dc2626", // red-600 (sóbrio)
    font_family: 'Georgia, "Times New Roman", serif',
  },
  magazine: {
    primary_color: "#000000",
    accent_color: "#ec4899", // pink-500
    font_family: '"Inter", system-ui, sans-serif',
  },
  minimal: {
    primary_color: "#000000",
    accent_color: "#3b82f6", // blue-500
    font_family: '"Inter", system-ui, sans-serif',
  },
  bold: {
    primary_color: "#000000",
    accent_color: "#c8ff3d", // lime
    font_family: '"Space Grotesk", "Inter", sans-serif',
  },
};

/**
 * Merge brand_tokens do site com defaults do template escolhido.
 * Site override sempre vence.
 */
export function resolveBrandTokens(
  template: BlogTemplate,
  siteTokens: Partial<BrandTokens> | null | undefined
): BrandTokens {
  const def = TEMPLATE_DEFAULTS[template] ?? TEMPLATE_DEFAULTS.editorial;
  return {
    primary_color: siteTokens?.primary_color || def.primary_color,
    accent_color: siteTokens?.accent_color || def.accent_color,
    font_family: siteTokens?.font_family || def.font_family,
    font_url: siteTokens?.font_url || def.font_url,
  };
}

/**
 * Converte os tokens em um inline style de CSS variables pro Shell.
 */
export function brandTokensToCSSVars(tokens: BrandTokens): React.CSSProperties {
  return {
    ["--blog-primary" as string]: tokens.primary_color,
    ["--blog-accent" as string]: tokens.accent_color,
    ["--blog-font" as string]: tokens.font_family,
  } as React.CSSProperties;
}

/**
 * Classes Tailwind aplicadas no <body> do blog conforme o template.
 * Usa CSS variables internamente — a aparência final vem dos tokens.
 */
export const TEMPLATE_BODY_CLASS: Record<BlogTemplate, string> = {
  editorial: "blog-editorial bg-stone-50 text-stone-900",
  magazine: "blog-magazine bg-white text-black",
  minimal: "blog-minimal bg-white text-stone-900",
  bold: "blog-bold bg-yellow-50 text-black",
};

/**
 * Detecta heuristicamente brand tokens a partir do site.audit_data.
 * MVP: retorna null se não conseguir — usa defaults do template.
 * Próxima rodada: parse CSS do site, extrair fonte/cor predominante.
 */
export function detectBrandTokensFromAudit(
  auditData: Record<string, unknown> | null | undefined
): Partial<BrandTokens> {
  if (!auditData) return {};
  // Espaço pra evoluir: parse CSS, computed styles, etc
  const detected: Partial<BrandTokens> = {};

  // Audit às vezes retorna cores predominantes em audit_data.colors
  const colors = (auditData as { colors?: unknown }).colors;
  if (Array.isArray(colors) && colors.length > 0) {
    const first = colors[0];
    if (typeof first === "string" && /^#[0-9a-f]{3,8}$/i.test(first)) {
      detected.primary_color = first;
    }
  }

  // Audit pode trazer fonte detectada
  const fonts = (auditData as { fonts?: unknown }).fonts;
  if (Array.isArray(fonts) && fonts.length > 0 && typeof fonts[0] === "string") {
    detected.font_family = `"${fonts[0]}", system-ui, sans-serif`;
  }

  return detected;
}
