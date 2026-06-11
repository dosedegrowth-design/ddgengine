/**
 * 8 Quality Gates — verificações automáticas antes de publicar.
 *
 * Cada gate retorna { passed, score, details }.
 * Se algum falhar, o pipeline pode regenerar o passe relevante (até 3x).
 */
import { embed } from "./embeddings";
import { retrieveBrandContext } from "@/lib/rag/brand";

export interface GateResult {
  passed: boolean;
  score: number;
  threshold: number;
  details: string;
  metadata?: Record<string, unknown>;
}

export interface QualityGateInput {
  siteId: string;
  type: "long_form" | "faq_page";
  title: string;
  content: string;
  metaDescription?: string;
  schemaMarkup?: unknown[];
  forbiddenWords?: string[];
  requiredDisclaimers?: string | null;
}

// ============ GATE 1: PLAGIO ============
// Embedding similarity vs corpus público.
// MVP: comparar com posts próprios já publicados (não plagiar a si mesmo).
export async function gatePlagiarism(input: QualityGateInput): Promise<GateResult> {
  try {
    const queryEmbedding = await embed(input.title + "\n\n" + input.content.slice(0, 2000));

    // Recupera trechos similares do próprio site
    const similar = await retrieveBrandContext(input.siteId, input.title, 3);
    const maxSimilarity = similar.length ? Math.max(...similar.map((s) => s.similarity)) : 0;

    const threshold = 0.92; // > 92% similaridade = provavelmente cópia
    return {
      passed: maxSimilarity < threshold,
      score: maxSimilarity,
      threshold,
      details:
        maxSimilarity >= threshold
          ? `Conteúdo muito similar (${(maxSimilarity * 100).toFixed(1)}%) a outro post já publicado`
          : `Similaridade aceitável (${(maxSimilarity * 100).toFixed(1)}%)`,
      metadata: { embedding_compared: queryEmbedding.length },
    };
  } catch (err) {
    return {
      passed: true, // fail-open (não bloqueia se API falhar)
      score: 0,
      threshold: 0.92,
      details: `Erro ao verificar plágio: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

// ============ GATE 2: BRAND VOICE ============
// Cosine similarity com brand_documents do briefing.
export async function gateBrandVoice(input: QualityGateInput): Promise<GateResult> {
  try {
    const sample = input.content.slice(0, 3000);
    const brandChunks = await retrieveBrandContext(input.siteId, sample, 5);

    if (brandChunks.length === 0) {
      return {
        passed: true,
        score: 0,
        threshold: 0.5,
        details: "Sem brand context configurado (passa por default)",
      };
    }

    const avgSimilarity = brandChunks.reduce((s, c) => s + c.similarity, 0) / brandChunks.length;
    const threshold = 0.5; // Cosine > 0.5 = razoavelmente alinhado
    return {
      passed: avgSimilarity >= threshold,
      score: avgSimilarity,
      threshold,
      details:
        avgSimilarity >= threshold
          ? `Voz da marca preservada (${(avgSimilarity * 100).toFixed(1)}%)`
          : `Voz da marca fora do padrão (${(avgSimilarity * 100).toFixed(1)}%)`,
    };
  } catch (err) {
    return {
      passed: true,
      score: 0,
      threshold: 0.5,
      details: `Erro: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

// ============ GATE 3: SEO SCORE ============
// Verifica estrutura técnica do conteúdo.
export function gateSeoScore(input: QualityGateInput): GateResult {
  let score = 0;
  const issues: string[] = [];
  const wins: string[] = [];

  // Defensive: campos opcionais/falhos não devem crashar todo o gate
  const title = input.title ?? "";
  const content = input.content ?? "";

  // Title length
  const titleLen = title.length;
  if (titleLen >= 30 && titleLen <= 65) {
    score += 15;
    wins.push("Title length OK");
  } else {
    issues.push(`Title ${titleLen} chars (ideal 30-65)`);
  }

  // Meta description
  if (input.metaDescription) {
    const ml = input.metaDescription.length;
    if (ml >= 120 && ml <= 165) {
      score += 15;
      wins.push("Meta description OK");
    } else {
      issues.push(`Meta description ${ml} chars (ideal 120-165)`);
    }
  } else {
    issues.push("Meta description ausente");
  }

  // Headings (H2/H3 count)
  const h2Count = (content.match(/^##\s+/gm) ?? []).length;
  const h3Count = (content.match(/^###\s+/gm) ?? []).length;
  if (h2Count >= 3) {
    score += 15;
    wins.push(`${h2Count} H2 sections`);
  } else {
    issues.push(`Apenas ${h2Count} H2 (mínimo 3)`);
  }
  if (h3Count > 0) score += 5;

  // Word count
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (input.type === "long_form") {
    if (wordCount >= 1500 && wordCount <= 3500) {
      score += 20;
      wins.push(`${wordCount} palavras`);
    } else {
      issues.push(`${wordCount} palavras (long-form ideal 1500-3500)`);
    }
  } else {
    if (wordCount >= 400 && wordCount <= 1000) {
      score += 20;
      wins.push(`${wordCount} palavras`);
    } else {
      issues.push(`${wordCount} palavras (FAQ ideal 400-1000)`);
    }
  }

  // Links (interno e externo)
  const linkCount = (input.content.match(/\[([^\]]+)\]\(([^)]+)\)/g) ?? []).length;
  if (linkCount >= 2) {
    score += 10;
    wins.push(`${linkCount} links`);
  } else {
    issues.push("Poucos links (ideal 2+)");
  }

  // Paragraph length
  const paragraphs = input.content.split(/\n\n+/).filter((p) => p.trim() && !p.startsWith("#"));
  const longParas = paragraphs.filter((p) => p.split(/\s+/).length > 100).length;
  if (longParas / Math.max(1, paragraphs.length) < 0.2) {
    score += 10;
    wins.push("Parágrafos bem dimensionados");
  } else {
    issues.push(`${longParas} parágrafos longos demais`);
  }

  // Title contains primary keyword (se houver)
  // Heurística simples: primeira palavra do título
  const titleWords = input.title.toLowerCase().split(/\s+/);
  if (titleWords.length >= 4) {
    score += 10;
    wins.push("Title descritivo");
  }

  const threshold = 70;
  return {
    passed: score >= threshold,
    score,
    threshold,
    details: score >= threshold ? `SEO ${score}/100: ${wins.join(", ")}` : `SEO ${score}/100. Issues: ${issues.join(", ")}`,
    metadata: { issues, wins, wordCount, h2Count, h3Count, linkCount },
  };
}

// ============ GATE 4: GEO SCORE ============
// Sinais GEO: schema, FAQ structure, data points, Q&A blocks.
export function gateGeoScore(input: QualityGateInput): GateResult {
  let score = 0;
  const wins: string[] = [];
  const issues: string[] = [];

  // FAQ Schema presente?
  const schemas = input.schemaMarkup ?? [];
  const hasFaqSchema = Array.isArray(schemas) && schemas.some((s: any) => s["@type"] === "FAQPage");
  const hasArticleSchema = Array.isArray(schemas) && schemas.some((s: any) =>
    s["@type"] === "Article" || s["@type"] === "BlogPosting"
  );

  if (hasArticleSchema) {
    score += 15;
    wins.push("Article schema");
  } else {
    issues.push("Sem Article schema");
  }

  if (hasFaqSchema) {
    score += 25; // +41% citação em IA com FAQ schema
    wins.push("FAQ schema");
  } else if (input.type === "faq_page") {
    issues.push("FAQ page sem FAQ schema");
  }

  // Q&A blocks no conteúdo (markdown headings com ? OU "Q:"/"A:")
  const qaBlocks =
    (input.content.match(/^#{2,3}.*\?\s*$/gm) ?? []).length +
    (input.content.match(/^\*\*Q:\*\*/gm) ?? []).length;
  if (qaBlocks >= 3) {
    score += 15;
    wins.push(`${qaBlocks} Q&A blocks`);
  } else {
    issues.push(`Apenas ${qaBlocks} Q&A blocks (ideal 3+)`);
  }

  // Data richness — números/estatísticas/datas
  const numbers = (input.content.match(/\b\d{2,}(?:[.,]\d+)?(?:%|x)?\b/g) ?? []).length;
  const years = (input.content.match(/\b(19|20|21)\d{2}\b/g) ?? []).length;
  const dataPoints = numbers + years;
  if (dataPoints >= 10) {
    score += 15;
    wins.push(`${dataPoints} data points`);
  } else {
    issues.push(`${dataPoints} data points (ideal 10+)`);
  }

  // Listas (bullet ou numerada)
  const lists = (input.content.match(/^(?:[-*]|\d+\.)\s+/gm) ?? []).length;
  if (lists >= 5) {
    score += 10;
    wins.push("Boa estrutura de listas");
  }

  // TL;DR / Summary no topo (LLMs amam)
  const hasTldr = /\bTL;?DR\b|\*\*Resumo:?\*\*|\*\*Resposta:?\*\*/i.test(input.content.slice(0, 800));
  if (hasTldr) {
    score += 10;
    wins.push("TL;DR no topo");
  } else {
    issues.push("Sem TL;DR (ideal pra LLMs)");
  }

  // Citações de fontes
  const citations = (input.content.match(/\b(segundo|de acordo com|conforme|fonte:)\b/gi) ?? []).length;
  if (citations >= 2) {
    score += 10;
    wins.push(`${citations} citações de fonte`);
  }

  const threshold = 70;
  return {
    passed: score >= threshold,
    score,
    threshold,
    details:
      score >= threshold
        ? `GEO ${score}/100: ${wins.join(", ")}`
        : `GEO ${score}/100. Issues: ${issues.join(", ")}`,
    metadata: { wins, issues, dataPoints, qaBlocks, hasFaqSchema },
  };
}

// ============ GATE 5: DISCLAIMER ============
export function gateDisclaimer(input: QualityGateInput): GateResult {
  if (!input.requiredDisclaimers) {
    return {
      passed: true,
      score: 1,
      threshold: 1,
      details: "Sem disclaimer obrigatório configurado",
    };
  }

  // Pega palavras-chave do disclaimer (primeiras 3 palavras significativas)
  const keywords = input.requiredDisclaimers
    .toLowerCase()
    .split(/[\s,.;:]+/)
    .filter((w) => w.length > 4)
    .slice(0, 3);

  const contentLower = input.content.toLowerCase();
  const present = keywords.every((k) => contentLower.includes(k));

  return {
    passed: present,
    score: present ? 1 : 0,
    threshold: 1,
    details: present ? "Disclaimer presente" : `Disclaimer obrigatório ausente: "${input.requiredDisclaimers}"`,
  };
}

// ============ GATE 6: FORBIDDEN WORDS ============
export function gateForbiddenWords(input: QualityGateInput): GateResult {
  if (!input.forbiddenWords?.length) {
    return { passed: true, score: 0, threshold: 0, details: "Sem palavras proibidas" };
  }

  const contentLower = input.content.toLowerCase();
  const found = input.forbiddenWords.filter((w) => {
    const re = new RegExp(`\\b${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    return re.test(contentLower);
  });

  return {
    passed: found.length === 0,
    score: found.length,
    threshold: 0,
    details: found.length === 0 ? "Nenhuma palavra proibida usada" : `Palavras proibidas encontradas: ${found.join(", ")}`,
    metadata: { forbidden_found: found },
  };
}

// ============ GATE 7: SIZE ============
export function gateSize(input: QualityGateInput): GateResult {
  const words = input.content.split(/\s+/).filter(Boolean).length;
  const ranges = {
    long_form: { min: 1500, max: 3500 },
    faq_page: { min: 400, max: 1000 },
  };
  const r = ranges[input.type];
  const passed = words >= r.min && words <= r.max;

  return {
    passed,
    score: words,
    threshold: r.min,
    details: passed
      ? `${words} palavras (range ${r.min}-${r.max})`
      : `${words} palavras fora do range ${r.min}-${r.max}`,
    metadata: { min: r.min, max: r.max },
  };
}

// ============ GATE 8: STRUCTURE ============
export function gateStructure(input: QualityGateInput): GateResult {
  let score = 0;
  const issues: string[] = [];

  const hasH1 = /^#\s+/m.test(input.content);
  if (hasH1) score += 25;
  else issues.push("Sem H1");

  const h2Count = (input.content.match(/^##\s+/gm) ?? []).length;
  if (h2Count >= 3) score += 25;
  else issues.push(`Apenas ${h2Count} H2 (mínimo 3)`);

  // Conclusão presente
  const hasConclusion = /(##\s+(conclus[aã]o|considera[cç][oõ]es|resumo|finalizando)|\*\*Conclus[aã]o\*\*)/i.test(
    input.content
  );
  if (hasConclusion) score += 25;
  else issues.push("Sem conclusão clara");

  // Primeira frase responde a query (heurística: primeiro parágrafo de até 300 chars)
  const firstPara = input.content
    .split(/\n\n+/)
    .find((p) => p.trim() && !p.trim().startsWith("#"));
  const firstParaLen = firstPara?.trim().length ?? 0;
  if (firstParaLen >= 100 && firstParaLen <= 600) score += 25;
  else issues.push("Primeiro parágrafo fora do tamanho ideal (100-600 chars)");

  const threshold = 75;
  return {
    passed: score >= threshold,
    score,
    threshold,
    details: score >= threshold ? `Estrutura OK (${score}/100)` : `Estrutura ${score}/100: ${issues.join(", ")}`,
    metadata: { hasH1, h2Count, hasConclusion },
  };
}

// ============ RUN ALL GATES ============
export interface AllGatesResult {
  passed: boolean;
  passedCount: number;
  totalGates: number;
  results: Record<string, GateResult>;
}

export async function runAllGates(input: QualityGateInput): Promise<AllGatesResult> {
  // Defensive: garante que campos string nunca sejam undefined/null antes de
  // chegar nos gates (que fazem .match/.split/.toLowerCase direto). Se algum
  // pass anterior deixou um campo vazio, gates registram score baixo mas
  // não crasham o pipeline inteiro.
  const safeInput: QualityGateInput = {
    ...input,
    title: input.title ?? "",
    content: input.content ?? "",
    metaDescription: input.metaDescription ?? "",
    schemaMarkup: input.schemaMarkup ?? undefined,
  };

  const [plagiarism, brandVoice] = await Promise.all([
    gatePlagiarism(safeInput),
    gateBrandVoice(safeInput),
  ]);

  const seo = gateSeoScore(safeInput);
  const geo = gateGeoScore(safeInput);
  const disclaimer = gateDisclaimer(safeInput);
  const forbidden = gateForbiddenWords(safeInput);
  const size = gateSize(safeInput);
  const structure = gateStructure(safeInput);

  const results = {
    plagiarism,
    brand_voice: brandVoice,
    seo,
    geo,
    disclaimer,
    forbidden_words: forbidden,
    size,
    structure,
  };

  const values = Object.values(results);
  const passedCount = values.filter((r) => r.passed).length;
  // Permite até 1 gate "soft" (não crítico) falhar
  const criticalGates = ["disclaimer", "forbidden_words", "size", "structure"];
  const criticalsPassed = criticalGates.every((k) => results[k as keyof typeof results].passed);
  const passed = criticalsPassed && passedCount >= values.length - 2;

  return {
    passed,
    passedCount,
    totalGates: values.length,
    results,
  };
}
