"use server";

import { createClient } from "@/lib/supabase/server";

export async function confirmPasswordReset(newPassword: string) {
  if (newPassword.length < 8) return { error: "Senha muito curta" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: error.message };
  return { success: true };
}
