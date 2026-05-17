"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSite } from "@/lib/auth";
import { auditSite } from "@/lib/audit";
import { deployWorkerForSite } from "@/lib/cloudflare/deploy";
import { importWordPressBlog } from "@/lib/imports/wordpress";

export async function redoAudit(siteId: string) {
  const { site, supabase } = await getCurrentSite();
  if (!site || site.id !== siteId) return { error: "Site não encontrado" };

  try {
    const audit = await auditSite(`https://${site.domain}`);
    await supabase
      .from("sites")
      .update({
        audit_score: audit.score,
        audit_data: audit as unknown as Record<string, unknown>,
        audit_run_at: audit.ran_at,
        stack_detected: audit.checks.stack.detected,
        has_cloudflare: audit.checks.cloudflare.detected,
      })
      .eq("id", site.id);
    revalidatePath("/settings/site");
    return { success: true, audit };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro na auditoria" };
  }
}

export async function deployWorker(siteId: string) {
  const { site } = await getCurrentSite();
  if (!site || site.id !== siteId) return { error: "Site não encontrado" };

  try {
    const result = await deployWorkerForSite(siteId);
    revalidatePath("/settings/site");
    if (!result.success) return { error: result.error ?? "Falha ao preparar integração" };
    return { success: true, workerName: result.workerName };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao preparar integração" };
  }
}

export async function importWordPress(args: { siteId: string; sourceUrl: string; limit: number }) {
  const { site } = await getCurrentSite();
  if (!site || site.id !== args.siteId) return { error: "Site não autorizado" };

  try {
    const result = await importWordPressBlog({
      siteId: args.siteId,
      sourceUrl: args.sourceUrl,
      limit: args.limit,
    });
    revalidatePath("/posts");
    revalidatePath("/settings/site");
    return { success: true, result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro no import" };
  }
}
