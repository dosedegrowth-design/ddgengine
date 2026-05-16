/**
 * Webhook receiver pro Asaas.
 *
 * Eventos relevantes:
 * - SUBSCRIPTION_CREATED / SUBSCRIPTION_UPDATED
 * - PAYMENT_CONFIRMED / PAYMENT_RECEIVED
 * - PAYMENT_OVERDUE
 * - SUBSCRIPTION_DELETED
 *
 * Configurar URL no Asaas: dashboard > Configurações > Notificações > Webhooks
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const event = body?.event as string | undefined;

  if (!event || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ received: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { db: { schema: "ddg_engine" }, auth: { persistSession: false } }
  );

  try {
    const subscriptionId = body?.subscription?.id ?? body?.payment?.subscription ?? null;
    const paymentStatus = body?.payment?.status as string | undefined;

    switch (event) {
      case "SUBSCRIPTION_CREATED":
      case "SUBSCRIPTION_UPDATED": {
        if (!subscriptionId) break;
        await supabase
          .from("subscriptions")
          .update({
            external_id: subscriptionId,
            status: body.subscription?.status === "ACTIVE" ? "active" : "past_due",
            next_billing_at: body.subscription?.nextDueDate,
            amount_brl: body.subscription?.value,
          })
          .eq("external_id", subscriptionId);
        break;
      }

      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        if (!subscriptionId) break;
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("organization_id, plan")
          .eq("external_id", subscriptionId)
          .maybeSingle();
        if (sub) {
          await supabase
            .from("subscriptions")
            .update({ status: "active" })
            .eq("external_id", subscriptionId);
          await supabase
            .from("organizations")
            .update({ status: "active", plan: sub.plan })
            .eq("id", sub.organization_id);
          await supabase.from("audit_log").insert({
            organization_id: sub.organization_id,
            event_type: "payment_received",
            event_data: { subscription_id: subscriptionId, amount: body.payment?.value },
          });
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
        if (!subscriptionId) break;
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("external_id", subscriptionId);
        break;
      }

      case "SUBSCRIPTION_DELETED": {
        if (!subscriptionId) break;
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("organization_id")
          .eq("external_id", subscriptionId)
          .maybeSingle();
        if (sub) {
          await supabase
            .from("subscriptions")
            .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
            .eq("external_id", subscriptionId);
          await supabase
            .from("organizations")
            .update({ status: "cancelled" })
            .eq("id", sub.organization_id);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Asaas webhook error:", err);
  }

  return NextResponse.json({ received: true });
}
