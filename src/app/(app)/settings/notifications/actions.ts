"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/auth";

export async function saveNotificationPrefs(
  orgId: string,
  args: { phone: string; prefs: any }
) {
  const { org, supabase } = await getCurrentOrg();
  if (org.id !== orgId) return { error: "Org não autorizada" };

  const cleanPhone = args.phone.replace(/\D/g, "");

  const { error } = await supabase
    .from("organizations")
    .update({
      contact_phone: cleanPhone || null,
      notification_prefs: args.prefs,
    })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/settings/notifications");
  return { success: true };
}
