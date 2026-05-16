/**
 * Wrapper do Anthropic Claude API com prompt caching.
 */
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function client() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const CLAUDE_MODEL = "claude-sonnet-4-5";

export interface GenerateOptions {
  system: string | Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  max_tokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  cost_usd: number;
  model: string;
}

// Preços Sonnet 4.5 (2026) por 1M tokens
const PRICING = {
  input: 3.0,
  output: 15.0,
  cache_creation: 3.75, // 1.25x do input
  cache_read: 0.3, // 0.1x do input
} as const;

export async function generateWithClaude(
  options: GenerateOptions
): Promise<GenerateResult> {
  const system =
    typeof options.system === "string"
      ? [
          {
            type: "text" as const,
            text: options.system,
            cache_control: { type: "ephemeral" as const },
          },
        ]
      : options.system;

  const response = await client().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: options.max_tokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    system,
    messages: options.messages,
  });

  const textBlock = response.content.find((c) => c.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text : "";

  const usage = response.usage;
  const cost =
    (usage.input_tokens / 1_000_000) * PRICING.input +
    (usage.output_tokens / 1_000_000) * PRICING.output +
    ((usage as any).cache_creation_input_tokens ?? 0) / 1_000_000 * PRICING.cache_creation +
    ((usage as any).cache_read_input_tokens ?? 0) / 1_000_000 * PRICING.cache_read;

  return {
    text,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_input_tokens: (usage as any).cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: (usage as any).cache_read_input_tokens ?? 0,
    cost_usd: cost,
    model: CLAUDE_MODEL,
  };
}

/**
 * Extrai JSON do output do Claude (lida com code fences).
 */
export function parseJsonResponse<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Acha primeiro { ou [
  const firstBrace = Math.min(
    ...["{", "["]
      .map((c) => cleaned.indexOf(c))
      .filter((i) => i >= 0)
  );
  if (firstBrace === Infinity) {
    throw new Error(`Resposta sem JSON: ${cleaned.slice(0, 200)}`);
  }

  const candidate = cleaned.slice(firstBrace);
  return JSON.parse(candidate);
}
