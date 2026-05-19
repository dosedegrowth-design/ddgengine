/**
 * GET /api/cron/trial-lifecycle
 *
 * Roda 1x por dia (vercel.json) — verifica orgs em trial:
 *
 *  1. trial_ends_at <= now()  E status='active'
 *     → marca status='trial_expired' (UI mostra banner read-only)
 *     → email "Seu trial acabou — escolha um plano pra continuar"
 *
 *  2. trial_expired há > 7 dias
 *     → status='cancelled' + teardown infra Cloudflare (lock-in)
 *     → email "Conta desativada — posts ficam guardados por 90 dias"
 *
 * Auth: CRON_SECRET (Vercel envia Bearer header).
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { teardownOrgInfra } from "@/lib/billing/teardown";
import { sendTrialExpiredEmail, sendOrgDeactivatedEmail } from "@/lib/notifications/trial-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const READ_ONLY_GRACE_DAYS = 7;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - READ_ONLY_GRACE_DAYS * 24 * 60 * 60 * 1000);

  const stats = {
    trial_expired: 0,
    deactivated: 0,
    errors: 0,
  };

  // ── 1. Trials que acabaram de expirar ──
  const { data: justExpired } = await admin
    .from("organizations")
    .select("id, name, owner_user_id, trial_ends_at")
    .eq("plan", "trial")
    .eq("status", "active")
    .lt("trial_ends_at", now.toISOString());

  for (const org of justExpired ?? []) {
    try {
      await admin
        .from("organizations")
        .update({
          status: "trial_expired",
          trial_expired_at: now.toISOString(),
        })
        .eq("id", org.id);

      await admin.from("audit_log").insert({
        organization_id: org.id,
        event_type: "trial_expired",
        event_data: { trial_ended: org.trial_ends_at },
      });

      void sendTrialExpiredEmail({ orgId: org.id, orgName: org.name }).catch(() => null);
      stats.trial_expired++;
    } catch (err) {
      console.error("[trial-lifecycle] erro marcando expired:", err);
      stats.errors++;
    }
  }

  // ── 2. Orgs em trial_expired há mais de 7 dias → desativa ──
  const { data: toDeactivate } = await admin
    .from("organizations")
    .select("id, name")
    .eq("status", "trial_expired")
    .lt("trial_expired_at", sevenDaysAgo.toISOString());

  for (const org of toDeactivate ?? []) {
    try {
      await admin
        .from("organizations")
        .update({ status: "cancelled", cancelled_at: now.toISOString() })
        .eq("id", org.id);

      // Remove Worker / Routes do Cloudflare (lock-in)
      void teardownOrgInfra(org.id).catch((err) => {
        console.error("[trial-lifecycle] teardown falhou pra", org.id, err);
      });

      await admin.from("audit_log").insert({
        organization_id: org.id,
        event_type: "org_deactivated",
        event_data: { reason: "trial_expired_grace_period_ended" },
      });

      void sendOrgDeactivatedEmail({ orgId: org.id, orgName: org.name }).catch(() => null);
      stats.deactivated++;
    } catch (err) {
      console.error("[trial-lifecycle] erro desativando:", err);
      stats.errors++;
    }
  }

  return NextResponse.json(stats);
}
