/**
 * Validação e aplicação de cupons.
 */
import { createServiceClient } from "@/lib/supabase/server";

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  coupon?: {
    id: string;
    code: string;
    description: string | null;
    discount_type: "percentage" | "fixed_amount" | "free_months";
    discount_value: number;
  };
  finalValue?: number;
  discount?: number;
}

/**
 * Valida cupom e calcula valor final.
 */
export async function validateCoupon(args: {
  code: string;
  plan: string;
  baseValue: number;
  organizationId: string;
}): Promise<CouponValidation> {
  const supabase = createServiceClient();
  const code = args.code.trim().toUpperCase();

  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!coupon) return { valid: false, reason: "Cupom não encontrado" };

  // Valid_until
  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
    return { valid: false, reason: "Cupom expirou" };
  }

  // Max uses
  if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
    return { valid: false, reason: "Cupom esgotado" };
  }

  // Applies to plan
  if (coupon.applies_to_plans?.length && !coupon.applies_to_plans.includes(args.plan)) {
    return { valid: false, reason: `Cupom não vale pro plano ${args.plan}` };
  }

  // Ja usado nesta org
  const { data: alreadyUsed } = await supabase
    .from("coupon_uses")
    .select("id")
    .eq("coupon_id", coupon.id)
    .eq("organization_id", args.organizationId)
    .maybeSingle();
  if (alreadyUsed) {
    return { valid: false, reason: "Você já usou este cupom" };
  }

  // First purchase only
  if (coupon.first_purchase_only) {
    const { count } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", args.organizationId);
    if ((count ?? 0) > 0) {
      return { valid: false, reason: "Cupom apenas pra primeira compra" };
    }
  }

  // Calcula desconto
  let discount = 0;
  if (coupon.discount_type === "percentage") {
    discount = args.baseValue * (coupon.discount_value / 100);
  } else if (coupon.discount_type === "fixed_amount") {
    discount = Math.min(coupon.discount_value, args.baseValue);
  }
  // free_months não desconta valor — só registra meses grátis

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
    },
    finalValue: Math.max(0, args.baseValue - discount),
    discount,
  };
}

/**
 * Aplica cupom — registra uso + incrementa contador.
 */
export async function applyCoupon(args: {
  couponId: string;
  organizationId: string;
  subscriptionId?: string;
  discountApplied: number;
}) {
  const supabase = createServiceClient();

  await supabase.from("coupon_uses").insert({
    coupon_id: args.couponId,
    organization_id: args.organizationId,
    subscription_id: args.subscriptionId,
    discount_applied: args.discountApplied,
  });

  // Incrementa contador (race condition aceitável aqui)
  const { data: coupon } = await supabase
    .from("coupons")
    .select("current_uses")
    .eq("id", args.couponId)
    .single();
  if (coupon) {
    await supabase
      .from("coupons")
      .update({ current_uses: (coupon.current_uses ?? 0) + 1 })
      .eq("id", args.couponId);
  }
}
