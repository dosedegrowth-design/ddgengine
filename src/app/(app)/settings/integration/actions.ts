"use server";

/**
 * Server actions do wizard de conexão de domínio (modelo SUBDOMÍNIO + CNAME).
 *
 * Step 1: initiateDomainConnection
 *   - Define blog_host = blog.{domain} + cname_target
 *   - Adiciona o domínio no projeto Vercel (addProjectDomain)
 *   - Salva subdomain/blog_host/cname_target + state: cname_pending
 *
 * Step 2 (verificar): verifyDomainConnection
 *   - Lê status do domínio na Vercel (CNAME apontado + SSL pronto?)
 *   - Se verified → cname_verified=true + state: active
 *   - Senão → state: verifying (cron checa periodicamente)
 *
 * Erros caem em integration_state='error' pra UI mostrar.
 */
import { revalidatePath } from "next/cache";
import { getCurrentSite } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  addProjectDomain,
  getProjectDomainStatus,
} from "@/lib/vercel/domains";
import {
  sendConciergeRequestedToTeam,
  sendConciergeConfirmationToClient,
} from "@/lib/notifications/concierge-emails";

/** Alvo do CNAME que o cliente aponta (branded, future-proof). */
const CNAME_TARGET = process.env.BLOG_CNAME_TARGET ?? "cname.conteudai.com.br";
/** Subdomínio padrão onde o blog vive. */
const BLOG_SUBDOMAIN = "blog";

export async function initiateDomainConnection(siteId: string) {
  const { site } = await getCurrentSite();
  if (!site || site.id !== siteId) return { error: "Site não autorizado" };
  if (!site.domain) return { error: "Site sem domínio configurado" };

  const admin = createServiceClient();
  const apex = (site.domain as string).replace(/^www\./, "");
  const blogHost = `${BLOG_SUBDOMAIN}.${apex}`;

  try {
    // Adiciona o subdomínio no projeto Vercel (idempotente).
    // Vercel emite SSL automático assim que o CNAME apontar.
    const added = await addProjectDomain(blogHost);
    if (!added.ok) {
      await admin
        .from("sites")
        .update({ integration_state: "error" })
        .eq("id", siteId);
      return { error: added.error ?? "Falha ao registrar o subdomínio" };
    }

    const { error } = await admin
      .from("sites")
      .update({
        subdomain: BLOG_SUBDOMAIN,
        blog_host: blogHost,
        cname_target: CNAME_TARGET,
        vercel_domain_added: true,
        cname_verified: false,
        integration_state: "cname_pending",
        integration_started_at: new Date().toISOString(),
      })
      .eq("id", siteId);

    if (error) return { error: error.message };

    revalidatePath("/settings/integration");
    revalidatePath("/dashboard");
    return {
      success: true,
      blogHost,
      cnameName: BLOG_SUBDOMAIN,
      cnameTarget: CNAME_TARGET,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao iniciar conexão";
    await admin
      .from("sites")
      .update({ integration_state: "error" })
      .eq("id", siteId);
    return { error: msg };
  }
}

export async function verifyDomainConnection(siteId: string) {
  const { site } = await getCurrentSite();
  if (!site || site.id !== siteId) return { error: "Site não autorizado" };
  const blogHost = site.blog_host as string | null;
  if (!blogHost) {
    return { error: "Conexão ainda não iniciada. Volte ao Passo 1." };
  }

  const admin = createServiceClient();

  try {
    const status = await getProjectDomainStatus(blogHost);

    if (!status.verified) {
      // CNAME ainda não apontou / propagou → verifying (cron re-checa)
      await admin
        .from("sites")
        .update({ integration_state: "verifying" })
        .eq("id", siteId);
      revalidatePath("/settings/integration");
      revalidatePath("/dashboard");
      return { verified: false };
    }

    // CNAME apontado + SSL pronto → ativa
    await admin
      .from("sites")
      .update({
        cname_verified: true,
        cname_verified_at: new Date().toISOString(),
        integration_state: "active",
        integration_activated_at: new Date().toISOString(),
        status: "active",
        proxy_method: "subdomain",
      })
      .eq("id", siteId);

    revalidatePath("/settings/integration");
    revalidatePath("/dashboard");
    revalidatePath("/settings/site");
    return { verified: true };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Erro ao verificar o CNAME";
    return { error: msg };
  }
}

interface ConciergeInput {
  contactEmail: string;
  contactPhone: string;
  message?: string;
}

/**
 * Concierge: cliente pede pra equipe DDG configurar o domínio pra ele.
 * - Cria ticket em support_tickets
 * - Marca site.integration_state='concierge_requested'
 * - Email pro time DDG (com toda info) + confirmação pro cliente
 */
export async function requestConciergeAction(
  siteId: string,
  input: ConciergeInput
) {
  const { site, user, org } = await getCurrentSite();
  if (!site || site.id !== siteId) return { error: "Site não autorizado" };
  if (!site.domain) return { error: "Site sem domínio configurado" };

  const contactEmail = input.contactEmail.trim() || user.email || "";
  const contactPhone = input.contactPhone.replace(/\D/g, "");
  if (!contactEmail) return { error: "Email de contato obrigatório" };
  if (!contactPhone || contactPhone.length < 10) {
    return { error: "WhatsApp obrigatório (formato 11999999999)" };
  }

  const admin = createServiceClient();

  // 1. Cria ticket
  const { data: ticket, error: ticketErr } = await admin
    .from("support_tickets")
    .insert({
      organization_id: org.id,
      site_id: site.id,
      type: "domain_integration",
      status: "open",
      message: input.message?.trim() || null,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      metadata: {
        domain: site.domain,
        org_name: org.name,
      },
    })
    .select("id")
    .single();

  if (ticketErr || !ticket) {
    return { error: ticketErr?.message ?? "Erro ao criar ticket" };
  }

  // 2. Atualiza estado da integração
  await admin
    .from("sites")
    .update({ integration_state: "concierge_requested" })
    .eq("id", siteId);

  // 3. Emails fire-and-forget (não bloqueia retorno pro cliente)
  void sendConciergeRequestedToTeam({
    ticketId: ticket.id,
    orgName: org.name,
    orgId: org.id,
    domain: site.domain,
    contactEmail,
    contactPhone,
    message: input.message?.trim() || "",
  }).catch((err) =>
    console.warn(
      "[concierge] email pro time falhou:",
      err instanceof Error ? err.message : err
    )
  );

  void sendConciergeConfirmationToClient({
    toEmail: contactEmail,
    orgName: org.name,
    domain: site.domain,
    ticketId: ticket.id,
  }).catch((err) =>
    console.warn(
      "[concierge] email pro cliente falhou:",
      err instanceof Error ? err.message : err
    )
  );

  revalidatePath("/settings/integration");
  revalidatePath("/dashboard");
  return { success: true, ticketId: ticket.id };
}
