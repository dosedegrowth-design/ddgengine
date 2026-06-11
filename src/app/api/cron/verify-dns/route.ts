/**
 * GET /api/cron/verify-dns
 *
 * Cron job (Vercel) — verifica sites em estado 'cname_pending' ou 'verifying'
 * e ativa automaticamente quando o CNAME propaga + a Vercel valida o domínio
 * (+ emite SSL). Cliente não precisa voltar e clicar "verificar".
 *
 * Roda 1x/dia via vercel.json (Hobby plan).
 * Protegido por CRON_SECRET — Vercel envia `authorization: Bearer <secret>`.
 *
 * Pra cada site no funil:
 *   1. getProjectDomainStatus(blog_host) na Vercel
 *   2. Se verified → cname_verified=true + state=active + email
 *   3. Senão → state=verifying
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getProjectDomainStatus } from "@/lib/vercel/domains";
import { sendBlogActivatedEmail } from "@/lib/notifications/blog-activated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface PendingSite {
  id: string;
  domain: string;
  blog_host: string;
  integration_state: string;
  organization_id: string;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();

  const { data: sites, error } = await admin
    .from("sites")
    .select("id, domain, blog_host, integration_state, organization_id")
    .in("integration_state", ["cname_pending", "verifying"])
    .not("blog_host", "is", null);

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
      const status = await getProjectDomainStatus(site.blog_host);

      if (status.verified) {
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
        // Ainda propagando
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
