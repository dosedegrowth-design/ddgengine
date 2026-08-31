import { describe, it, expect } from "vitest";
import { canonicalKey } from "../keyword-universe";

describe("canonicalKey — dedup semântico de keywords", () => {
  it("colapsa plural (rações → ração)", () => {
    expect(canonicalKey("rações hipoalergênicas")).toBe(
      canonicalKey("ração hipoalergênica")
    );
    expect(canonicalKey("racoes hipoalergênica")).toBe(
      canonicalKey("ração hipoalergênica")
    );
  });

  it("colapsa cães/cão/cachorro/canina no mesmo tema", () => {
    expect(canonicalKey("dermatite em cães")).toBe(
      canonicalKey("dermatite cachorro")
    );
    expect(canonicalKey("dermatite canina")).toBe(
      canonicalKey("dermatite no cão")
    );
  });

  it("junta variações com stopwords e ordem diferente", () => {
    expect(canonicalKey("doença de pele em cachorro")).toBe(
      canonicalKey("cachorro doença pele")
    );
  });

  it("NÃO junta temas diferentes", () => {
    expect(canonicalKey("ração hipoalergênica")).not.toBe(
      canonicalKey("ração natural")
    );
    expect(canonicalKey("dermatite em gatos")).not.toBe(
      canonicalKey("dermatite em cães")
    );
    expect(canonicalKey("ração hipoalergênica para gatos")).not.toBe(
      canonicalKey("ração hipoalergênica")
    );
  });

  it("palavras curtas não sofrem stem indevido", () => {
    expect(canonicalKey("mês")).toBe("mes");
    expect(canonicalKey("gás")).toBe("gas");
  });
});
