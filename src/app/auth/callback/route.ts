/**
 * Callback OAuth — Supabase redireciona pra cá após login Google/email confirm.
 * Troca o code por uma session e redireciona pra app.
 */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Verifica se user tem org; se não tem, manda pro onboarding
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberships } = await supabase
          .from("org_memberships")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1);

        if (!memberships || memberships.length === 0) {
          // OAuth signup — cria org inicial
          const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Workspace";
          const orgName = `${userName.split(" ")[0]}'s Workspace`;
          const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `org-${Date.now()}`;

          for (let i = 0; i < 5; i++) {
            const slug = i === 0 ? baseSlug : `${baseSlug}-${Math.floor(Math.random() * 9999)}`;
            const { data: org, error: orgErr } = await supabase
              .from("organizations")
              .insert({ name: orgName, slug, owner_user_id: user.id, plan: "trial" })
              .select()
              .single();

            if (!orgErr && org) {
              await supabase.from("org_memberships").insert({
                organization_id: org.id,
                user_id: user.id,
                role: "owner",
              });
              break;
            }
            if (orgErr && !orgErr.message.includes("duplicate")) break;
          }

          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
