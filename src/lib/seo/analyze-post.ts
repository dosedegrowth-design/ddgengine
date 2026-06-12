/**
 * analyze-post — analisador de SEO/GEO on-page por post (estilo RankMath),
 * mas recalculado AO VIVO sobre o conteúdo atual (funciona em post antigo e
 * reflete edições). Puro/síncrono — sem rede.
 *
 * Produz um relatório com seções (Palavra-chave, SEO técnico, GEO/IA,
 * Estrutura & leitura), cada uma com checks explícitos {label, status,
 * detail} e nota 0-100, mais uma nota geral ponderada.
 *
 * Os limiares espelham os quality-gates de geração (consistência), e
 * adiciona o que os gates não tinham: foco de palavra-chave, alt text de
 * imagem e legibilidade.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** Dica curta de como melhorar (só quando warn/fail). */
  hint?: string;
  /** Peso do check no score da seção. */
  weight: number;
}

export interface SeoSection {
  key: "keyword" | "seo" | "geo" | "structure";
  label: string;
  score: number; // 0-100
  checks: SeoCheck[];
}

export interface PostSeoReport {
  overall: number; // 0-100
  rating: "ruim" | "regular" | "bom" | "excelente";
  sections: SeoSection[];
  focusKeyword: string | null;
  counts: {
    words: number;
    h2: number;
    h3: number;
    links: number;
    images: number;
    readingMinutes: number;
  };
}

export interface AnalyzePostInput {
  type: "long_form" | "faq_page";
  title: string;
  content: string;
  metaDescription?: string | null;
  slug?: string | null;
  schemaMarkup?: unknown[] | null;
  focusKeyword?: string | null;
}

// ---------- helpers ----------

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function statusFromBool(ok: boolean, warn = false): CheckStatus {
  if (ok) return "pass";
  return warn ? "warn" : "fail";
}

function sectionScore(checks: SeoCheck[]): number {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  if (total === 0) return 100;
  const earned = checks.reduce((s, c) => {
    if (c.status === "pass") return s + c.weight;
    if (c.status === "warn") return s + c.weight * 0.5;
    return s;
  }, 0);
  return Math.round((earned / total) * 100);
}

// ---------- análise ----------

export function analyzePost(input: AnalyzePostInput): PostSeoReport {
  const title = input.title ?? "";
  const content = input.content ?? "";
  const meta = input.metaDescription ?? "";
  const slug = input.slug ?? "";
  const schemas = Array.isArray(input.schemaMarkup) ? input.schemaMarkup : [];
  const kw = (input.focusKeyword ?? "").trim();

  const words = content.split(/\s+/).filter(Boolean).length;
  const h2 = (content.match(/^##\s+/gm) ?? []).length;
  const h3 = (content.match(/^###\s+/gm) ?? []).length;
  const links = (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) ?? []).length;
  const imageMatches = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) ?? [];
  const images = imageMatches.length;
  const readingMinutes = Math.max(1, Math.round(words / 200));

  const sections: SeoSection[] = [];

  // ===== SEÇÃO: PALAVRA-CHAVE (foco) =====
  if (kw) {
    const nkw = norm(kw);
    const nTitle = norm(title);
    const nMeta = norm(meta);
    const nSlug = norm(slug.replace(/-/g, " "));
    const firstPara =
      content.split(/\n\n+/).find((p) => p.trim() && !p.trim().startsWith("#")) ?? "";
    const nFirst = norm(firstPara);
    const headings = (content.match(/^#{2,3}\s+(.+)$/gm) ?? []).map((h) => norm(h));
    const nContent = norm(content);

    // densidade
    const occurrences = nContent.split(nkw).length - 1;
    const density = words > 0 ? (occurrences / words) * 100 : 0;

    const checks: SeoCheck[] = [
      {
        id: "kw-title",
        label: "Palavra-chave no título",
        status: statusFromBool(nTitle.includes(nkw)),
        detail: nTitle.includes(nkw) ? "Presente no título" : "Não aparece no título",
        hint: "Inclua a palavra-chave no título, de preferência no começo.",
        weight: 3,
      },
      {
        id: "kw-meta",
        label: "Palavra-chave na meta description",
        status: statusFromBool(nMeta.includes(nkw), true),
        detail: nMeta.includes(nkw) ? "Presente na meta" : "Não aparece na meta",
        hint: "Use a palavra-chave na meta description pra reforçar relevância.",
        weight: 2,
      },
      {
        id: "kw-first",
        label: "Palavra-chave no 1º parágrafo",
        status: statusFromBool(nFirst.includes(nkw)),
        detail: nFirst.includes(nkw) ? "Aparece logo no início" : "Não aparece no início",
        hint: "Cite a palavra-chave nos primeiros 100 caracteres.",
        weight: 3,
      },
      {
        id: "kw-heading",
        label: "Palavra-chave em subtítulo (H2/H3)",
        status: statusFromBool(headings.some((h) => h.includes(nkw)), true),
        detail: headings.some((h) => h.includes(nkw))
          ? "Presente em algum subtítulo"
          : "Nenhum subtítulo usa a palavra-chave",
        hint: "Use a palavra-chave (ou variação) em pelo menos 1 subtítulo.",
        weight: 2,
      },
      {
        id: "kw-slug",
        label: "Palavra-chave na URL (slug)",
        status: statusFromBool(slug ? nSlug.includes(nkw) : false, true),
        detail: slug
          ? nSlug.includes(nkw)
            ? "Presente no slug"
            : "Slug não contém a palavra-chave"
          : "Sem slug ainda",
        hint: "Deixe a palavra-chave no endereço do post.",
        weight: 2,
      },
      {
        id: "kw-density",
        label: "Densidade da palavra-chave",
        status:
          density >= 0.4 && density <= 2.5
            ? "pass"
            : density > 0 && density < 0.4
            ? "warn"
            : density > 2.5
            ? "warn"
            : "fail",
        detail: `${occurrences}× no texto (${density.toFixed(1)}%)`,
        hint:
          density > 2.5
            ? "Densidade alta — evite repetir demais (parece spam)."
            : "Ideal entre 0,5% e 2,5% do texto.",
        weight: 3,
      },
    ];
    sections.push({
      key: "keyword",
      label: "Palavra-chave de foco",
      score: sectionScore(checks),
      checks,
    });
  }

  // ===== SEÇÃO: SEO TÉCNICO =====
  {
    const titleLen = title.length;
    const metaLen = meta.length;
    const longParas = content
      .split(/\n\n+/)
      .filter((p) => p.trim() && !p.startsWith("#"))
      .filter((p) => p.split(/\s+/).length > 100).length;
    const imagesWithoutAlt = imageMatches.filter((m) => {
      const alt = m.match(/!\[([^\]]*)\]/)?.[1] ?? "";
      return alt.trim().length === 0;
    }).length;

    const wordRange =
      input.type === "long_form" ? { min: 1500, max: 3500 } : { min: 400, max: 1000 };

    const checks: SeoCheck[] = [
      {
        id: "title-len",
        label: "Tamanho do título (30-65)",
        status:
          titleLen >= 30 && titleLen <= 65
            ? "pass"
            : titleLen >= 20 && titleLen <= 75
            ? "warn"
            : "fail",
        detail: `${titleLen} caracteres`,
        hint: titleLen > 65 ? "Encurte — o Google corta após ~60." : "Use 30-65 caracteres.",
        weight: 3,
      },
      {
        id: "meta-len",
        label: "Meta description (120-165)",
        status: meta
          ? metaLen >= 120 && metaLen <= 165
            ? "pass"
            : metaLen >= 80 && metaLen <= 185
            ? "warn"
            : "fail"
          : "fail",
        detail: meta ? `${metaLen} caracteres` : "Ausente",
        hint: "Escreva 120-165 caracteres descrevendo o post com a palavra-chave.",
        weight: 3,
      },
      {
        id: "word-count",
        label: "Tamanho do conteúdo",
        status:
          words >= wordRange.min && words <= wordRange.max
            ? "pass"
            : words >= wordRange.min * 0.7
            ? "warn"
            : "fail",
        detail: `${words} palavras`,
        hint: `Ideal ${wordRange.min}-${wordRange.max} palavras pra esse tipo.`,
        weight: 3,
      },
      {
        id: "links",
        label: "Links (internos/externos)",
        status: links >= 2 ? "pass" : links === 1 ? "warn" : "fail",
        detail: `${links} link(s)`,
        hint: "Adicione ao menos 2 links (interno + fonte externa confiável).",
        weight: 2,
      },
      {
        id: "para-len",
        label: "Parágrafos escaneáveis",
        status: longParas === 0 ? "pass" : longParas <= 2 ? "warn" : "fail",
        detail: longParas === 0 ? "Todos curtos" : `${longParas} parágrafo(s) longo(s)`,
        hint: "Quebre parágrafos com mais de ~100 palavras.",
        weight: 2,
      },
      {
        id: "img-alt",
        label: "Imagens com texto alternativo",
        status:
          images === 0
            ? "warn"
            : imagesWithoutAlt === 0
            ? "pass"
            : "warn",
        detail:
          images === 0
            ? "Nenhuma imagem no corpo"
            : imagesWithoutAlt === 0
            ? `${images} imagem(ns), todas com alt`
            : `${imagesWithoutAlt} sem alt text`,
        hint:
          images === 0
            ? "Considere adicionar uma imagem com alt descritivo."
            : "Descreva cada imagem no alt (acessibilidade + SEO).",
        weight: 1,
      },
    ];
    sections.push({
      key: "seo",
      label: "SEO técnico",
      score: sectionScore(checks),
      checks,
    });
  }

  // ===== SEÇÃO: GEO (otimização pra IA) =====
  {
    const hasFaqSchema = schemas.some((s: any) => s?.["@type"] === "FAQPage");
    const hasArticleSchema = schemas.some(
      (s: any) => s?.["@type"] === "Article" || s?.["@type"] === "BlogPosting"
    );
    const qaBlocks =
      (content.match(/^#{2,3}.*\?\s*$/gm) ?? []).length +
      (content.match(/^\*\*Q:\*\*/gm) ?? []).length;
    const numbers = (content.match(/\b\d{2,}(?:[.,]\d+)?(?:%|x)?\b/g) ?? []).length;
    const years = (content.match(/\b(19|20|21)\d{2}\b/g) ?? []).length;
    const dataPoints = numbers + years;
    const lists = (content.match(/^(?:[-*]|\d+\.)\s+/gm) ?? []).length;
    const hasTldr = /\bTL;?DR\b|\*\*Resumo:?\*\*|\*\*Resposta:?\*\*/i.test(content.slice(0, 800));
    const citations = (content.match(/\b(segundo|de acordo com|conforme|fonte:)\b/gi) ?? []).length;

    const checks: SeoCheck[] = [
      {
        id: "tldr",
        label: "Resumo/TL;DR no topo",
        status: statusFromBool(hasTldr),
        detail: hasTldr ? "Tem resposta direta no início" : "Sem resumo no topo",
        hint: "LLMs citam mais quando há resposta direta nas primeiras linhas.",
        weight: 3,
      },
      {
        id: "qa",
        label: "Blocos de pergunta e resposta",
        status: qaBlocks >= 3 ? "pass" : qaBlocks >= 1 ? "warn" : "fail",
        detail: `${qaBlocks} bloco(s) Q&A`,
        hint: "Use subtítulos em forma de pergunta (terminando com ?).",
        weight: 2,
      },
      {
        id: "faq-schema",
        label: "Schema de FAQ (FAQPage)",
        status: statusFromBool(hasFaqSchema, true),
        detail: hasFaqSchema ? "Presente" : "Ausente",
        hint: "FAQ schema aumenta muito a chance de citação em IA.",
        weight: 3,
      },
      {
        id: "article-schema",
        label: "Schema de artigo (Article)",
        status: statusFromBool(hasArticleSchema, true),
        detail: hasArticleSchema ? "Presente" : "Ausente",
        hint: "Marque o post como Article/BlogPosting.",
        weight: 2,
      },
      {
        id: "data",
        label: "Dados concretos (números/datas)",
        status: dataPoints >= 10 ? "pass" : dataPoints >= 4 ? "warn" : "fail",
        detail: `${dataPoints} dado(s)`,
        hint: "Inclua estatísticas, percentuais e datas — IA prioriza fatos.",
        weight: 2,
      },
      {
        id: "lists",
        label: "Listas estruturadas",
        status: lists >= 5 ? "pass" : lists >= 1 ? "warn" : "fail",
        detail: `${lists} item(ns) de lista`,
        hint: "Listas (bullets/numeradas) são fáceis de extrair pra IA.",
        weight: 1,
      },
      {
        id: "citations",
        label: "Citações de fontes",
        status: citations >= 2 ? "pass" : citations === 1 ? "warn" : "fail",
        detail: `${citations} citação(ões)`,
        hint: 'Use "segundo X", "de acordo com Y" pra dar autoridade.',
        weight: 1,
      },
    ];
    sections.push({
      key: "geo",
      label: "GEO — otimização pra IA",
      score: sectionScore(checks),
      checks,
    });
  }

  // ===== SEÇÃO: ESTRUTURA & LEITURA =====
  {
    const hasH1 = /^#\s+/m.test(content);
    const hasConclusion =
      /(##\s+(conclus[aã]o|considera[cç][oõ]es|resumo|finalizando)|\*\*Conclus[aã]o\*\*)/i.test(
        content
      );
    const firstPara = content.split(/\n\n+/).find((p) => p.trim() && !p.trim().startsWith("#"));
    const firstLen = firstPara?.trim().length ?? 0;

    // legibilidade simples: média de palavras por frase
    const sentences = content
      .replace(/[#>*_`[\]()]/g, " ")
      .split(/[.!?]+\s/)
      .map((s) => s.trim())
      .filter((s) => s.split(/\s+/).length > 2);
    const avgSentence = sentences.length
      ? sentences.reduce((s, x) => s + x.split(/\s+/).length, 0) / sentences.length
      : 0;

    const checks: SeoCheck[] = [
      {
        id: "h1",
        label: "Tem título principal (H1)",
        status: statusFromBool(hasH1),
        detail: hasH1 ? "H1 presente" : "Sem H1",
        hint: "O post precisa de 1 título H1.",
        weight: 2,
      },
      {
        id: "h2",
        label: "Pelo menos 3 subtítulos (H2)",
        status: h2 >= 3 ? "pass" : h2 >= 1 ? "warn" : "fail",
        detail: `${h2} H2`,
        hint: "Divida o conteúdo em pelo menos 3 seções.",
        weight: 2,
      },
      {
        id: "conclusion",
        label: "Conclusão clara",
        status: statusFromBool(hasConclusion, true),
        detail: hasConclusion ? "Tem conclusão" : "Sem seção de conclusão",
        hint: "Feche com uma conclusão ou resumo final.",
        weight: 1,
      },
      {
        id: "first-para",
        label: "Introdução no tamanho certo",
        status: firstLen >= 100 && firstLen <= 600 ? "pass" : firstLen > 0 ? "warn" : "fail",
        detail: `${firstLen} caracteres no 1º parágrafo`,
        hint: "Introdução entre 100 e 600 caracteres, respondendo a dúvida.",
        weight: 1,
      },
      {
        id: "readability",
        label: "Frases fáceis de ler",
        status: avgSentence === 0 ? "fail" : avgSentence <= 20 ? "pass" : avgSentence <= 28 ? "warn" : "fail",
        detail: avgSentence ? `~${Math.round(avgSentence)} palavras/frase` : "Sem texto",
        hint: "Frases mais curtas (até ~20 palavras) leem melhor.",
        weight: 2,
      },
    ];
    sections.push({
      key: "structure",
      label: "Estrutura & leitura",
      score: sectionScore(checks),
      checks,
    });
  }

  // ===== nota geral ponderada =====
  const weights: Record<SeoSection["key"], number> = {
    keyword: 0.2,
    seo: 0.3,
    geo: 0.3,
    structure: 0.2,
  };
  // Se não há palavra-chave de foco, redistribui o peso dela.
  const present = sections.map((s) => s.key);
  let wsum = 0;
  let acc = 0;
  for (const s of sections) {
    const w = weights[s.key];
    acc += s.score * w;
    wsum += w;
  }
  void present;
  const overall = wsum > 0 ? Math.round(acc / wsum) : 0;

  const rating: PostSeoReport["rating"] =
    overall >= 85 ? "excelente" : overall >= 70 ? "bom" : overall >= 50 ? "regular" : "ruim";

  return {
    overall,
    rating,
    sections,
    focusKeyword: kw || null,
    counts: { words, h2, h3, links, images, readingMinutes },
  };
}
