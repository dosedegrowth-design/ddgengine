/**
 * Sistema de afiliados (referrals) — comissionamento recorrente.
 *
 * REGRA:
 * 1. Cada org tem 1 referral_code único (gerado por trigger no INSERT).
 * 2. User compartilha link: dominio/signup?ref=ABCD1234
 * 3. Indicado se cadastra → attachReferralOnSignup() liga o code à nova org
 * 4. Em cada pagamento do indicado, recordCommission() cria 1 linha
 *    em referral_commissions com valor = pago × pct% (pct parametrizável)
 * 5. Indicador acumula saldo, solicita saque, recebe via Pix.
 *
 * Parâmetros do programa (env vars — defaults conservadores):
 *   REFERRAL_COMMISSION_PCT       — % do MRR (default 0 = inativo)
 *   REFERRAL_COMMISSION_MONTHS    — qtd de meses pagando (default 12)
 *
 * Enquanto PCT=0, coletamos indicações + conversões mas não geramos R$.
 * Assim que o programa for ativado, atualizamos a env e funciona retroativo.
 */
import { createServiceClient } from "@/lib/supabase/server";

/** % da comissão (0-100). 0 = programa inativo. */
export function getCommissionPct(): number {
  const raw = process.env.REFERRAL_COMMISSION_PCT ?? "0";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0;
}

/** Quantos meses de comissão por indicado (após primeiro pagamento). */
export function getCommissionMonths(): number {
  const raw = process.env.REFERRAL_COMMISSION_MONTHS ?? "12";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 12;
}

export function isReferralProgramActive(): boolean {
  return getCommissionPct() > 0;
}

/**
 * Retorna o referral_code "pessoal" da org (status=pending, sem indicado ainda).
 * Trigger já cria automaticamente no INSERT; backfill garantiu pras orgs antigas.
 */
export async function getOrCreateReferralCode(orgId: string): Promise<string> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("referrals")
    .select("referral_code")
    .eq("referrer_org_id", orgId)
    .eq("status", "pending")
    .is("referred_org_id", null)
    .maybeSingle();

  if (existing?.referral_code) return existing.referral_code;

  // Fallback: gera via RPC e insere (não deveria cair aqui se trigger funcionou)
  const { data: rpcCode } = await supabase.rpc("generate_referral_code");
  const code = (rpcCode as string | null) ?? Math.random().toString(36).slice(2, 10).toUpperCase();

  await supabase.from("referrals").insert({
    referrer_org_id: orgId,
    referral_code: code,
    status: "pending",
  });

  return code;
}

/**
 * Stats agregadas pra UI: total indicados, convertidos, saldo total.
 */
export async function getReferralStats(orgId: string) {
  const supabase = createServiceClient();

  // Indicados (referrals com referred_org_id setado)
  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, referral_code, status, signed_up_at, converted_at, referred_org_id, created_at")
    .eq("referrer_org_id", orgId)
    .order("created_at", { ascending: false });

  const list = referrals ?? [];
  const personalCode = list.find((r) => r.status === "pending" && !r.referred_org_id);
  const indications = list.filter((r) => r.referred_org_id);

  // Comissões agregadas por status
  const { data: commissions } = await supabase
    .from("referral_commissions")
    .select("status, commission_amount_cents, payment_paid_at, payment_amount_cents")
    .eq("referrer_org_id", orgId);

  const commList = commissions ?? [];
  const totalEarnedCents = commList
    .filter((c) => c.status !== "cancelled")
    .reduce((sum, c) => sum + (c.commission_amount_cents ?? 0), 0);
  const availableCents = commList
    .filter((c) => c.status === "available")
    .reduce((sum, c) => sum + (c.commission_amount_cents ?? 0), 0);
  const pendingCents = commList
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + (c.commission_amount_cents ?? 0), 0);
  const paidOutCents = commList
    .filter((c) => c.status === "paid_out")
    .reduce((sum, c) => sum + (c.commission_amount_cents ?? 0), 0);

  return {
    code: personalCode?.referral_code ?? null,
    total: indications.length,
    signed_up: indications.filter((r) => r.status === "signed_up").length,
    converted: indications.filter(
      (r) => r.status === "converted" || r.status === "rewarded"
    ).length,
    referrals: indications,
    commissions: commList,
    totalEarnedCents,
    availableCents,
    pendingCents,
    paidOutCents,
  };
}

/**
 * Chamado no signup quando o user veio com ?ref=CODE.
 * Liga o code à nova org como "indicado".
 */
export async function attachReferralOnSignup(referralCode: string, newOrgId: string) {
  const supabase = createServiceClient();

  const code = referralCode.trim().toUpperCase();
  if (!code) return null;

  // Acha o referral_code "pessoal" do indicador
  const { data: referral } = await supabase
    .from("referrals")
    .select("*")
    .eq("referral_code", code)
    .eq("status", "pending")
    .is("referred_org_id", null)
    .maybeSingle();

  if (!referral) return null;
  // Não permite auto-indicação
  if (referral.referrer_org_id === newOrgId) return null;

  await supabase
    .from("referrals")
    .update({
      referred_org_id: newOrgId,
      status: "signed_up",
      signed_up_at: new Date().toISOString(),
    })
    .eq("id", referral.id);

  // Cria novo código pessoal pro indicador (o antigo virou um registro de indicação)
  const { data: rpcCode } = await supabase.rpc("generate_referral_code");
  const newCode = (rpcCode as string | null) ?? Math.random().toString(36).slice(2, 10).toUpperCase();
  await supabase.from("referrals").insert({
    referrer_org_id: referral.referrer_org_id,
    referral_code: newCode,
    status: "pending",
  });

  return referral;
}

/**
 * Marca indicação como "converted" quando o indicado faz primeiro pagamento.
 * Idempotente — chama múltiplas vezes não duplica.
 */
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

/**
 * Registra 1 comissão pro indicador quando o indicado paga.
 * Chamado pelo webhook Asaas/Stripe em PAYMENT_CONFIRMED.
 *
 * Respeita REFERRAL_COMMISSION_MONTHS: se já existem N pagamentos do
 * indicado registrados, novos pagamentos não geram mais comissão.
 *
 * Se REFERRAL_COMMISSION_PCT=0 (programa inativo), não cria comissão.
 */
export async function recordCommission(args: {
  referredOrgId: string;
  paymentId: string;
  amountCents: number;
  paidAt: string;
}) {
  const pct = getCommissionPct();
  if (pct <= 0) return { skipped: true, reason: "program_inactive" as const };

  const supabase = createServiceClient();

  // Acha o referral correspondente
  const { data: referral } = await supabase
    .from("referrals")
    .select("id, referrer_org_id, referred_org_id, status")
    .eq("referred_org_id", args.referredOrgId)
    .in("status", ["signed_up", "converted", "rewarded"])
    .maybeSingle();
  if (!referral) return { skipped: true, reason: "no_referral" as const };

  // Idempotência: se já existe commission pra esse payment_id, pula
  const { data: existing } = await supabase
    .from("referral_commissions")
    .select("id")
    .eq("source_payment_id", args.paymentId)
    .maybeSingle();
  if (existing) return { skipped: true, reason: "already_recorded" as const };

  // Respeita limite de meses (count de commissions já existentes pro referral)
  const maxMonths = getCommissionMonths();
  const { count: existingCount } = await supabase
    .from("referral_commissions")
    .select("*", { count: "exact", head: true })
    .eq("referral_id", referral.id)
    .neq("status", "cancelled");
  if ((existingCount ?? 0) >= maxMonths) {
    return { skipped: true, reason: "max_months_reached" as const };
  }

  // Calcula valor da comissão
  const commissionCents = Math.round(args.amountCents * (pct / 100));

  const { data: inserted, error } = await supabase
    .from("referral_commissions")
    .insert({
      referral_id: referral.id,
      referrer_org_id: referral.referrer_org_id,
      referred_org_id: referral.referred_org_id!,
      source_payment_id: args.paymentId,
      payment_amount_cents: args.amountCents,
      payment_paid_at: args.paidAt,
      commission_pct: pct,
      commission_amount_cents: commissionCents,
      status: "available", // já entra disponível pro saque
    })
    .select("id")
    .single();

  if (error) {
    console.error("[recordCommission] erro:", error.message);
    return { skipped: true, reason: "db_error" as const };
  }

  // Primeira commission do referral → marca como "converted"
  if ((existingCount ?? 0) === 0) {
    await markReferralConverted(args.referredOrgId);
  }

  return { recorded: true, commissionId: inserted.id, amountCents: commissionCents };
}
