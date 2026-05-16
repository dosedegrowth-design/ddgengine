import { describe, it, expect } from "vitest";
import {
  gateSeoScore,
  gateGeoScore,
  gateForbiddenWords,
  gateSize,
  gateStructure,
  gateDisclaimer,
} from "./quality-gates";

const baseInput = {
  siteId: "test-site",
  type: "long_form" as const,
  title: "Como tratar dermatite atópica em cães em São Paulo",
  content: `# Como tratar dermatite

**TL;DR:** Resposta direta.

## Diagnóstico
Texto aqui com 100 palavras aproximadamente sobre o tema.

## Tratamento
Mais detalhes sobre o tratamento e procedimentos.

## Conclusão
Considerações finais aqui.`,
  metaDescription: "Aprenda como tratar dermatite atópica em cães com nossa clínica especializada em São Paulo capital",
};

describe("gateSize", () => {
  it("rejeita texto muito curto pra long_form", () => {
    const r = gateSize({ ...baseInput, content: "Apenas texto curto" });
    expect(r.passed).toBe(false);
  });

  it("aceita texto no range pra long_form", () => {
    const longContent = "Lorem ipsum ".repeat(800); // ~1600 palavras
    const r = gateSize({ ...baseInput, content: longContent });
    expect(r.passed).toBe(true);
  });

  it("aceita FAQ menor", () => {
    const faqContent = "Resposta curta ".repeat(50); // 100 palavras
    const r = gateSize({ ...baseInput, type: "faq_page", content: faqContent });
    expect(r.passed).toBe(false); // ainda curto
  });
});

describe("gateForbiddenWords", () => {
  it("passa quando não tem palavras proibidas", () => {
    const r = gateForbiddenWords({ ...baseInput, forbiddenWords: ["xxx"] });
    expect(r.passed).toBe(true);
  });

  it("falha quando contém palavra proibida", () => {
    const r = gateForbiddenWords({
      ...baseInput,
      content: "Este é um conteúdo com palavra ruim aqui",
      forbiddenWords: ["ruim"],
    });
    expect(r.passed).toBe(false);
  });
});

describe("gateDisclaimer", () => {
  it("passa quando não tem disclaimer obrigatório", () => {
    const r = gateDisclaimer({ ...baseInput });
    expect(r.passed).toBe(true);
  });

  it("passa quando disclaimer está presente", () => {
    const r = gateDisclaimer({
      ...baseInput,
      content: baseInput.content + "\n\nConsulte sempre um veterinário antes de qualquer tratamento.",
      requiredDisclaimers: "Consulte sempre um veterinário",
    });
    expect(r.passed).toBe(true);
  });
});

describe("gateStructure", () => {
  it("retorna score baseado em estrutura", () => {
    const r = gateStructure(baseInput);
    expect(r.score).toBeGreaterThan(0);
    expect(r.metadata?.h2Count).toBeGreaterThanOrEqual(3);
  });
});

describe("gateSeoScore", () => {
  it("calcula score SEO", () => {
    const longerContent = baseInput.content + "\n\n" + "Lorem ipsum dolor sit amet ".repeat(300);
    const r = gateSeoScore({ ...baseInput, content: longerContent });
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("gateGeoScore", () => {
  it("dá pontos extras com FAQ schema", () => {
    const noSchema = gateGeoScore(baseInput);
    const withSchema = gateGeoScore({
      ...baseInput,
      schemaMarkup: [{ "@type": "FAQPage" }] as any,
    });
    expect(withSchema.score).toBeGreaterThan(noSchema.score);
  });
});
