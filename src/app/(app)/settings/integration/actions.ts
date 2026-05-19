"use server";

/**
 * Server actions do wizard de conexão de domínio.
 *
 * Step 1: initiateDomainConnection
 *   - Cria zona Cloudflare na conta master
 *   - Salva zone_id + nameservers em sites
 *   - state: preview → zone_created
 *
 * Step 3: verifyDomainConnection
 *   - Lê estado da zona no Cloudflare
 *   - Se 'active' = DNS propagado → deploya Worker → state: active
 *   - Senão → state: verifying (cron checa periodicamente)
 *
 * Erros caem em integration_state='error' pra UI mostrar.
 */
import { revalidatePath } from "next/cache";
import { getCurrentSite } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { createZone, getZone, findZoneByDomain } from "@/lib/cloudflare/api";
import { deployWorkerForSite } from "@/lib/cloudflare/deploy";
import {
  sendConciergeRequestedToTeam,
  sendConciergeConfirmationToClient,
} from "@/lib/notifications/concierge-emails";

export async function initiateDomainConnection(siteId: string) {
  const { site } = await getCurrentSite();
  if (!site || site.id !== siteId) return { error: "Site não autorizado" };
  if (!site.domain) return { error: "Site sem domínio configurado" };

  const admin = createServiceClient();

  try {
    // Idempotente: se já criamos zona pra esse domínio, reusa
    let zone = await findZoneByDomain(site.domain);
    if (!zone) {
      zone = await createZone(site.domain);
    }

    // Lê NS da zona (Cloudflare atribui 2 NS aleatórios da pool)
    const fullZone = await getZone(zone.id);

    const { error } = await admin
      .from("sites")
      .update({
        cloudflare_zone_id: zone.id,
        cloudflare_nameservers: fullZone.name_servers,
        integration_state: "zone_created",
        integration_started_at: new Date().toISOString(),
      })
      .eq("id", siteId);

    if (error) return { error: error.message };

    revalidatePath("/settings/integration");
    revalidatePath("/dashboard");
    return { success: true, nameservers: fullZone.name_servers };
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
  if (!site.cloudflare_zone_id) {
    return { error: "Zona ainda não foi criada. Volte ao Passo 1." };
  }

  const admin = createServiceClient();

  try {
    const zone = await getZone(site.cloudflare_zone_id as string);

    // Cloudflare valida nameservers automaticamente. Quando status='active',
    // significa que o cliente já trocou os NS no registrador e a propagação completou.
    if (zone.status !== "active") {
      // Ainda propagando — atualiza state pra "verifying" pro banner mudar
      await admin
        .from("sites")
        .update({ integration_state: "verifying" })
        .eq("id", siteId);
      revalidatePath("/settings/integration");
      revalidatePath("/dashboard");
      return { verified: false };
    }

    // Zona ativa → deploya Worker + marca status
    const deployResult = await deployWorkerForSite(siteId);
    if (!deployResult.success) {
      await admin
        .from("sites")
        .update({ integration_state: "error" })
        .eq("id", siteId);
      return { error: deployResult.error ?? "Falha ao ativar integração" };
    }

    await admin
      .from("sites")
      .update({
        integration_state: "active",
        integration_activated_at: new Date().toISOString(),
        status: "active",
      })
      .eq("id", siteId);

    revalidatePath("/settings/integration");
    revalidatePath("/dashboard");
    revalidatePath("/settings/site");
    return { verified: true };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Erro ao verificar propagação DNS";
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
