/**
 * Wrapper unificado: tenta Claude Sonnet 4.5 → fallback OpenAI GPT-4o-mini.
 *
 * Usado por todas as etapas multi-pass de geração de post. Resiliente a:
 *  - credit balance too low (Anthropic)
 *  - rate limit
 *  - timeout
 *  - JSON inválido (tenta recuperar via parseJsonResponse)
 */
import { generateWithClaude, parseJsonResponse } from "./claude";
import { generateWithOpenAI } from "./openai-chat";

export interface GenerateWithFallbackInput {
  system: string;
  userPrompt: string;
  max_tokens?: number;
  temperature?: number;
  /** Se true, força JSON output no OpenAI (response_format json_object) */
  json?: boolean;
}

export interface GenerateWithFallbackResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  model: string;
  provider: "claude" | "openai";
}

export async function generateWithFallback(
  input: GenerateWithFallbackInput
): Promise<GenerateWithFallbackResult> {
  // 1. Tenta Claude Sonnet 4.5
  try {
    const result = await generateWithClaude({
      system: input.system,
      messages: [{ role: "user", content: input.userPrompt }],
      max_tokens: input.max_tokens,
      temperature: input.temperature,
    });
    return {
      text: result.text,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      cost_usd: result.cost_usd,
      model: result.model,
      provider: "claude",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[generateWithFallback] Claude falhou, tentando OpenAI:", msg);
  }

  // 2. Fallback OpenAI
  const result = await generateWithOpenAI({
    system: input.system,
    messages: [{ role: "user", content: input.userPrompt }],
    max_tokens: input.max_tokens,
    temperature: input.temperature,
    json: input.json,
  });
  return {
    text: result.text,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
    cost_usd: result.cost_usd,
    model: result.model,
    provider: "openai",
  };
}

/**
 * Versão que já parseia o JSON do output (com recuperação de truncado
 * via parseJsonResponse do claude.ts).
 */
export async function generateJsonWithFallback<T>(
  input: GenerateWithFallbackInput
): Promise<{ data: T; meta: Omit<GenerateWithFallbackResult, "text"> }> {
  const result = await generateWithFallback({ ...input, json: true });
  const data = parseJsonResponse<T>(result.text);
  const { text: _text, ...meta } = result;
  return { data, meta };
}

/**
 * Drop-in compatível com generateWithClaude (mesmas opções).
 * Tenta Claude → fallback OpenAI. Retorna no formato esperado por
 * código existente (input_tokens, output_tokens, cost_usd, model, text).
 */
export async function generateLLMWithFallback(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  max_tokens?: number;
  temperature?: number;
  /** Se true, força JSON output no OpenAI */
  json?: boolean;
}): Promise<{
  text: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  cost_usd: number;
  model: string;
}> {
  // Concatena messages em um único userPrompt (multi-turn não é usado
  // hoje no pipeline de post — único user message por pass).
  const userPrompt = opts.messages
    .map((m) => (m.role === "user" ? m.content : ""))
    .filter(Boolean)
    .join("\n\n");

  const result = await generateWithFallback({
    system: opts.system,
    userPrompt,
    max_tokens: opts.max_tokens,
    temperature: opts.temperature,
    json: opts.json,
  });

  return {
    text: result.text,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cost_usd: result.cost_usd,
    model: result.model,
  };
}
