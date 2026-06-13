"use server";

import {
  generateKeywordIdeas,
  isConfigured,
  type KeywordResearchResult,
} from "@/lib/seo/keyword-research";
import {
  refreshKeywordUniverse,
  getUniverseSummary,
  type RefreshResult,
} from "@/lib/seo/keyword-universe";
import { getCurrentSite } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

/** Atualiza o mapa de oportunidades do site (pesquisa os temas do briefing). */
export async function refreshOpportunitiesAction(): Promise<RefreshResult> {
  const { site, org } = await getCurrentSite();
  if (!site) return { ok: false, error: "Site não configurado" };
  const res = await refreshKeywordUniverse(org.id, site.id);
  if (res.ok) {
    revalidatePath("/palavras-chave");
    revalidatePath("/posts");
  }
  return res;
}

export async function universeSummaryAction() {
  const { site } = await getCurrentSite();
  if (!site) return null;
  return getUniverseSummary(site.id);
}

/** Liga/desliga o piloto automático e define a cadência (posts/semana). */
export async function setAutopilotAction(input: {
  enabled: boolean;
  postsPerWeek: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { ok: false, error: "Site não configurado" };
  const ppw = Math.max(1, Math.min(14, Math.round(input.postsPerWeek)));
  const { error } = await supabase
    .from("sites")
    .update({ autopilot_enabled: input.enabled, autopilot_posts_per_week: ppw })
    .eq("id", site.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/palavras-chave");
  return { ok: true };
}

export async function keywordConnectionStatus(): Promise<{
  hasAppCredentials: boolean;
  connected: boolean;
}> {
  const { hasAppCredentials, getRefreshToken } = await import(
    "@/lib/seo/keyword-research"
  );
  const connected = Boolean(await getRefreshToken());
  return { hasAppCredentials: hasAppCredentials(), connected };
}
