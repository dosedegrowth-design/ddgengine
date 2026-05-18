/**
 * GET /api/cron/verify-dns
 *
 * Cron job (Vercel) — verifica zonas em estado 'verifying' ou 'zone_created'
 * e ativa automaticamente quando o DNS propaga. Cliente não precisa
 * voltar e clicar "verificar" manualmente.
 *
 * Roda a cada 30min via vercel.json.
 * Protegido por CRON_SECRET (env var) — Vercel envia header
 * `authorization: Bearer <secret>`.
 *
 * Pra cada site no funil:
 *   1. getZone(zoneId) no Cloudflare
 *   2. Se zone.status === 'active' → deploya Worker + state=active + email
 *   3. Senão → atualiza só state pra 'verifying'
 *   4. Erros → state='error' (banner vermelho aparece)
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getZone } from "@/lib/cloudflare/api";
import { deployWorkerForSite } from "@/lib/cloudflare/deploy";
import { sendBlogActivatedEmail } from "@/lib/notifications/blog-activated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface PendingSite {
  id: string;
  domain: string;
  cloudflare_zone_id: string;
  integration_state: string;
  organization_id: string;
}

export async function GET(req: Request) {
  // Vercel envia "Authorization: Bearer <CRON_SECRET>"
  const auth = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();

  // Carrega sites no funil
  const { data: sites, error } = await admin
    .from("sites")
    .select("id, domain, cloudflare_zone_id, integration_state, organization_id")
    .in("integration_state", ["zone_created", "verifying"])
    .not("cloudflare_zone_id", "is", null);

  if (error) {
    console.error("[cron verify-dns]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = (sites ?? []) as PendingSite[];
  const results = {
    checked: list.length,
    activated: 0,
    still_propagating: 0,
    errors: 0,
  };

  for (const site of list) {
    try {
      const zone = await getZone(site.cloudflare_zone_id);

      if (zone.status === "active") {
        // Propagou! Deploya Worker
        const deploy = await deployWorkerForSite(site.id);
        if (!deploy.success) {
          await admin
            .from("sites")
            .update({
              integration_state: "error",
              metadata: { last_error: deploy.error ?? "Worker deploy falhou" },
            })
            .eq("id", site.id);
          results.errors++;
          continue;
        }

        await admin
          .from("sites")
          .update({
            integration_state: "active",
            integration_activated_at: new Date().toISOString(),
            status: "active",
          })
          .eq("id", site.id);

        // Notifica cliente (fire-and-forget)
        void sendBlogActivatedEmail({
          orgId: site.organization_id,
          domain: site.domain,
        }).catch((err) => {
          console.warn(
            "[cron verify-dns] email falhou pra",
            site.id,
            err instanceof Error ? err.message : err
          );
        });

        results.activated++;
      } else {
        // Ainda propagando — atualiza state pra 'verifying'
        if (site.integration_state !== "verifying") {
          await admin
            .from("sites")
            .update({ integration_state: "verifying" })
            .eq("id", site.id);
        }
        results.still_propagating++;
      }
    } catch (err) {
      console.error("[cron verify-dns]", site.id, err);
      results.errors++;
    }
  }

  return NextResponse.json(results);
}
