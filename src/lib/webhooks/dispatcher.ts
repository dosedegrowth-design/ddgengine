/**
 * Dispatcher de webhooks outbound (cliente recebe eventos).
 *
 * Tipos de eventos:
 * - post.published — post foi publicado
 * - post.failed — geração falhou
 * - visibility.run.completed — tracking IA semanal pronto
 * - metrics.threshold — milestone (X visitas, posições, etc)
 */
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

export type WebhookEvent =
  | "post.published"
  | "post.failed"
  | "post.scheduled"
  | "visibility.run.completed"
  | "metrics.threshold";

interface DispatchInput {
  organizationId: string;
  event: WebhookEvent;
  data: Record<string, unknown>;
}

export async function dispatchWebhook(input: DispatchInput) {
  const supabase = createServiceClient();

  const { data: subscriptions } = await supabase
    .from("webhook_subscriptions")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("active", true)
    .contains("events", [input.event]);

  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub: any) => {
      const payload = {
        event: input.event,
        timestamp: new Date().toISOString(),
        data: input.data,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = createHmac("sha256", sub.secret as string)
        .update(payloadStr)
        .digest("hex");

      // Salva delivery em pending
      const { data: delivery } = await supabase
        .from("webhook_deliveries")
        .insert({
          subscription_id: sub.id,
          organization_id: input.organizationId,
          event_type: input.event,
          payload,
          attempts: 1,
        })
        .select()
        .single();

      try {
        const res = await fetch(sub.url as string, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "DDGEngine-Webhook/1.0",
            "X-DDG-Event": input.event,
            "X-DDG-Signature": `sha256=${signature}`,
            "X-DDG-Delivery-Id": delivery?.id ?? "",
          },
          body: payloadStr,
          signal: AbortSignal.timeout(15000),
        });

        const responseBody = (await res.text()).slice(0, 2000);

        if (res.ok) {
          await supabase
            .from("webhook_deliveries")
            .update({
              response_status: res.status,
              response_body: responseBody,
              delivered_at: new Date().toISOString(),
            })
            .eq("id", delivery!.id);
          await supabase
            .from("webhook_subscriptions")
            .update({
              last_triggered_at: new Date().toISOString(),
              failures_count: 0,
            })
            .eq("id", sub.id);
        } else {
          await supabase
            .from("webhook_deliveries")
            .update({
              response_status: res.status,
              response_body: responseBody,
              failed_at: new Date().toISOString(),
            })
            .eq("id", delivery!.id);
          await supabase
            .from("webhook_subscriptions")
            .update({ failures_count: (sub.failures_count ?? 0) + 1 })
            .eq("id", sub.id);
        }
      } catch (err) {
        await supabase
          .from("webhook_deliveries")
          .update({
            response_status: 0,
            response_body: err instanceof Error ? err.message : "unknown",
            failed_at: new Date().toISOString(),
          })
          .eq("id", delivery!.id);
      }
    })
  );
}
