/**
 * Carrega template + brand tokens do primeiro site da org.
 * Helper compartilhado pelas pages de blog público (Server Components).
 */
import { createServiceClient } from "@/lib/supabase/server";
import {
  type BlogTemplate,
  type BrandTokens,
  resolveBrandTokens,
} from "./templates";
import { type BlogCta, resolveCta } from "./cta";

export interface BlogShellContext {
  template: BlogTemplate;
  tokens: BrandTokens;
  /** Primeiros site_ids da org (pra queries de posts) */
  siteIds: string[];
  /** Chamada para ação do blog (configurada no Radar; sempre resolve pra algo) */
  cta: BlogCta;
}

export async function loadBlogShellContext(orgId: string, orgName = ""): Promise<BlogShellContext> {
  const supabase = createServiceClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, blog_template, brand_tokens, domain, cta")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  const list = (sites ?? []) as Array<{
    id: string;
    blog_template: string | null;
    brand_tokens: Partial<BrandTokens> | null;
    domain: string | null;
    cta: Partial<BlogCta> | null;
  }>;

  const primarySite = list[0];
  const template = ((primarySite?.blog_template ?? "editorial") as BlogTemplate);
  const tokens = resolveBrandTokens(template, primarySite?.brand_tokens ?? null);

  return {
    template,
    tokens,
    siteIds: list.map((s) => s.id),
    cta: resolveCta(primarySite?.cta ?? null, primarySite?.domain ?? null, orgName),
  };
}
