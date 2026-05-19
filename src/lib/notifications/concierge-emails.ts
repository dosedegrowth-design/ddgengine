/**
 * Emails do fluxo de concierge — equipe DDG configura domínio pelo cliente.
 *
 *  - sendConciergeRequestedToTeam: alerta a equipe (suporte@dosedegrowth.com.br)
 *    com TODO o contexto do cliente (org, domain, contato, ticket id)
 *  - sendConciergeConfirmationToClient: confirma pro cliente que recebemos
 *    o pedido + prazo de 24h
 */
import { sendEmail } from "@/lib/email/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://conteudai.com.br";
const TEAM_EMAIL = process.env.SUPPORT_TEAM_EMAIL ?? "suporte@dosedegrowth.com.br";

interface TeamArgs {
  ticketId: string;
  orgName: string;
  orgId: string;
  domain: string;
  contactEmail: string;
  contactPhone: string;
  message: string;
}

export async function sendConciergeRequestedToTeam(args: TeamArgs): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const adminUrl = `${APP_URL}/admin/tickets/${args.ticketId}`;
  const text = `Novo pedido de concierge — integração de domínio

Cliente: ${args.orgName}
Domínio: ${args.domain}
Contato: ${args.contactEmail} · ${args.contactPhone}
Ticket ID: ${args.ticketId}

Mensagem do cliente:
${args.message || "(sem mensagem adicional)"}

Próximos passos:
1. Abrir o painel /admin/tickets/${args.ticketId}
2. Confirmar acesso ao registrador do cliente
3. Trocar nameservers + verificar propagação
4. Marcar como 'resolved' quando o blog estiver no ar

Painel: ${adminUrl}`;

  await sendEmail({
    to: TEAM_EMAIL,
    subject: `[Concierge] ${args.orgName} pediu ajuda na integração de ${args.domain}`,
    text,
    html: `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:-apple-system,sans-serif;background:#f5f5f0;color:#0a0a0a;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="font-family:ui-monospace,monospace;font-size:11px;color:#fff;background:#c8ff3d;color:#0a0a0a;display:inline-block;padding:6px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:16px;">
    [ NOVO TICKET · CONCIERGE ]
  </div>
  <h1 style="font-size:24px;font-weight:900;margin:0 0 16px;letter-spacing:-0.02em;">
    ${args.orgName} pediu ajuda
  </h1>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
    <tr><td style="padding:8px 0;color:#737373;width:120px;">Domínio</td><td style="padding:8px 0;font-weight:600;">${args.domain}</td></tr>
    <tr><td style="padding:8px 0;color:#737373;">Contato email</td><td style="padding:8px 0;"><a href="mailto:${args.contactEmail}" style="color:#0a0a0a;">${args.contactEmail}</a></td></tr>
    <tr><td style="padding:8px 0;color:#737373;">WhatsApp</td><td style="padding:8px 0;"><a href="https://wa.me/${args.contactPhone.replace(/\D/g, "")}" style="color:#0a0a0a;">${args.contactPhone}</a></td></tr>
    <tr><td style="padding:8px 0;color:#737373;">Ticket</td><td style="padding:8px 0;font-family:monospace;font-size:12px;">${args.ticketId}</td></tr>
  </table>
  ${args.message ? `<div style="background:#fff;border:2px solid #e7e5e4;border-radius:8px;padding:16px;font-size:14px;color:#404040;margin-bottom:24px;"><strong>Mensagem do cliente:</strong><br>${args.message.replace(/\n/g, "<br>")}</div>` : ""}
  <a href="${adminUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px;text-decoration:none;">
    Abrir ticket no painel
  </a>
</div></body></html>`,
  });
}

interface ClientArgs {
  toEmail: string;
  orgName: string;
  domain: string;
  ticketId: string;
}

export async function sendConciergeConfirmationToClient(args: ClientArgs): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const ticketUrl = `${APP_URL}/tickets/${args.ticketId}`;

  const text = `Recebemos seu pedido!

A equipe DDG vai configurar a integração de ${args.domain} pra você em até 24h úteis.

Você vai receber um email confirmando quando estiver tudo pronto.
Se precisarmos de alguma informação adicional, entraremos em contato pelo
WhatsApp ou email cadastrados.

Acompanhar o pedido (sem precisar logar):
${ticketUrl}

Ticket: ${args.ticketId}

Time Conteudai.`;

  await sendEmail({
    to: args.toEmail,
    subject: `Recebemos seu pedido — configuração de ${args.domain} em até 24h`,
    text,
    html: `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:-apple-system,sans-serif;background:#f5f5f0;color:#0a0a0a;margin:0;padding:0;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="font-family:ui-monospace,monospace;font-size:11px;background:#0a0a0a;color:#c8ff3d;display:inline-block;padding:6px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:24px;">
    [ PEDIDO RECEBIDO ]
  </div>
  <h1 style="font-size:32px;font-weight:900;line-height:1.2;margin:0 0 16px;letter-spacing:-0.02em;">
    Pode relaxar — a gente cuida disso.
  </h1>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#404040;">
    A equipe DDG vai configurar a integração de <strong>${args.domain}</strong>
    pra você em até <strong>24h úteis</strong>.
  </p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#404040;">
    Você vai receber um email confirmando quando estiver tudo pronto. Se
    precisarmos de informação adicional, falamos com você pelo WhatsApp ou
    email cadastrados.
  </p>
  <a href="${ticketUrl}" style="display:inline-block;background:#c8ff3d;color:#0a0a0a;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px;border:2px solid #0a0a0a;box-shadow:3px 3px 0 #0a0a0a;text-decoration:none;margin-bottom:20px;">
    Acompanhar seu pedido →
  </a>
  <div style="background:#fff;border:2px solid #c8ff3d;border-radius:8px;padding:16px;font-size:13px;color:#525252;margin-top:8px;">
    <strong style="color:#0a0a0a;">Seu ticket:</strong>
    <code style="font-family:monospace;color:#0a0a0a;">${args.ticketId}</code>
  </div>
  <p style="font-size:12px;color:#737373;margin:32px 0 0;">
    <strong style="color:#0a0a0a;">Time Conteudai</strong>
  </p>
</div></body></html>`,
  });
}
