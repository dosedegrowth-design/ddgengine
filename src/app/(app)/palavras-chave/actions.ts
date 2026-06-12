"use server";

import {
  generateKeywordIdeas,
  isConfigured,
  type KeywordResearchResult,
} from "@/lib/seo/keyword-research";
import { getCurrentSite } from "@/lib/auth";

export async function keywordIdeasAction(seed: string): Promise<KeywordResearchResult> {
  const { site } = await getCurrentSite();
  if (!site) return { ok: false, error: "Site não configurado" };

  const seeds = seed
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return generateKeywordIdeas(seeds, 40);
}

export async function keywordResearchConfigured(): Promise<boolean> {
  return isConfigured();
}
