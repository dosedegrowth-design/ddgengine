/**
 * Helpers de autenticação server-side.
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { user, supabase };
}

export async function getCurrentOrg() {
  const { user, supabase } = await requireUser();

  const { data: memberships } = await supabase
    .from("org_memberships")
    .select(
      "organization_id, role, organizations(id, name, slug, plan, status, trial_ends_at, trial_expired_at, cancelled_at)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  const membership = memberships?.[0];
  if (!membership || !membership.organizations) {
    redirect("/onboarding");
  }

  return {
    user,
    supabase,
    org: membership.organizations as unknown as {
      id: string;
      name: string;
      slug: string;
      plan: string;
      status: string;
      trial_ends_at: string;
      trial_expired_at: string | null;
      cancelled_at: string | null;
    },
    role: membership.role,
  };
}

export async function getCurrentSite() {
  const { org, supabase, user } = await getCurrentOrg();

  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: true })
    .limit(1);

  return {
    user,
    supabase,
    org,
    site: sites?.[0] ?? null,
  };
}
