"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/auth";

export async function createWebhook(args: { orgId: string; url: string; events: string[] }) {
  const { user, org, supabase } = await getCurrentOrg();
  if (org.id !== args.orgId) return { error: "Org não autorizada" };
  if (!["multi", "agency", "native"].includes(org.plan)) {
    return { error: "Webhooks disponíveis nos planos Multi, Agência e Native" };
  }

  const secret = `whsec_${randomBytes(24).toString("base64url")}`;

  const { error } = await supabase.from("webhook_subscriptions").insert({
    organization_id: args.orgId,
    url: args.url,
    secret,
    events: args.events,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/webhooks");
  return { success: true, secret };
}

export async function toggleWebhook(id: string, active: boolean) {
  const { org, supabase } = await getCurrentOrg();
  const { error } = await supabase
    .from("webhook_subscriptions")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", org.id);
  if (error) return { error: error.message };
  revalidatePath("/settings/webhooks");
  return { success: true };
}

export async function deleteWebhook(id: string) {
  const { org, supabase } = await getCurrentOrg();
  const { error } = await supabase
    .from("webhook_subscriptions")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.id);
  if (error) return { error: error.message };
  revalidatePath("/settings/webhooks");
  return { success: true };
}
