/**
 * Clients pra cada LLM monitorado no AI Visibility Tracker.
 *
 * 4 LLMs: ChatGPT (GPT-4o-mini), Perplexity, Claude (Haiku), Gemini Flash.
 * Modelos baratos pra manter custo viável.
 */

export type LLMProvider = "chatgpt" | "perplexity" | "claude" | "gemini";

export interface LLMResponse {
  text: string;
  cost_usd: number;
  raw?: unknown;
}

export async function queryLLM(provider: LLMProvider, prompt: string): Promise<LLMResponse> {
  switch (provider) {
    case "chatgpt":
      return queryOpenAI(prompt);
    case "perplexity":
      return queryPerplexity(prompt);
    case "claude":
      return queryClaudeHaiku(prompt);
    case "gemini":
      return queryGemini(prompt);
  }
}

// -------- OpenAI (GPT-4o-mini) --------
async function queryOpenAI(prompt: string): Promise<LLMResponse> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();

  const text = json.choices?.[0]?.message?.content ?? "";
  const usage = json.usage ?? {};
  // GPT-4o-mini: $0.15/M input, $0.60/M output
  const cost =
    (usage.prompt_tokens / 1_000_000) * 0.15 + (usage.completion_tokens / 1_000_000) * 0.6;

  return { text, cost_usd: cost, raw: json };
}

// -------- Perplexity --------
async function queryPerplexity(prompt: string): Promise<LLMResponse> {
  if (!process.env.PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY não configurada");

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-small-online",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${await res.text()}`);
  const json = await res.json();

  const text = json.choices?.[0]?.message?.content ?? "";
  // Perplexity sonar-small: ~$0.20/M input, $0.20/M output + $5/1000 requests
  const usage = json.usage ?? {};
  const cost =
    (usage.prompt_tokens / 1_000_000) * 0.2 +
    (usage.completion_tokens / 1_000_000) * 0.2 +
    0.005;

  return { text, cost_usd: cost, raw: json };
}

// -------- Claude Haiku --------
async function queryClaudeHaiku(prompt: string): Promise<LLMResponse> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const json = await res.json();

  const text = json.content?.[0]?.text ?? "";
  // Haiku: $1/M input, $5/M output
  const usage = json.usage ?? {};
  const cost = (usage.input_tokens / 1_000_000) * 1.0 + (usage.output_tokens / 1_000_000) * 5.0;

  return { text, cost_usd: cost, raw: json };
}

// -------- Gemini Flash --------
async function queryGemini(prompt: string): Promise<LLMResponse> {
  if (!process.env.GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY não configurada");

  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 800 },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();

  const text =
    json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";

  // Gemini Flash: ~$0.075/M input, $0.30/M output
  const usage = json.usageMetadata ?? {};
  const cost =
    (usage.promptTokenCount / 1_000_000) * 0.075 +
    (usage.candidatesTokenCount / 1_000_000) * 0.3;

  return { text, cost_usd: cost, raw: json };
}
