/**
 * Wrapper OpenAI Chat Completions — usado como fallback do Claude
 * em tarefas de refine/structured output. Mesma interface do generateWithClaude.
 */
import OpenAI from "openai";

let _client: OpenAI | null = null;

function client() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export const OPENAI_MODEL = "gpt-4o-mini";

export interface OpenAIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface OpenAIGenerateOptions {
  system: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  /** Força output JSON parseável */
  json?: boolean;
}

export interface OpenAIGenerateResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  model: string;
}

// Preços gpt-4o-mini (USD por 1M tokens)
const PRICING = {
  input: 0.15,
  output: 0.6,
} as const;

export async function generateWithOpenAI(
  options: OpenAIGenerateOptions
): Promise<OpenAIGenerateResult> {
  const response = await client().chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: options.max_tokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    messages: [
      { role: "system", content: options.system },
      ...options.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    ...(options.json ? { response_format: { type: "json_object" as const } } : {}),
  });

  const text = response.choices[0]?.message?.content ?? "";
  const usage = response.usage;
  const cost =
    ((usage?.prompt_tokens ?? 0) / 1_000_000) * PRICING.input +
    ((usage?.completion_tokens ?? 0) / 1_000_000) * PRICING.output;

  return {
    text,
    input_tokens: usage?.prompt_tokens ?? 0,
    output_tokens: usage?.completion_tokens ?? 0,
    cost_usd: cost,
    model: OPENAI_MODEL,
  };
}
