/**
 * Geração de imagem hero pra cada post.
 *
 * Usa OpenAI gpt-image-1. Retorna bytes (Buffer) prontos pra upload
 * no Supabase Storage — não URL temporária (que vence em 1h).
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
  prompt: string;
  style?: "photo" | "illustration" | "abstract";
  size?: "1024x1024" | "1536x1024" | "1024x1536";
}

export interface GenerateImageResult {
  /** Bytes da imagem (PNG) prontos pra upload */
  bytes: Buffer;
  /** Custo em USD */
  costUsd: number;
  /** Provider usado */
  provider: "openai-gpt-image";
  /** Prompt final aplicado */
  prompt: string;
}

const STYLE_PROMPTS: Record<NonNullable<GenerateImageInput["style"]>, string> = {
  photo:
    "Editorial photograph, natural lighting, shallow depth of field, professional, high quality, no text, no logos, no watermarks",
  illustration:
    "Modern flat illustration, soft colors, minimalist, geometric, no text, professional",
  abstract:
    "Abstract concept art, modern, gradient colors, soft, no text, no logos",
};

/**
 * Gera imagem hero (1536x1024 landscape) usando OpenAI gpt-image-1.
 * Custo ~US$ 0.04 por imagem em quality=medium.
 */
export async function generateHeroImage(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  const stylePrompt = STYLE_PROMPTS[input.style ?? "photo"];
  const fullPrompt = `${input.prompt}. ${stylePrompt}.`;

  const response = await client().images.generate({
    model: "gpt-image-1",
    prompt: fullPrompt,
    size: input.size ?? "1536x1024",
    quality: "medium",
    n: 1,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI não retornou imagem (b64_json vazio)");

  return {
    bytes: Buffer.from(b64, "base64"),
    costUsd: 0.04,
    provider: "openai-gpt-image",
    prompt: fullPrompt,
  };
}

/**
 * Constrói prompt visual a partir do título + vertical.
 */
export function buildVisualPromptFromTitle(title: string, vertical?: string): string {
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
    beauty: "modern beauty studio, soft lighting, brazilian context, no text",
    barbershop:
      "modern barbershop interior, brazilian context, soft lighting, no text, no logos",
  };

  const contextHint = vertical ? verticalContext[vertical] ?? "" : "";
  return `Editorial concept image representing: ${cleanTitle}. ${contextHint ? `Context: ${contextHint}.` : ""}`;
}
