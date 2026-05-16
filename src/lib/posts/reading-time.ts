/**
 * Cálculo de tempo de leitura em português.
 *
 * Velocidade média de leitura adulto em pt-BR: 200-250 palavras/min.
 * Usamos 220 como média conservadora.
 */

const WORDS_PER_MINUTE_PT_BR = 220;

export function calculateReadingTime(text: string): { minutes: number; words: number } {
  // Remove markdown e tags HTML
  const cleaned = text
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`~\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE_PT_BR));
  return { minutes, words };
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return "menos de 1 min de leitura";
  if (minutes === 1) return "1 min de leitura";
  return `${minutes} min de leitura`;
}
