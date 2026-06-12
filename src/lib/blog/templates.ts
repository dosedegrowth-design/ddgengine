/**
 * Definição dos 4 templates de blog + helper de brand tokens.
 *
 * Filosofia: 1 layout base com 4 variantes via CSS variables.
 * O conteúdo (HTML) é o mesmo — o que muda é fonte, cor, espaçamento,
 * estilo de header e cards.
 */

export type BlogTemplate = "editorial" | "magazine" | "minimal" | "bold";

export interface BrandTokens {
  /** Cor primária da marca (hex). Títulos, links — precisa de bom contraste. */
  primary_color: string;
  /** Cor secundária / accent pra destaques, bordas, marcadores. */
  accent_color: string;
  /** Família de fontes principal (corpo). CSS font-family. */
  font_family: string;
  /** URL do CSS de fonte (Google Fonts, etc). Opcional. */
  font_url?: string;

  // ---- DNA visual estendido (auto-detectado do site do cliente) ----
  /** Fonte dos títulos (se diferente do corpo). */
  heading_font_family?: string;
  /** URL CSS da fonte de título, se diferente. */
  heading_font_url?: string;
  /** Cor de fundo do blog (default branco/quase-branco da marca). */
  bg_color?: string;
  /** Cor do texto do corpo (alto contraste sobre bg). */
  text_color?: string;
  /** Raio de borda dominante: "sharp" (0) | "soft" (8px) | "round" (16px) | "pill". */
  radius?: "sharp" | "soft" | "round" | "pill";
  /** Estilo de sombra: "none" (flat) | "soft" | "elevated". */
  shadow?: "none" | "soft" | "elevated";
  /** Estilo de botão/CTA: "solid" | "outline" | "soft". */
  button_style?: "solid" | "outline" | "soft";
}

/** Mapeia o token de raio pra valor CSS. */
export const RADIUS_CSS: Record<NonNullable<BrandTokens["radius"]>, string> = {
  sharp: "0px",
  soft: "8px",
  round: "16px",
  pill: "9999px",
};

/** Mapeia o token de sombra pra valor CSS. */
export const SHADOW_CSS: Record<NonNullable<BrandTokens["shadow"]>, string> = {
  none: "none",
  soft: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  elevated: "0 10px 30px -10px rgba(0,0,0,0.18)",
};

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
    primary_color: "#111827", // gray-900 (NÃO a paleta DDG)
    accent_color: "#f59e0b", // amber-500 (neutro forte, não o lime DDG)
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
  const t = siteTokens ?? {};
  return {
    primary_color: t.primary_color || def.primary_color,
    accent_color: t.accent_color || def.accent_color,
    font_family: t.font_family || def.font_family,
    font_url: t.font_url || def.font_url,
    // DNA estendido (só vem se detectado)
    heading_font_family: t.heading_font_family,
    heading_font_url: t.heading_font_url,
    bg_color: t.bg_color,
    text_color: t.text_color,
    radius: t.radius,
    shadow: t.shadow,
    button_style: t.button_style,
  };
}

/**
 * Converte os tokens em um inline style de CSS variables pro Shell.
 */
export function brandTokensToCSSVars(tokens: BrandTokens): React.CSSProperties {
  const vars: Record<string, string> = {
    "--blog-primary": tokens.primary_color,
    "--blog-accent": tokens.accent_color,
    "--blog-font": tokens.font_family,
    "--blog-heading-font": tokens.heading_font_family || tokens.font_family,
    "--blog-bg": tokens.bg_color || "#ffffff",
    "--blog-text": tokens.text_color || "#27272a",
    "--blog-radius": RADIUS_CSS[tokens.radius ?? "soft"],
    "--blog-shadow": SHADOW_CSS[tokens.shadow ?? "soft"],
  };
  return vars as React.CSSProperties;
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
