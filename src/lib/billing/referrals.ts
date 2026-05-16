/**
 * Sistema de referrals.
 *
 * Fluxo:
 * 1. Cliente A gera referral_code dele
 * 2. Compartilha link: dominio/signup?ref=ABCD1234
 * 3. Cliente B cadastra usando o código
 * 4. Quando B converte (paga primeira fatura), A ganha 1 mês free
 * 5. B também ganha 1 mês free na primeira mensalidade
 */
import { createServiceClient } from "@/lib/supabase/server";

export async function getOrCreateReferralCode(orgId: string): Promise<string> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("referrals")
    .select("referral_code")
    .eq("referrer_org_id", orgId)
    .eq("status", "pending")
    .is("referred_org_id", null)
    .maybeSingle();

  if (existing) return existing.referral_code;

  // Gera código via RPC
  const { data: rpc } = await supabase.rpc("generate_referral_code");
  const code = (rpc as string) ?? Math.random().toString(36).slice(2, 10).toUpperCase();

  await supabase.from("referrals").insert({
    referrer_org_id: orgId,
    referral_code: code,
    status: "pending",
  });

  return code;
}

export async function getReferralStats(orgId: string) {
  const supabase = createServiceClient();
  const { data: referrals } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_org_id", orgId);

  const list = referrals ?? [];
  return {
    code: list.find((r: any) => r.status === "pending" && !r.referred_org_id)?.referral_code ?? null,
    total: list.length,
    signed_up: list.filter((r: any) => r.status === "signed_up").length,
    converted: list.filter((r: any) => r.status === "converted" || r.status === "rewarded").length,
    rewarded: list.filter((r: any) => r.status === "rewarded").length,
    referrals: list,
  };
}

export async function attachReferralOnSignup(referralCode: string, newOrgId: string) {
  const supabase = createServiceClient();

  const { data: referral } = await supabase
    .from("referrals")
    .select("*")
    .eq("referral_code", referralCode.toUpperCase())
    .eq("status", "pending")
    .is("referred_org_id", null)
    .maybeSingle();

  if (!referral) return null;

  await supabase
    .from("referrals")
    .update({
      referred_org_id: newOrgId,
      status: "signed_up",
      signed_up_at: new Date().toISOString(),
    })
    .eq("id", referral.id);

  return referral;
}

export async function markReferralConverted(referredOrgId: string) {
  const supabase = createServiceClient();
  await supabase
    .from("referrals")
    .update({
      status: "converted",
      converted_at: new Date().toISOString(),
    })
    .eq("referred_org_id", referredOrgId)
    .eq("status", "signed_up");
}
