/**
 * Teardown de assinatura — remove infra ativa do cliente quando ele
 * deixa de pagar / cancela. Lock-in: posts ficam visíveis SÓ enquanto
 * a org está com status='active'.
 *
 * Operações:
 *  1. Deleta Worker + Worker Route no Cloudflare (cliente.com.br/blog
 *     vira 404)
 *  2. Marca site.integration_state='preview' (UI mostra banner amarelo)
 *  3. Marca site.status='paused'
 *  4. Audit log
 *
 * Não deleta: posts, briefing, categorias — ficam guardados no DB
 * por 90 dias caso o cliente volte (retenção é negócio, não regra dura).
 */
import { createServiceClient } from "@/lib/supabase/server";
import { deleteWorker, deleteWorkerRoute } from "@/lib/cloudflare/api";

interface TeardownResult {
  success: boolean;
  errors: string[];
  workerRemoved: boolean;
  routesRemoved: number;
}

export async function teardownOrgInfra(orgId: string): Promise<TeardownResult> {
  const admin = createServiceClient();
  const result: TeardownResult = {
    success: true,
    errors: [],
    workerRemoved: false,
    routesRemoved: 0,
  };

  const { data: sites } = await admin
    .from("sites")
    .select("id, domain, tenant_slug, cloudflare_zone_id, cloudflare_worker_id")
    .eq("organization_id", orgId);

  for (const site of sites ?? []) {
    // 1. Remove Worker Routes
    if (site.cloudflare_zone_id) {
      try {
        const routes = await listWorkerRoutesForZone(site.cloudflare_zone_id);
        for (const r of routes) {
          try {
            await deleteWorkerRoute(site.cloudflare_zone_id, r.id);
            result.routesRemoved++;
          } catch (err) {
            result.errors.push(
              `Erro removendo route ${r.id}: ${err instanceof Error ? err.message : "?"}`
            );
          }
        }
      } catch (err) {
        // Listagem pode falhar — não bloqueia
        result.errors.push(
          `Erro listando routes: ${err instanceof Error ? err.message : "?"}`
        );
      }
    }

    // 2. Remove Worker Script
    if (site.cloudflare_worker_id) {
      try {
        await deleteWorker(site.cloudflare_worker_id);
        result.workerRemoved = true;
      } catch (err) {
        result.errors.push(
          `Erro removendo worker ${site.cloudflare_worker_id}: ${err instanceof Error ? err.message : "?"}`
        );
        result.success = false;
      }
    }

    // 3. Update site: volta pra estado de preview (sem Worker)
    await admin
      .from("sites")
      .update({
        integration_state: "preview",
        status: "paused",
        cloudflare_worker_id: null,
      })
      .eq("id", site.id);
  }

  // 4. Audit log
  await admin.from("audit_log").insert({
    organization_id: orgId,
    event_type: "infra_teardown",
    event_data: {
      sites_count: sites?.length ?? 0,
      worker_removed: result.workerRemoved,
      routes_removed: result.routesRemoved,
      errors: result.errors,
    },
  });

  return result;
}

/**
 * Lista routes de Worker numa zona — usado pra cleanup.
 * Helper local porque api.ts atual não exporta listagem direta.
 */
async function listWorkerRoutesForZone(
  zoneId: string
): Promise<Array<{ id: string; pattern: string; script: string }>> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) return [];
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: Array<{ id: string; pattern: string; script: string }>;
  };
  return json.result ?? [];
}
