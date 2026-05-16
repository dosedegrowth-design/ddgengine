/**
 * Geração de imagem hero pra cada post.
 *
 * Usa OpenAI gpt-image-1 (sucessor de DALL-E 3) ou Flux Schnell via Replicate.
 * Imagem 1792x1024 (landscape), salva em Cloudflare R2 (futuro) ou inline.
 */
import OpenAI from "openai";

let _client: OpenAI | null = null;
function client() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export interface GenerateImageInput {
  /** Descrição visual da imagem (não o título do post — mais visual) */
  prompt: string;
  /** Estilo: photo | illustration | abstract */
  style?: "photo" | "illustration" | "abstract";
  /** Dimensão */
  size?: "1024x1024" | "1792x1024" | "1024x1792";
}

export interface GenerateImageResult {
  /** URL temporária (válida por 1h) */
  url: string;
  /** Custo em USD */
  costUsd: number;
  /** Provider usado */
  provider: "openai-gpt-image" | "flux-schnell";
}

const STYLE_PROMPTS: Record<NonNullable<GenerateImageInput["style"]>, string> = {
  photo: "Editorial photograph, natural lighting, shallow depth of field, professional, high quality, no text, no logos",
  illustration: "Modern flat illustration, soft colors, minimalist, geometric, no text, professional",
  abstract: "Abstract concept art, modern, gradient colors, soft, no text, no logos",
};

/**
 * Gera imagem hero pra post (OpenAI gpt-image-1).
 * Custo estimado: ~US$ 0.04 por imagem standard.
 */
export async function generateHeroImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  const stylePrompt = STYLE_PROMPTS[input.style ?? "photo"];
  const fullPrompt = `${input.prompt}. ${stylePrompt}.`;

  const response = await client().images.generate({
    model: "gpt-image-1",
    prompt: fullPrompt,
    size: input.size ?? "1792x1024",
    quality: "medium",
    n: 1,
  });

  const url = response.data?.[0]?.url ?? response.data?.[0]?.b64_json;
  if (!url) throw new Error("Imagem não gerada");

  return {
    url: url.startsWith("http") ? url : `data:image/png;base64,${url}`,
    costUsd: 0.04,
    provider: "openai-gpt-image",
  };
}

/**
 * Constrói prompt visual a partir do título + briefing do post.
 * Usado quando não recebemos prompt manual.
 */
export function buildVisualPromptFromTitle(title: string, vertical?: string): string {
  // Heurística simples: extrai conceito principal do título
  const cleanTitle = title.replace(/[?!.,]/g, "").trim();
  const verticalContext: Record<string, string> = {
    health: "medical, healthcare, clean modern",
    legal: "professional, office, books, neutral tones",
    ecommerce: "product, lifestyle, retail",
    saas: "modern office, technology, computer screens",
    education: "learning, classroom, modern study environment",
    real_estate: "modern home, architecture, interior",
    restaurant: "food, kitchen, dining",
    local_service: "service, professional, brazilian context",
    b2b_industrial: "industrial, machinery, factory",
    consulting: "meeting, business, professional",
    media: "creative, design, modern editorial",
  };

  const contextHint = vertical ? verticalContext[vertical] ?? "" : "";
  return `Editorial concept image representing: ${cleanTitle}. Context: ${contextHint}`;
}
