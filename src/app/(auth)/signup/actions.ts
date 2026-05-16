"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // Se confirmação por email estiver desabilitada, user já é criado.
  // Cria organization + membership.
  if (data.user) {
    await criarOrganizacaoInicial(supabase, data.user.id, name);
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

async function criarOrganizacaoInicial(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userName: string
) {
  const orgName = `${userName.split(" ")[0]}'s Workspace`;
  const baseSlug = slugify(orgName) || `org-${Date.now()}`;

  // Tenta criar com slug único (até 5 tentativas com sufixo)
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? baseSlug : `${baseSlug}-${Math.floor(Math.random() * 9999)}`;
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        slug,
        owner_user_id: userId,
        plan: "trial",
      })
      .select()
      .single();

    if (!error && org) {
      // Cria membership
      await supabase.from("org_memberships").insert({
        organization_id: org.id,
        user_id: userId,
        role: "owner",
      });
      return org;
    }

    if (error && !error.message.includes("duplicate")) {
      console.error("Erro ao criar org:", error);
      return null;
    }
  }
  return null;
}

function traduzirErro(msg: string): string {
  if (msg.includes("User already registered")) return "Email já cadastrado. Tente entrar.";
  if (msg.includes("Password should be")) return "Senha muito fraca";
  if (msg.includes("Invalid email")) return "Email inválido";
  return msg;
}
