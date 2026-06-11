/**
 * @deprecated MODELO ANTIGO (reverse proxy Cloudflare Worker).
 * Substituido pelo modelo subdominio: Vercel Custom Domains + middleware
 * por Host (ver src/lib/vercel/domains.ts e src/proxy.ts). Mantido apenas
 * como referencia historica — nada no app importa mais este arquivo.
 */
/**
 * Orquestração de deploy do Worker pra um site específico.
 * Combina template + API + estado no banco.
 */
import { renderWorkerScript, workerName, workerRoute } from "./worker-template";
import {
  findZoneByDomain,
  uploadWorkerScript,
  upsertWorkerRoute,
  deleteWorker,
  deleteWorkerRoute,
  healthCheckRoute,
} from "./api";
import { createServiceClient } from "@/lib/supabase/server";

export interface DeployResult {
  success: boolean;
  workerName: string;
  routePattern: string;
  zoneId: string;
  error?: string;
}

/**
 * Deploy completo: cria/atualiza Worker + configura rota + registra estado.
 */
export async function deployWorkerForSite(siteId: string): Promise<DeployResult> {
  const supabase = createServiceClient();

  const { data: site, error } = await supabase
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .single();
  if (error || !site) throw new Error("Site não encontrado");

  const domain = (site.domain as string).replace(/^www\./, "");
  const upstreamOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/^https?:\/\//, "");
  const tenantSlug = site.tenant_slug as string;
  const blogPath = (site.proxy_path as string | null) ?? "/blog";

  // 1. Acha zone do domínio do cliente
  const zone = await findZoneByDomain(domain);
  if (!zone) {
    return {
      success: false,
      workerName: workerName(tenantSlug),
      routePattern: workerRoute(domain, blogPath),
      zoneId: "",
      error: `Zone Cloudflare não encontrada pro domínio ${domain}. Cliente precisa apontar nameservers Cloudflare primeiro.`,
    };
  }

  // 2. Gera Worker script
  const script = renderWorkerScript({
    tenantSlug,
    upstreamOrigin,
    customerDomain: domain,
    blogPath,
  });
  const name = workerName(tenantSlug);

  // 3. Upload do Worker
  await uploadWorkerScript(name, script);

  // 4. Configura rota
  const route = await upsertWorkerRoute({
    zoneId: zone.id,
    pattern: workerRoute(domain, blogPath),
    scriptName: name,
  });

  // 5. Registra estado no banco
  await supabase
    .from("cloudflare_workers")
    .upsert({
      site_id: siteId,
      zone_id: zone.id,
      worker_name: name,
      worker_route: route.pattern,
      account_id: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
      status: "deployed",
      config: { upstreamOrigin, blogPath, tenantSlug },
    });

  // 6. Atualiza site
  await supabase
    .from("sites")
    .update({
      cloudflare_zone_id: zone.id,
      cloudflare_worker_id: name,
      proxy_method: "reverse_proxy",
      proxy_path: blogPath,
      status: "active",
    })
    .eq("id", siteId);

  // 7. Audit log
  await supabase.from("audit_log").insert({
    organization_id: site.organization_id,
    site_id: siteId,
    event_type: "worker_deployed",
    event_data: { worker_name: name, route_pattern: route.pattern, zone_id: zone.id },
  });

  return {
    success: true,
    workerName: name,
    routePattern: route.pattern,
    zoneId: zone.id,
  };
}

/**
 * Verifica saúde do Worker (chamado em cron periódico).
 */
export async function healthCheckWorker(siteId: string): Promise<{ ok: boolean; ms: number }> {
  const supabase = createServiceClient();

  const { data: site } = await supabase
    .from("sites")
    .select("domain, proxy_path")
    .eq("id", siteId)
    .single();
  if (!site) return { ok: false, ms: 0 };

  const result = await healthCheckRoute(site.domain as string, (site.proxy_path as string) ?? "/blog");

  await supabase
    .from("cloudflare_workers")
    .update({
      last_health_check_at: new Date().toISOString(),
      last_response_ms: result.ms,
      status: result.ok ? "deployed" : "error",
    })
    .eq("site_id", siteId);

  return { ok: result.ok, ms: result.ms };
}

/**
 * Remove Worker e rota (cancelamento, mudança de domínio).
 */
export async function removeWorkerForSite(siteId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: cf } = await supabase
    .from("cloudflare_workers")
    .select("worker_name, zone_id")
    .eq("site_id", siteId)
    .single();
  if (!cf) return;

  // Lista rotas e deleta as desse Worker
  try {
    await deleteWorker(cf.worker_name as string);
  } catch {
    // Worker pode não existir mais — ignora
  }

  await supabase
    .from("cloudflare_workers")
    .update({ status: "removed" })
    .eq("site_id", siteId);
}
