"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function subscribeNewsletter(args: { orgSlug: string; email: string }) {
  const email = args.email.trim().toLowerCase();
  if (!email.includes("@")) return { error: "Email inválido" };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Newsletter ainda não configurada" };
  }

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", args.orgSlug)
    .maybeSingle();
  if (!org) return { error: "Site não encontrado" };

  // Salva inscrição em audit_log (até termos tabela dedicada)
  await supabase.from("audit_log").insert({
    organization_id: org.id,
    event_type: "newsletter_subscribed",
    event_data: { email, source: "blog_public" },
  });

  return { success: true };
}
