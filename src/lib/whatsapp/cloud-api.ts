/**
 * WhatsApp Cloud API direct integration (Meta, sem BSP).
 *
 * Setup necessário:
 * 1. Criar Meta Business Manager
 * 2. Criar app no developers.facebook.com com WhatsApp product
 * 3. Verificar phone number
 * 4. Criar templates (post_pra_aprovar, post_publicado, relatorio_mensal)
 * 5. Submeter ao Meta pra aprovação (1-3 dias)
 * 6. Adicionar WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN nas envs
 */

const WA_BASE = "https://graph.facebook.com/v21.0";

function creds() {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN não configurados");
  }
  return { phoneId, token };
}

interface SendTemplateInput {
  to: string; // E.164 sem +, ex: 5511999998888
  templateName: string;
  languageCode?: string;
  components?: WhatsAppTemplateComponent[];
}

export interface WhatsAppTemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: "quick_reply" | "url";
  index?: number;
  parameters?: Array<
    | { type: "text"; text: string }
    | { type: "payload"; payload: string }
    | { type: "image"; image: { link: string } }
  >;
}

/**
 * Envia template aprovado pelo Meta pro destinatário.
 */
export async function sendTemplate(input: SendTemplateInput): Promise<{ wa_message_id: string }> {
  const { phoneId, token } = creds();

  const body = {
    messaging_product: "whatsapp",
    to: normalizeBR(input.to),
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode ?? "pt_BR" },
      components: input.components ?? [],
    },
  };

  const res = await fetch(`${WA_BASE}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp send error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return { wa_message_id: json.messages?.[0]?.id ?? "" };
}

/**
 * Envia mensagem de texto livre (apenas se cliente respondeu nas últimas 24h).
 */
export async function sendText(to: string, text: string): Promise<{ wa_message_id: string }> {
  const { phoneId, token } = creds();

  const res = await fetch(`${WA_BASE}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizeBR(to),
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) throw new Error(`WhatsApp send text ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { wa_message_id: json.messages?.[0]?.id ?? "" };
}

/**
 * Normaliza número BR pra E.164 sem +.
 */
export function normalizeBR(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  // Se começa com 0, remove
  if (clean.startsWith("0")) clean = clean.slice(1);
  // Se não tem código país (10-11 dígitos), adiciona 55
  if (clean.length === 10 || clean.length === 11) clean = "55" + clean;
  return clean;
}

/**
 * Verifica webhook (challenge GET).
 */
export function verifyWebhook(mode: string, token: string, challenge: string): string | null {
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && token === expectedToken) {
    return challenge;
  }
  return null;
}
