"use server";

import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(email: string) {
  if (!email?.trim()) return { error: "Email obrigatório" };

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${appUrl}/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: true };
}
