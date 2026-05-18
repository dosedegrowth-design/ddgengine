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

export interface BlogShellContext {
  template: BlogTemplate;
  tokens: BrandTokens;
  /** Primeiros site_ids da org (pra queries de posts) */
  siteIds: string[];
}

export async function loadBlogShellContext(orgId: string): Promise<BlogShellContext> {
  const supabase = createServiceClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, blog_template, brand_tokens")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  const list = (sites ?? []) as Array<{
    id: string;
    blog_template: string | null;
    brand_tokens: Partial<BrandTokens> | null;
  }>;

  const primarySite = list[0];
  const template = ((primarySite?.blog_template ?? "editorial") as BlogTemplate);
  const tokens = resolveBrandTokens(template, primarySite?.brand_tokens ?? null);

  return {
    template,
    tokens,
    siteIds: list.map((s) => s.id),
  };
}
