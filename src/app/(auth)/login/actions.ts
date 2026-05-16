"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginWithEmail(formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const redirectTo = formData.get("redirect_to")?.toString() ?? "/dashboard";

  if (!email || !password) {
    return { error: "Email e senha são obrigatórios" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: traduzirErro(error.message) };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

function traduzirErro(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Email ou senha incorretos";
  if (msg.includes("Email not confirmed")) return "Confirme seu email antes de entrar";
  if (msg.includes("Too many requests")) return "Muitas tentativas. Aguarde alguns minutos.";
  return msg;
}
