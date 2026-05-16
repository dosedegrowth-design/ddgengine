/**
 * Geração de prompts representativos do nicho do cliente.
 *
 * Usa o briefing (serviços, região, FAQs, keywords) pra criar
 * variações de perguntas que clientes potenciais fariam pra IA.
 */
import { generateWithClaude, parseJsonResponse } from "@/lib/ai/claude";

export interface PromptsInput {
  business_description: string | null;
  services: any[] | null;
  region: string | null;
  competitors: any[] | null;
  faq_questions: any[] | null;
  target_keywords: string[] | null;
  prompt_count: number;
}

export async function generateVisibilityPrompts(input: PromptsInput): Promise<string[]> {
  const services = (input.services ?? [])
    .map((s) => (typeof s === "string" ? s : s?.name ?? ""))
    .filter(Boolean)
    .join(", ");
  const competitors = (input.competitors ?? [])
    .map((c) => (typeof c === "string" ? c : c?.url ?? ""))
    .filter(Boolean)
    .join(", ");
  const faqs = (input.faq_questions ?? [])
    .map((q) => (typeof q === "string" ? q : q?.question ?? ""))
    .filter(Boolean);
  const keywords = input.target_keywords ?? [];

  const system = `Você gera prompts representativos que um consumidor brasileiro perguntaria pra ChatGPT/Perplexity sobre um setor específico.

REGRAS:
- Português brasileiro natural
- Variar entre: perguntas de comparação ("qual o melhor X em Y"), recomendação ("indica X em Y"), informação ("como funciona X"), preço ("quanto custa X"), local ("X perto de mim")
- 70% prompts incluem nome da região (se relevante pro setor)
- 30% prompts são genéricos do setor
- Tom natural, como pessoa real conversa com IA, não busca Google
- NÃO inclua o nome da empresa do cliente nos prompts

OUTPUT JSON: array de strings.
{"prompts": ["...", "...", ...]}`;

  const user = `Negócio: ${input.business_description ?? "n/a"}
Serviços: ${services || "n/a"}
Região: ${input.region ?? "Brasil"}
Concorrentes (não citar): ${competitors || "n/a"}
Keywords alvo: ${keywords.join(", ") || "n/a"}
FAQs reais dos clientes: ${faqs.slice(0, 5).join(" | ") || "n/a"}

Gere ${input.prompt_count} prompts variados.`;

  const result = await generateWithClaude({
    system,
    messages: [{ role: "user", content: user }],
    max_tokens: 3000,
    temperature: 0.9,
  });

  const parsed = parseJsonResponse<{ prompts: string[] }>(result.text);
  return (parsed.prompts ?? []).slice(0, input.prompt_count);
}
