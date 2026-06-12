"use server";

import { revalidatePath } from "next/cache";
import { auditSite, type AuditResult } from "@/lib/audit";
import { getCurrentOrg } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { buildBrandProfile } from "@/lib/blog/brand-profile";

export async function auditAndCreateSite(
  orgId: string,
  rawUrl: string
): Promise<{ audit: AuditResult; siteId: string } | { error: string }> {
  const { org, supabase } = await getCurrentOrg();

  if (org.id !== orgId) {
    return { error: "Org não autorizada" };
  }

  let audit: AuditResult;
  try {
    audit = await auditSite(rawUrl);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao auditar site" };
  }

  // Lê o site do cliente e monta o DNA visual completo (cores, fontes,
  // raio, sombra, vibe) + template recomendado. Best-effort — se falhar,
  // BlogShell usa defaults do template.
  const profile = await buildBrandProfile(rawUrl).catch(() => ({
    tokens: {},
    template: undefined,
  }));
  const brandTokens = profile.tokens;
  const detectedTemplate = profile.template;

  // Cria ou atualiza site
  const tenantSlug = `${slugify(org.slug)}-${audit.domain.replace(/\./g, "-")}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  // Tenta achar site existente pra esse domínio
  const { data: existing } = await supabase
    .from("sites")
    .select("id, tenant_slug")
    .eq("organization_id", orgId)
    .eq("domain", audit.domain)
    .maybeSingle();

  let siteId: string;

  // Só inclui brand_tokens/template no payload se detectamos algo (evita
  // overwrite com {} num re-audit)
  const tokensPayload = {
    ...(Object.keys(brandTokens).length > 0 ? { brand_tokens: brandTokens } : {}),
    ...(detectedTemplate ? { blog_template: detectedTemplate } : {}),
  };

  if (existing) {
    const { error } = await supabase
      .from("sites")
      .update({
        audit_score: audit.score,
        audit_data: audit as unknown as Record<string, unknown>,
        audit_run_at: audit.ran_at,
        stack_detected: audit.checks.stack.detected,
        has_cloudflare: audit.checks.cloudflare.detected,
        status: "configuring",
        ...tokensPayload,
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
    siteId = existing.id;
  } else {
    const { data: created, error } = await supabase
      .from("sites")
      .insert({
        organization_id: orgId,
        domain: audit.domain,
        tenant_slug: tenantSlug,
        audit_score: audit.score,
        audit_data: audit as unknown as Record<string, unknown>,
        audit_run_at: audit.ran_at,
        stack_detected: audit.checks.stack.detected,
        has_cloudflare: audit.checks.cloudflare.detected,
        status: "configuring",
        proxy_method: audit.checks.cloudflare.detected ? "reverse_proxy" : "subdomain",
        ...tokensPayload,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    siteId = created.id;
  }

  // Log de auditoria
  await supabase.from("audit_log").insert({
    organization_id: orgId,
    site_id: siteId,
    event_type: "site_audited",
    event_data: { score: audit.score, classification: audit.classification, domain: audit.domain },
  });

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  return { audit, siteId };
}
