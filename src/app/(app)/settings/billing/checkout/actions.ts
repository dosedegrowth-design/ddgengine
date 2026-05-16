"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/auth";
import { createOrGetCustomer, createSubscription, PLAN_VALUES_BRL } from "@/lib/asaas/api";

interface CheckoutInput {
  orgId: string;
  plan: string;
  cycle: "monthly" | "annual";
  value: number;
  method: "PIX" | "CREDIT_CARD";
  cpfCnpj: string;
  mobilePhone: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone?: string;
  };
}

export async function startCheckout(input: CheckoutInput) {
  const { user, org, supabase } = await getCurrentOrg();
  if (org.id !== input.orgId) return { error: "Org não autorizada" };

  if (!PLAN_VALUES_BRL[input.plan]) return { error: "Plano inválido" };

  // 1. Cria/recupera customer no Asaas
  let customerId: string;
  try {
    const customer = await createOrGetCustomer({
      name: (user.user_metadata?.name as string) || org.name,
      email: user.email!,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
      mobilePhone: input.mobilePhone.replace(/\D/g, ""),
    });
    customerId = customer.id;
  } catch (err) {
    return { error: `Erro ao criar customer Asaas: ${err instanceof Error ? err.message : "unknown"}` };
  }

  // 2. Cria assinatura
  let subscription;
  try {
    subscription = await createSubscription({
      customerId,
      value: input.value,
      billingType: input.method,
      cycle: input.cycle === "annual" ? "YEARLY" : "MONTHLY",
      description: `DDG Engine — Plano ${input.plan}`,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
    });
  } catch (err) {
    return { error: `Erro ao criar assinatura: ${err instanceof Error ? err.message : "unknown"}` };
  }

  // 3. Salva no banco
  await supabase.from("subscriptions").upsert(
    {
      organization_id: org.id,
      provider: "asaas",
      external_id: subscription.id,
      customer_id: customerId,
      plan: input.plan,
      status: "active",
      billing_cycle: input.cycle,
      amount_brl: input.value,
      payment_method: input.method,
      next_billing_at: subscription.nextDueDate,
    },
    { onConflict: "organization_id" }
  );

  // 4. Atualiza org plan
  await supabase.from("organizations").update({ plan: input.plan, status: "active" }).eq("id", org.id);

  // 5. Audit log
  await supabase.from("audit_log").insert({
    organization_id: org.id,
    event_type: "subscription_created",
    event_data: {
      plan: input.plan,
      cycle: input.cycle,
      value: input.value,
      method: input.method,
      external_id: subscription.id,
    },
  });

  revalidatePath("/settings/billing");
  revalidatePath("/dashboard");
  return { success: true, subscriptionId: subscription.id };
}
