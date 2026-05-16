import { describe, it, expect } from "vitest";
import { calculateReadingTime, formatReadingTime } from "./reading-time";

describe("calculateReadingTime", () => {
  it("returns minimum 1 minute pra texto curto", () => {
    const { minutes, words } = calculateReadingTime("Apenas algumas palavras aqui");
    expect(minutes).toBe(1);
    expect(words).toBe(4);
  });

  it("calcula corretamente pra texto longo", () => {
    const text = "palavra ".repeat(660); // 660 palavras = 3 min em 220 wpm
    const { minutes, words } = calculateReadingTime(text);
    expect(words).toBe(660);
    expect(minutes).toBe(3);
  });

  it("ignora markdown formatting", () => {
    const md = "# Título\n\n**bold** _italic_ [link](url)";
    const { words } = calculateReadingTime(md);
    expect(words).toBe(5); // Título bold italic link url
  });

  it("ignora HTML tags", () => {
    const html = "<p>Olá <strong>mundo</strong> teste</p>";
    const { words } = calculateReadingTime(html);
    expect(words).toBe(3);
  });
});

describe("formatReadingTime", () => {
  it("singular pra 1 minuto", () => {
    expect(formatReadingTime(1)).toBe("1 min de leitura");
  });
  it("plural pra mais de 1", () => {
    expect(formatReadingTime(5)).toBe("5 min de leitura");
  });
});
