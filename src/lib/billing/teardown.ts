/**
 * Teardown de assinatura — remove infra ativa do cliente quando ele
 * deixa de pagar / cancela. Lock-in: o blog fica acessível SÓ enquanto
 * a org está com status='active'.
 *
 * Operações (modelo subdomínio):
 *  1. Remove o domínio (blog.cliente.com.br) do projeto Vercel → o blog
 *     para de responder (o CNAME do cliente fica órfão até ele remover).
 *  2. Marca site.integration_state='preview' + cname_verified=false
 *     (o middleware deixa de resolver o host → 404).
 *  3. Marca site.status='paused'.
 *  4. Audit log.
 *
 * Não deleta: posts, briefing, categorias — ficam guardados no DB por
 * 90 dias caso o cliente volte (retenção é negócio, não regra dura).
 */
import { createServiceClient } from "@/lib/supabase/server";
import { removeProjectDomain } from "@/lib/vercel/domains";

interface TeardownResult {
  success: boolean;
  errors: string[];
  domainsRemoved: number;
}

export async function teardownOrgInfra(orgId: string): Promise<TeardownResult> {
  const admin = createServiceClient();
  const result: TeardownResult = {
    success: true,
    errors: [],
    domainsRemoved: 0,
  };

  const { data: sites } = await admin
    .from("sites")
    .select("id, domain, blog_host, vercel_domain_added")
    .eq("organization_id", orgId);

  for (const site of sites ?? []) {
    // 1. Remove o domínio do projeto Vercel
    if (site.blog_host && site.vercel_domain_added) {
      try {
        const r = await removeProjectDomain(site.blog_host as string);
        if (r.ok) {
          result.domainsRemoved++;
        } else {
          result.errors.push(
            `Erro removendo domínio ${site.blog_host}: ${r.error ?? "?"}`
          );
          result.success = false;
        }
      } catch (err) {
        result.errors.push(
          `Erro removendo domínio ${site.blog_host}: ${err instanceof Error ? err.message : "?"}`
        );
        result.success = false;
      }
    }

    // 2. Update site: volta pra preview (middleware deixa de resolver o host)
    await admin
      .from("sites")
      .update({
        integration_state: "preview",
        status: "paused",
        cname_verified: false,
        vercel_domain_added: false,
      })
      .eq("id", site.id);
  }

  // 3. Audit log
  await admin.from("audit_log").insert({
    organization_id: orgId,
    event_type: "infra_teardown",
    event_data: {
      sites_count: sites?.length ?? 0,
      domains_removed: result.domainsRemoved,
      errors: result.errors,
    },
  });

  return result;
}
