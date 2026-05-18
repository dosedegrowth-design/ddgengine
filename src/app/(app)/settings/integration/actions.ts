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
