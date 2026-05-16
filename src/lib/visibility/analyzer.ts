/**
 * Análise das respostas dos LLMs — detecta citações da marca,
 * URLs próprias e concorrentes.
 */

export interface AnalyzeInput {
  responseText: string;
  brandName: string;
  brandDomain: string;
  competitorDomains: string[];
}

export interface AnalyzeResult {
  brand_mentioned: boolean;
  url_cited: boolean;
  sentiment: "positive" | "neutral" | "negative";
  position: number | null; // posição em que a marca apareceu (1, 2, 3...)
  competitors_mentioned: string[];
  brand_mentions_count: number;
}

const POSITIVE_WORDS = [
  "recomenda",
  "melhor",
  "ótim",
  "excelente",
  "qualidade",
  "destaque",
  "referência",
  "líder",
  "top",
  "premium",
];
const NEGATIVE_WORDS = [
  "ruim",
  "péssim",
  "evitar",
  "problema",
  "reclamação",
  "fraude",
  "golpe",
  "fugir",
  "caro demais",
];

export function analyzeResponse(input: AnalyzeInput): AnalyzeResult {
  const text = input.responseText.toLowerCase();
  const brandLower = input.brandName.toLowerCase().trim();
  const brandDomainLower = input.brandDomain.toLowerCase().replace(/^www\./, "");

  // Brand mention (nome ou domínio)
  const brandRegex = new RegExp(
    `\\b${escapeRegex(brandLower)}\\b|${escapeRegex(brandDomainLower)}`,
    "g"
  );
  const brandMatches = text.match(brandRegex);
  const brandMentioned = !!brandMatches && brandMatches.length > 0;
  const brandMentionsCount = brandMatches?.length ?? 0;

  // URL cited
  const urlCited = text.includes(brandDomainLower);

  // Competitors mentioned
  const competitorsMentioned = input.competitorDomains.filter((c) => {
    const clean = c.toLowerCase().replace(/^www\./, "").replace(/^https?:\/\//, "").split("/")[0];
    return clean && text.includes(clean);
  });

  // Position: ordem em que a marca aparece vs outras marcas/concorrentes
  let position: number | null = null;
  if (brandMentioned) {
    // Acha primeira ocorrência da marca
    const brandIdx = text.search(brandRegex);
    // Conta quantos concorrentes aparecem ANTES da marca
    let competitorsBefore = 0;
    for (const c of competitorsMentioned) {
      const clean = c.toLowerCase().replace(/^www\./, "").replace(/^https?:\/\//, "").split("/")[0];
      const cIdx = text.indexOf(clean);
      if (cIdx >= 0 && cIdx < brandIdx) competitorsBefore++;
    }
    position = competitorsBefore + 1;
  }

  // Sentiment — janela de 200 chars ao redor da menção
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  if (brandMentioned && brandMatches) {
    const idx = text.search(brandRegex);
    const window = text.slice(Math.max(0, idx - 100), idx + 200);
    const posScore = POSITIVE_WORDS.filter((w) => window.includes(w)).length;
    const negScore = NEGATIVE_WORDS.filter((w) => window.includes(w)).length;
    if (posScore > negScore) sentiment = "positive";
    else if (negScore > posScore) sentiment = "negative";
  }

  return {
    brand_mentioned: brandMentioned,
    url_cited: urlCited,
    sentiment,
    position,
    competitors_mentioned: competitorsMentioned,
    brand_mentions_count: brandMentionsCount,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
