/**
 * Asaas API client — pagamentos brasileiros (PIX + cartão recorrente).
 *
 * https://docs.asaas.com/reference/comece-por-aqui
 *
 * Setup:
 * 1. Criar conta Asaas PJ
 * 2. Aprovar PJ (3-5 dias úteis)
 * 3. Gerar API key em Configurações > Integrações
 * 4. Adicionar ASAAS_API_KEY e ASAAS_ENV nas envs (production | sandbox)
 */

function asaasBase(): string {
  const env = process.env.ASAAS_ENV ?? "sandbox";
  return env === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

function asaasKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  return key;
}

type AsaasFetchInit = Omit<RequestInit, "body"> & { body?: unknown };

async function asaasFetch<T>(path: string, init?: AsaasFetchInit): Promise<T> {
  const headers: Record<string, string> = {
    access_token: asaasKey(),
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  const rawBody = init?.body;
  const isJsonBody =
    rawBody &&
    typeof rawBody === "object" &&
    !(rawBody instanceof URLSearchParams) &&
    typeof rawBody !== "string";
  const body = isJsonBody ? JSON.stringify(rawBody) : (rawBody as BodyInit | undefined);

  const res = await fetch(`${asaasBase()}${path}`, {
    ...init,
    headers,
    body: body as BodyInit | undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asaas ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  mobilePhone?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO";
  value: number;
  nextDueDate: string;
  cycle: "MONTHLY" | "YEARLY";
  status: string;
}

/**
 * Cria customer no Asaas. Idempotente por email (se já existe, retorna existente).
 */
export async function createOrGetCustomer(args: {
  name: string;
  email: string;
  cpfCnpj?: string;
  mobilePhone?: string;
}): Promise<AsaasCustomer> {
  // Tenta encontrar
  const search = await asaasFetch<{ data: AsaasCustomer[] }>(
    `/customers?email=${encodeURIComponent(args.email)}`
  );
  if (search.data?.length) return search.data[0];

  // Cria
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: {
      name: args.name,
      email: args.email,
      cpfCnpj: args.cpfCnpj,
      mobilePhone: args.mobilePhone,
    },
  });
}

/**
 * Cria assinatura recorrente.
 */
export async function createSubscription(args: {
  customerId: string;
  value: number;
  billingType: "PIX" | "CREDIT_CARD";
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  nextDueDate?: string;
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
}): Promise<AsaasSubscription> {
  const nextDueDate =
    args.nextDueDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: {
      customer: args.customerId,
      billingType: args.billingType,
      value: args.value,
      nextDueDate,
      cycle: args.cycle,
      description: args.description,
      creditCard: args.creditCard,
      creditCardHolderInfo: args.creditCardHolderInfo,
    },
  });
}

/**
 * Cancela assinatura.
 */
export async function cancelSubscription(subscriptionId: string): Promise<{ deleted: boolean }> {
  return asaasFetch<{ deleted: boolean }>(`/subscriptions/${subscriptionId}`, {
    method: "DELETE",
  });
}

/**
 * Lista cobranças de uma assinatura.
 */
export async function listSubscriptionPayments(subscriptionId: string) {
  return asaasFetch(`/subscriptions/${subscriptionId}/payments`);
}

/**
 * Mudar valor da assinatura (upgrade/downgrade).
 */
export async function updateSubscription(args: {
  subscriptionId: string;
  value?: number;
  cycle?: "MONTHLY" | "YEARLY";
}) {
  return asaasFetch(`/subscriptions/${args.subscriptionId}`, {
    method: "POST",
    body: {
      value: args.value,
      cycle: args.cycle,
      updatePendingPayments: true,
    },
  });
}

/**
 * Mapeia plano Conteudai pra valor BRL.
 */
export const PLAN_VALUES_BRL: Record<string, number> = {
  starter: 119.99,
  light: 197,
  pro: 349.99,
  multi: 897,
  agency: 1997,
  native: 1497,
};
