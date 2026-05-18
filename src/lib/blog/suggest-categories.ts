/**
 * Sugere 5 categorias de blog baseado no briefing refinado.
 *
 * Pipeline:
 * 1. Tenta Claude Sonnet 4.5 (preferido)
 * 2. Fallback OpenAI GPT-4o-mini
 * 3. Fallback determinístico (lista por vertical do site)
 */
import { generateWithClaude, parseJsonResponse } from "@/lib/ai/claude";
import { generateWithOpenAI } from "@/lib/ai/openai-chat";
import { slugify } from "@/lib/utils";

export interface SuggestedCategory {
  name: string;
  slug: string;
  description: string;
}

interface RefinedBriefShape {
  identity?: { company_name?: string; description?: string };
  audience?: { ideal_customer?: string; main_pain?: string };
  positioning?: { differentials?: string[]; unique_value?: string };
  seo?: { primary_keywords?: string[]; secondary_keywords?: string[] };
  visibility_goal?: { target_questions?: string[] };
}

const SYSTEM_PROMPT = `Você é estrategista de conteúdo para blogs corporativos brasileiros.

Sua tarefa: propor exatamente 5 categorias de blog que cubram bem o nicho do cliente,
baseado no briefing dele. Cada categoria deve:
- Ter nome curto (1-3 palavras), em PT-BR, sem jargão técnico
- Ser específica o suficiente pra ter posts dedicados (mas não tão estreita que vire 1 post só)
- Ser amigável pra SEO (nome aparece em URLs)
- Cobrir diferentes ângulos: didático, comercial, inspiracional, técnico

Retorne APENAS JSON neste formato exato, sem comentário ou texto extra:
{
  "categories": [
    { "name": "string", "description": "string curta (max 80 chars) explicando o que vai nessa categoria" },
    ...
  ]
}

Não inclua slug — gere apenas name + description. O slug é calculado automaticamente.`;

export async function suggestCategories(brief: RefinedBriefShape): Promise<SuggestedCategory[]> {
  const briefText = formatBriefForPrompt(brief);

  // 1. Tenta Claude
  try {
    const out = await callClaude(briefText);
    if (out.length > 0) return enrichWithSlugs(out);
  } catch (err) {
    console.warn(
      "[suggestCategories] Claude falhou, tentando OpenAI:",
      err instanceof Error ? err.message : String(err)
    );
  }

  // 2. Tenta OpenAI
  try {
    const out = await callOpenAI(briefText);
    if (out.length > 0) return enrichWithSlugs(out);
  } catch (err) {
    console.warn(
      "[suggestCategories] OpenAI falhou, usando fallback:",
      err instanceof Error ? err.message : String(err)
    );
  }

  // 3. Fallback determinístico
  return enrichWithSlugs(buildFallbackCategories(brief));
}

function formatBriefForPrompt(brief: RefinedBriefShape): string {
  const parts: string[] = [];
  if (brief.identity?.company_name) parts.push(`Empresa: ${brief.identity.company_name}`);
  if (brief.identity?.description) parts.push(`O que faz: ${brief.identity.description}`);
  if (brief.audience?.ideal_customer)
    parts.push(`Cliente ideal: ${brief.audience.ideal_customer}`);
  if (brief.audience?.main_pain) parts.push(`Dor principal: ${brief.audience.main_pain}`);
  if (brief.positioning?.differentials?.length)
    parts.push(`Diferenciais: ${brief.positioning.differentials.join("; ")}`);
  if (brief.seo?.primary_keywords?.length)
    parts.push(`Keywords principais: ${brief.seo.primary_keywords.join(", ")}`);
  if (brief.visibility_goal?.target_questions?.length)
    parts.push(`Perguntas-alvo em IA: ${brief.visibility_goal.target_questions.join(" | ")}`);
  return parts.join("\n");
}

async function callClaude(briefText: string): Promise<Array<{ name: string; description: string }>> {
  const result = await generateWithClaude({
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `Briefing:\n\n${briefText}\n\nGere 5 categorias.` },
    ],
    max_tokens: 1500,
    temperature: 0.5,
  });
  const parsed = parseJsonResponse<{ categories: Array<{ name: string; description: string }> }>(
    result.text
  );
  return parsed.categories ?? [];
}

async function callOpenAI(briefText: string): Promise<Array<{ name: string; description: string }>> {
  const result = await generateWithOpenAI({
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `Briefing:\n\n${briefText}\n\nGere 5 categorias.` },
    ],
    max_tokens: 1500,
    temperature: 0.5,
    json: true,
  });
  const parsed = JSON.parse(result.text) as {
    categories: Array<{ name: string; description: string }>;
  };
  return parsed.categories ?? [];
}

function buildFallbackCategories(brief: RefinedBriefShape): Array<{ name: string; description: string }> {
  // Categorias genéricas pra qualquer nicho — última linha de defesa
  return [
    {
      name: "Guias e Tutoriais",
      description: "Conteúdo didático passo-a-passo pra resolver dúvidas comuns.",
    },
    {
      name: "Casos e Histórias",
      description: "Cases reais de clientes e bastidores do trabalho.",
    },
    {
      name: "Tendências",
      description: "O que está mudando no setor e como se posicionar.",
    },
    {
      name: "Dicas Práticas",
      description: brief.audience?.ideal_customer
        ? `Aplicações práticas pra ${brief.audience.ideal_customer.toLowerCase()}.`
        : "Aplicações práticas pra implementar hoje mesmo.",
    },
    {
      name: "Sobre nós",
      description: "Equipe, processo, diferenciais e bastidores da marca.",
    },
  ];
}

function enrichWithSlugs(
  items: Array<{ name: string; description: string }>
): SuggestedCategory[] {
  const seen = new Set<string>();
  return items.slice(0, 5).map((c) => {
    let slug = slugify(c.name) || "categoria";
    // Garante slug único dentro do conjunto
    let suffix = 2;
    const base = slug;
    while (seen.has(slug)) {
      slug = `${base}-${suffix++}`;
    }
    seen.add(slug);
    return { name: c.name.trim(), slug, description: c.description?.trim() ?? "" };
  });
}
