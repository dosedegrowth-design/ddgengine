"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export async function signupWithEmail(formData: FormData) {
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!name || !email || !password) {
    return { error: "Preencha todos os campos" };
  }

  if (password.length < 8) {
    return { error: "Senha deve ter no mínimo 8 caracteres" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: traduzirErro(error.message) };
  }

  // Cria org + membership via SERVICE ROLE (bypass RLS).
  // O user pode estar com sessão ainda não-ativa (email confirmation),
  // ou com sessão recém-criada — em ambos casos service role é seguro
  // porque só rodamos isso uma vez no signup.
  if (data.user) {
    await criarOrganizacaoInicial(data.user.id, name);
  }

  revalidatePath("/", "layout");

  // Se email confirmation está ativo, session será null aqui — manda pro login
  // com mensagem explicativa. Senão, manda pro onboarding direto.
  if (!data.session) {
    redirect("/login?confirmed=pending");
  }

  redirect("/onboarding");
}

async function criarOrganizacaoInicial(userId: string, userName: string) {
  // Usa service role pra bypass RLS — só rodamos no signup
  const admin = createServiceClient();

  const orgName = `${userName.split(" ")[0]}'s Workspace`;
  const baseSlug = slugify(orgName) || `org-${Date.now()}`;

  // Tenta criar com slug único (até 5 tentativas com sufixo)
  for (let i = 0; i < 5; i++) {
    const slug =
      i === 0 ? baseSlug : `${baseSlug}-${Math.floor(Math.random() * 9999)}`;
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: org, error } = await admin
      .from("organizations")
      .insert({
        name: orgName,
        slug,
        owner_user_id: userId,
        plan: "trial",
        status: "active",
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single();

    if (!error && org) {
      const { error: memErr } = await admin.from("org_memberships").insert({
        organization_id: org.id,
        user_id: userId,
        role: "owner",
      });
      if (memErr) {
        console.error("[signup] erro ao criar membership:", JSON.stringify({
          message: memErr.message,
          code: memErr.code,
          details: memErr.details,
          hint: memErr.hint,
        }));
      }
      return org;
    }

    if (error && !error.message.includes("duplicate")) {
      console.error("[signup] erro ao criar org:", JSON.stringify({
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        slug,
        userId,
      }));
      return null;
    }
  }
  console.error("[signup] não foi possível criar org após 5 tentativas");
  return null;
}

function traduzirErro(msg: string): string {
  if (msg.includes("User already registered")) return "Email já cadastrado. Tente entrar.";
  if (msg.includes("Password should be")) return "Senha muito fraca";
  if (msg.includes("Invalid email")) return "Email inválido";
  return msg;
}
