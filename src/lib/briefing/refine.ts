/**
 * Refine — usa Claude pra organizar respostas brutas do briefing
 * em formato estruturado (RefinedBrief).
 *
 * Princípios:
 * - Mantém as palavras do empresário (não inventa)
 * - Só limpa gramática + estrutura em seções
 * - Se faltar info, deixa string vazia ou array vazio (não inventa)
 * - Output sempre JSON válido tipado
 */
import { generateWithClaude, CLAUDE_MODEL } from "@/lib/ai/claude";
import { generateWithOpenAI } from "@/lib/ai/openai-chat";
import { QUESTIONS_BY_ID, type RawAnswers, type RefinedBrief } from "./questions";

const SYSTEM_PROMPT = `Você é um editor sênior brasileiro especializado em organizar briefings de marca pra alimentar uma engine de SEO + IA Visibility.

Você recebe respostas BRUTAS do empresário (pode estar bagunçado, com erros de digitação, fragmentos de áudio transcrito, repetições). Sua tarefa:

1. ORGANIZAR em formato JSON tipado (schema RefinedBrief)
2. MANTER as palavras do empresário sempre que possível
3. LIMPAR só gramática óbvia, pontuação, capitalização
4. ESTRUTURAR em seções claras
5. NÃO INVENTAR — se faltar info, retorna string vazia "" ou array vazio []
6. NÃO ADICIONAR opiniões ou recomendações próprias
7. Português brasileiro, tom natural, sem corporativês

OUTPUT obrigatório: JSON válido com este schema exato:

{
  "identity": {
    "company_name": "string",
    "description": "string (1-2 frases limpas do que faz)",
    "elevator_pitch": "string (3-4 frases expandindo description, ainda com palavras do empresário)"
  },
  "audience": {
    "ideal_customer": "string (descrição limpa)",
    "demographics": "string ou ''",
    "main_pain": "string (frase única da maior dor resolvida)"
  },
  "positioning": {
    "differentials": ["string", "string", "string"],
    "unique_value": "string (síntese do que faz a marca especial)"
  },
  "voice": {
    "tone": "string (síntese do tom — ex: 'casual e descontraída, didática')",
    "style_notes": "string (instruções específicas de escrita)",
    "expressions_to_use": ["string"] ou [],
    "expressions_to_avoid": ["string"] ou []
  },
  "seo": {
    "primary_keywords": ["string"],
    "secondary_keywords": ["string"]
  },
  "visibility_goal": {
    "target_questions": ["string (pergunta exata que o cliente faria em LLM)"]
  },
  "market": {
    "competitors": ["string"]
  },
  "storytelling": {
    "case_summaries": ["string (resumo curto do case, com palavras do empresário)"]
  },
  "migration": {
    "existing_urls": ["string"]
  }
}

Retorne APENAS o JSON, sem markdown, sem comentários.`;

export async function refineBriefing(raw: RawAnswers): Promise<RefinedBrief> {
  // Encadeamento de providers:
  //   1) Claude Sonnet 4.5 (preferido — entrega melhor refino)
  //   2) GPT-4o-mini (fallback se Claude sem créditos / timeout / JSON inválido)
  //   3) buildFallbackBrief() — mapeamento determinístico sem IA
  // O user edita tudo na tela de Revisão, nada se perde.
  const input = buildInputBlock(raw);

  // Tentativa 1 — Claude
  try {
    return await refineWithClaude(input);
  } catch (err) {
    console.warn(
      "[refineBriefing] Claude falhou, tentando OpenAI:",
      err instanceof Error ? err.message : String(err)
    );
  }

  // Tentativa 2 — OpenAI
  try {
    return await refineWithOpenAI(input);
  } catch (err) {
    console.warn(
      "[refineBriefing] OpenAI falhou, usando fallback determinístico:",
      err instanceof Error ? err.message : String(err)
    );
  }

  // Tentativa 3 — determinístico
  return buildFallbackBrief(raw);
}

function buildInputBlock(raw: RawAnswers): string {
  return Object.entries(raw)
    .filter(([_, ans]) => ans?.value)
    .map(([qid, ans]) => {
      const q = QUESTIONS_BY_ID[qid];
      const label = q?.label ?? qid;
      const sourceTag =
        ans.source === "audio"
          ? " [áudio transcrito]"
          : ans.source === "mixed"
          ? " [texto + áudio]"
          : "";
      return `### ${label}${sourceTag}\n${ans.value.trim()}`;
    })
    .join("\n\n");
}

async function refineWithClaude(input: string): Promise<RefinedBrief> {
  const result = await generateWithClaude({
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Aqui estão as respostas brutas do briefing. Organize no schema RefinedBrief:\n\n${input}`,
      },
    ],
    max_tokens: 4000,
    temperature: 0.3,
  });

  const cleaned = result.text
    .trim()
    .replace(/^```json\s*/, "")
    .replace(/```$/, "");
  return JSON.parse(cleaned) as RefinedBrief;
}

async function refineWithOpenAI(input: string): Promise<RefinedBrief> {
  const result = await generateWithOpenAI({
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Aqui estão as respostas brutas do briefing. Organize no schema RefinedBrief:\n\n${input}`,
      },
    ],
    max_tokens: 4000,
    temperature: 0.3,
    json: true, // força response_format: json_object
  });

  return JSON.parse(result.text) as RefinedBrief;
}

/**
 * Fallback determinístico — mapeia raw_answers → RefinedBrief sem IA.
 * Usado quando Claude tá indisponível. Empresário edita tudo na revisão.
 */
function buildFallbackBrief(raw: RawAnswers): RefinedBrief {
  const v = (id: string): string => raw[id]?.value?.trim() ?? "";
  const list = (id: string): string[] =>
    v(id)
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

  // Tone of voice pode ser multichoice (CSV) ou texto livre
  const toneRaw = v("tone_of_voice");
  const toneMap: Record<string, string> = {
    formal: "Formal e técnica",
    casual: "Casual e descontraída",
    premium: "Premium e sofisticada",
    didatica: "Didática e explicativa",
    irreverente: "Irreverente e direta",
    consultiva: "Consultiva e profissional",
  };
  const toneLabel =
    toneRaw
      .split(",")
      .map((t) => toneMap[t.trim()] ?? t.trim())
      .filter(Boolean)
      .join(" · ") || toneRaw;

  return {
    identity: {
      company_name: v("company_name"),
      description: v("what_we_do"),
      elevator_pitch: v("what_we_do"),
    },
    audience: {
      ideal_customer: v("ideal_customer"),
      demographics: "",
      main_pain: v("main_pain"),
    },
    positioning: {
      differentials: list("differentials"),
      unique_value: v("differentials").split("\n")[0]?.trim() ?? "",
    },
    voice: {
      tone: toneLabel,
      style_notes: v("unique_voice"),
      expressions_to_use: [],
      expressions_to_avoid: [],
    },
    seo: {
      primary_keywords: list("target_keywords").slice(0, 8),
      secondary_keywords: list("target_keywords").slice(8),
    },
    visibility_goal: {
      target_questions: list("ai_visibility_goal"),
    },
    market: {
      competitors: list("competitors"),
    },
    storytelling: {
      case_summaries: v("client_case") ? [v("client_case")] : [],
    },
    migration: {
      existing_urls: list("existing_content"),
    },
  };
}

export { CLAUDE_MODEL };
