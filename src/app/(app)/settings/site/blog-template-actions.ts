"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSite } from "@/lib/auth";
import type { BlogTemplate } from "@/lib/blog/templates";

const VALID: BlogTemplate[] = ["editorial", "magazine", "minimal", "bold"];

export async function setBlogTemplateAction(template: BlogTemplate) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };
  if (!VALID.includes(template)) return { error: "Template inválido" };

  const { error } = await supabase
    .from("sites")
    .update({ blog_template: template })
    .eq("id", site.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/site");
  return { success: true };
}
