"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSite } from "@/lib/auth";
import { auditSite } from "@/lib/audit";
import { getProjectDomainStatus } from "@/lib/vercel/domains";
import { createServiceClient } from "@/lib/supabase/server";
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

/**
 * Re-verifica a conexão do subdomínio na Vercel (botão "ressincronizar").
 * Mantém o nome `deployWorker` por compat com quem chama (site-form).
 */
export async function deployWorker(siteId: string) {
  const { site } = await getCurrentSite();
  if (!site || site.id !== siteId) return { error: "Site não encontrado" };

  const blogHost = site.blog_host as string | null;
  if (!blogHost) {
    return { error: "Conexão de domínio ainda não iniciada." };
  }

  try {
    const status = await getProjectDomainStatus(blogHost);
    const admin = createServiceClient();
    if (status.verified) {
      await admin
        .from("sites")
        .update({
          cname_verified: true,
          cname_verified_at: new Date().toISOString(),
          integration_state: "active",
          status: "active",
          proxy_method: "subdomain",
        })
        .eq("id", siteId);
      revalidatePath("/settings/site");
      return { success: true, verified: true };
    }
    revalidatePath("/settings/site");
    return { success: true, verified: false };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao verificar conexão" };
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
