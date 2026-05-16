"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSite } from "@/lib/auth";
import { auditSite } from "@/lib/audit";
import { deployWorkerForSite } from "@/lib/cloudflare/deploy";

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
    if (!result.success) return { error: result.error ?? "Falha no deploy" };
    return { success: true, workerName: result.workerName };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro no deploy do Worker" };
  }
}
