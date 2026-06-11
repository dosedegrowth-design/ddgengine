/**
 * Wrapper do Anthropic Claude API com prompt caching.
 */
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";

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
 * Extrai JSON do output do Claude (lida com code fences + prosa em volta).
 *
 * Robusto a 3 problemas comuns de LLM:
 *  1. Prosa antes/depois do JSON (ex: título "[Guia 2024]" antes do objeto)
 *     → extrai do primeiro `{` ao último `}` (objeto) ou `[`..`]` (array).
 *  2. Aspas/newlines não-escapados dentro de strings → jsonrepair.
 *  3. JSON truncado por max_tokens → parseJsonWithRecovery.
 */
export function parseJsonResponse<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Monta candidatos de extração. Objeto primeiro (nossos prompts retornam
  // objetos), depois array. "primeiro { ao último }" descarta prosa em volta
  // (inclusive títulos com [colchetes] que confundiam a extração antiga).
  const candidates: string[] = [];
  const firstCurly = cleaned.indexOf("{");
  const lastCurly = cleaned.lastIndexOf("}");
  if (firstCurly >= 0 && lastCurly > firstCurly) {
    candidates.push(cleaned.slice(firstCurly, lastCurly + 1));
  }
  const firstSq = cleaned.indexOf("[");
  const lastSq = cleaned.lastIndexOf("]");
  if (firstSq >= 0 && lastSq > firstSq) {
    candidates.push(cleaned.slice(firstSq, lastSq + 1));
  }

  // Candidato "aberto" pra recuperação de truncamento (JSON cortado no meio,
  // sem fechamento). Pega do primeiro `{` (ou `[`) até o fim.
  const openStart =
    firstCurly >= 0
      ? firstCurly
      : firstSq >= 0
        ? firstSq
        : -1;
  if (openStart === -1) {
    throw new Error(`Resposta sem JSON: ${cleaned.slice(0, 200)}`);
  }
  const openCandidate = cleaned.slice(openStart);

  let lastErr: unknown = null;
  for (const candidate of candidates) {
    // 1. parse direto
    try {
      return JSON.parse(candidate) as T;
    } catch (err) {
      lastErr = err;
    }
    // 2. jsonrepair (aspas/newlines/vírgulas)
    try {
      return JSON.parse(jsonrepair(candidate)) as T;
    } catch (err) {
      lastErr = err;
    }
  }

  // 3. jsonrepair no candidato aberto (cobre truncamento simples)
  try {
    return JSON.parse(jsonrepair(openCandidate)) as T;
  } catch (err) {
    lastErr = err;
  }

  // 4. recuperação de truncamento manual (balanceia chaves/strings)
  return parseJsonWithRecovery<T>(openCandidate, lastErr);
}

/**
 * Recupera JSON truncado fechando strings e objetos pendentes.
 * Útil quando o LLM atinge max_tokens no meio do output.
 */
function parseJsonWithRecovery<T>(raw: string, originalErr: unknown): T {
  let s = raw;

  // Remove trailing garbage não-JSON (linha incompleta no final)
  // Encontra última `,` ou `}` que pode ser limite seguro
  // Estratégia 1: balanceia { } e [ ] adicionando fechamento
  let inString = false;
  let escape = false;
  const stack: Array<"{" | "["> = [];

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") stack.pop();
  }

  // Se está dentro de string: fecha aspas + remove campo incompleto
  if (inString) {
    // Encontra última vírgula fora de string pra cortar campo incompleto
    let lastCommaIdx = -1;
    inString = false;
    escape = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\" && inString) {
        escape = true;
        continue;
      }
      if (c === '"') inString = !inString;
      else if (!inString && c === ",") lastCommaIdx = i;
    }
    if (lastCommaIdx > 0) {
      s = s.slice(0, lastCommaIdx);
    } else {
      s = s + '"'; // se nem vírgula tem, tenta só fechar a string
    }
  }

  // Re-conta stack após truncar
  const stack2: Array<"{" | "["> = [];
  inString = false;
  escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{" || c === "[") stack2.push(c);
    else if (c === "}" || c === "]") stack2.pop();
  }

  // Fecha chaves/colchetes pendentes
  while (stack2.length > 0) {
    const open = stack2.pop();
    s += open === "{" ? "}" : "]";
  }

  try {
    return JSON.parse(s);
  } catch {
    // Não recuperou — propaga o erro original com contexto
    const msg = originalErr instanceof Error ? originalErr.message : String(originalErr);
    throw new Error(
      `JSON inválido do LLM (não foi possível recuperar): ${msg}. ` +
        `Provavelmente max_tokens muito baixo pro tamanho do post.`
    );
  }
}
