"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSite } from "@/lib/auth";
import { runVisibilityTracking } from "@/lib/visibility/tracker";

export async function runVisibilityAction() {
  const { site } = await getCurrentSite();
  if (!site) return { error: "Site não encontrado" };

  try {
    const result = await runVisibilityTracking(site.id);
    revalidatePath("/visibility");
    revalidatePath("/dashboard");
    return { success: true, result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao rodar tracking" };
  }
}
