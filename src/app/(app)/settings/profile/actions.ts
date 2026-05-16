"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/auth";

export async function updateProfile({ name, orgName }: { name: string; orgName: string }) {
  const { user, supabase, org } = await getCurrentOrg();

  if (name) {
    const { error } = await supabase.auth.updateUser({ data: { name } });
    if (error) return { error: error.message };
  }

  if (orgName && orgName !== org.name) {
    const { error } = await supabase
      .from("organizations")
      .update({ name: orgName })
      .eq("id", org.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
