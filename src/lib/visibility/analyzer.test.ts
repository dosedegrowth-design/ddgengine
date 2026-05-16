import { describe, it, expect } from "vitest";
import { analyzeResponse } from "./analyzer";

describe("analyzeResponse", () => {
  const baseInput = {
    brandName: "PetDerma",
    brandDomain: "petderma.com.br",
    competitorDomains: ["vet1.com.br", "vet2.com.br"],
  };

  it("detecta menção da marca por nome", () => {
    const result = analyzeResponse({
      ...baseInput,
      responseText: "Recomendo PetDerma pra dermatite",
    });
    expect(result.brand_mentioned).toBe(true);
    expect(result.brand_mentions_count).toBe(1);
  });

  it("detecta menção da marca por domínio", () => {
    const result = analyzeResponse({
      ...baseInput,
      responseText: "Visite petderma.com.br pra mais info",
    });
    expect(result.brand_mentioned).toBe(true);
    expect(result.url_cited).toBe(true);
  });

  it("detecta concorrentes mencionados", () => {
    const result = analyzeResponse({
      ...baseInput,
      responseText: "Tem PetDerma, vet1.com.br e vet2.com.br como opções",
    });
    expect(result.competitors_mentioned).toContain("vet1.com.br");
    expect(result.competitors_mentioned).toContain("vet2.com.br");
  });

  it("calcula posição quando marca aparece depois de concorrentes", () => {
    const result = analyzeResponse({
      ...baseInput,
      responseText: "Primeiro vet1.com.br, depois PetDerma",
    });
    expect(result.position).toBe(2);
  });

  it("detecta sentimento positivo", () => {
    const result = analyzeResponse({
      ...baseInput,
      responseText: "PetDerma é a melhor clínica, ótimo atendimento",
    });
    expect(result.sentiment).toBe("positive");
  });

  it("detecta sentimento negativo", () => {
    const result = analyzeResponse({
      ...baseInput,
      responseText: "PetDerma é caro demais e tem reclamação",
    });
    expect(result.sentiment).toBe("negative");
  });

  it("retorna neutro quando não há menção", () => {
    const result = analyzeResponse({
      ...baseInput,
      responseText: "Existem várias clínicas em SP",
    });
    expect(result.brand_mentioned).toBe(false);
    expect(result.position).toBeNull();
  });
});
