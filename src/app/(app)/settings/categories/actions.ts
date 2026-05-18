"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSite, getCurrentOrg } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { suggestCategories } from "@/lib/blog/suggest-categories";

interface CategoryInput {
  name: string;
  description?: string;
}

/**
 * Cria categoria nova manualmente.
 */
export async function createCategoryAction(input: CategoryInput) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const name = input.name.trim();
  if (!name) return { error: "Nome obrigatório" };
  if (name.length > 50) return { error: "Nome muito longo (máx 50 chars)" };

  const baseSlug = slugify(name) || "categoria";

  // Tenta inserir; se colidir slug, adiciona sufixo
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
    const { data, error } = await supabase
      .from("blog_categories")
      .insert({
        site_id: site.id,
        name,
        slug,
        description: input.description?.trim() || null,
        source: "user_created",
      })
      .select("id, name, slug")
      .single();
    if (!error && data) {
      revalidatePath("/settings/categories");
      revalidatePath("/posts");
      return { success: true, category: data };
    }
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return { error: error.message };
    }
  }
  return { error: "Não foi possível criar (slug já existe)" };
}

/**
 * Renomeia/atualiza categoria (não muda slug pra preservar URLs).
 */
export async function updateCategoryAction(
  id: string,
  input: Partial<CategoryInput>
) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string") {
    const n = input.name.trim();
    if (!n) return { error: "Nome obrigatório" };
    patch.name = n;
  }
  if (typeof input.description === "string") {
    patch.description = input.description.trim() || null;
  }
  patch.source = "user_edited";

  const { error } = await supabase
    .from("blog_categories")
    .update(patch)
    .eq("id", id)
    .eq("site_id", site.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/categories");
  revalidatePath("/posts");
  return { success: true };
}

/**
 * Apaga categoria. Posts vinculados ficam com category_id=null (ON DELETE SET NULL).
 */
export async function deleteCategoryAction(id: string) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const { error } = await supabase
    .from("blog_categories")
    .delete()
    .eq("id", id)
    .eq("site_id", site.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/categories");
  revalidatePath("/posts");
  return { success: true };
}

/**
 * Sugere 5 categorias com IA baseado no briefing + insere as que não
 * existem ainda no site. Idempotente — clicar 2x não duplica.
 *
 * Usado pelo botão "Sugerir 5 com IA" em /settings/categories pra clientes
 * que não passaram pelo step novo do onboarding.
 */
export async function suggestCategoriesAction() {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const { org } = await getCurrentOrg();

  // Lê briefing pra extrair seeds
  const { data: briefing } = await supabase
    .from("briefings")
    .select("refined_brief")
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!briefing?.refined_brief) {
    return {
      error:
        "Termine o briefing primeiro — a IA usa as informações dele pra sugerir.",
    };
  }

  const suggestions = await suggestCategories(
    briefing.refined_brief as Record<string, unknown>
  );

  if (suggestions.length === 0) {
    return { error: "IA não conseguiu gerar sugestões. Tente de novo." };
  }

  // Categorias que já existem (pra não duplicar slug)
  const { data: existing } = await supabase
    .from("blog_categories")
    .select("slug")
    .eq("site_id", site.id);
  const existingSlugs = new Set((existing ?? []).map((c) => c.slug));

  const toInsert = suggestions
    .filter((s) => !existingSlugs.has(s.slug))
    .map((s, idx) => ({
      site_id: site.id,
      name: s.name,
      slug: s.slug,
      description: s.description || null,
      display_order: existingSlugs.size + idx,
      source: "ai_suggested",
    }));

  if (toInsert.length === 0) {
    return {
      success: true,
      count: 0,
      message: "Todas as sugestões da IA já existem.",
    };
  }

  const { error: insErr } = await supabase
    .from("blog_categories")
    .insert(toInsert);
  if (insErr) return { error: insErr.message };

  revalidatePath("/settings/categories");
  revalidatePath("/posts");
  return { success: true, count: toInsert.length };
}

/**
 * Aplica as categorias confirmadas pelo cliente no fim do onboarding.
 * Sobrescreve qualquer categoria existente (sem posts vinculados ainda).
 */
export async function commitOnboardingCategoriesAction(
  categories: Array<{ name: string; slug: string; description?: string }>
) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  // Limpa categorias atuais do site (assumindo onboarding ainda — sem posts)
  await supabase.from("blog_categories").delete().eq("site_id", site.id);

  if (categories.length === 0) return { success: true, count: 0 };

  const rows = categories.map((c, idx) => ({
    site_id: site.id,
    name: c.name.trim(),
    slug: c.slug || slugify(c.name) || `categoria-${idx + 1}`,
    description: c.description?.trim() || null,
    display_order: idx,
    source: "ai_suggested",
  }));

  const { error } = await supabase.from("blog_categories").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/settings/categories");
  revalidatePath("/posts");
  return { success: true, count: rows.length };
}
