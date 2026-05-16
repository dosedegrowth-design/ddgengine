/**
 * Email service via Resend.
 *
 * Setup:
 * 1. Criar conta em resend.com
 * 2. Adicionar domínio (verificação DNS)
 * 3. Gerar API key, setar RESEND_API_KEY
 * 4. EMAIL_FROM: "DDG Engine <noreply@ddgengine.com.br>"
 */

const FROM = process.env.EMAIL_FROM ?? "DDG Engine <onboarding@resend.dev>";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
  const json = await res.json();
  return { id: json.id ?? "" };
}
