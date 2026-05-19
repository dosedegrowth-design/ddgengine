/**
 * Emails de mudança de status do ticket — disparados pelo admin panel.
 *
 * Fluxo:
 *   admin muda status no painel  →  updateTicketStatus()  →
 *   sendTicketStatusEmail(ticket, transition)  →  Resend
 *
 * Política:
 *  - Só notifica CLIENTE (TEAM já vê tudo no /admin/tickets)
 *  - Só dispara em transições "úteis" pro cliente (não em toda flutuação)
 *  - Conteúdo varia por tipo de ticket (domain_integration tem mensagens específicas)
 *  - Fire-and-forget — falha de email NUNCA bloqueia a mutação do ticket
 */
import { sendEmail } from "@/lib/email/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://conteudai.com.br";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Conteudai";

interface SendTicketStatusEmailArgs {
  toEmail: string;
  orgName: string;
  ticketId: string;
  ticketType: string;
  fromStatus: string;
  toStatus: string;
  /** Optional context fields. */
  domain?: string;
  note?: string;
}

/**
 * Dispara email pro cliente sobre mudança de status do ticket.
 * Retorna `false` se a transição não justifica email (sem ruído).
 */
export async function sendTicketStatusEmail(
  args: SendTicketStatusEmailArgs
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  if (!args.toEmail) return false;

  const template = pickTemplate(args);
  if (!template) return false;

  try {
    await sendEmail({
      to: args.toEmail,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    return true;
  } catch (err) {
    // Fire-and-forget — log e segue
    console.warn(
      "[ticket-status-email] falha:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

interface TemplatePayload {
  subject: string;
  html: string;
  text: string;
}

function pickTemplate(args: SendTicketStatusEmailArgs): TemplatePayload | null {
  const { toStatus, fromStatus, ticketType, domain, orgName, ticketId, note } =
    args;

  // Transições que NÃO disparam email
  const skipTransitions = [
    "open->open",
    "in_progress->in_progress",
    "resolved->in_progress", // reabrir não notifica (admin tava só corrigindo)
    "cancelled->open",
    "cancelled->in_progress",
  ];
  if (skipTransitions.includes(`${fromStatus}->${toStatus}`)) return null;

  const isIntegration = ticketType === "domain_integration";

  if (toStatus === "in_progress") {
    return integrationTemplate({
      mode: "in_progress",
      orgName,
      domain,
      ticketId,
      isIntegration,
    });
  }
  if (toStatus === "waiting_client") {
    return integrationTemplate({
      mode: "waiting_client",
      orgName,
      domain,
      ticketId,
      isIntegration,
      note,
    });
  }
  if (toStatus === "resolved") {
    return integrationTemplate({
      mode: "resolved",
      orgName,
      domain,
      ticketId,
      isIntegration,
    });
  }
  if (toStatus === "cancelled") {
    return integrationTemplate({
      mode: "cancelled",
      orgName,
      domain,
      ticketId,
      isIntegration,
      note,
    });
  }

  return null;
}

interface TemplateBuildArgs {
  mode: "in_progress" | "waiting_client" | "resolved" | "cancelled";
  isIntegration: boolean;
  orgName: string;
  domain?: string;
  ticketId: string;
  note?: string;
}

function integrationTemplate(b: TemplateBuildArgs): TemplatePayload {
  const what = b.isIntegration
    ? b.domain
      ? `a configuração de ${b.domain}`
      : "seu pedido de integração"
    : "seu pedido";

  const tickerUrl = `${APP_URL}/settings/integration`;

  switch (b.mode) {
    case "in_progress":
      return {
        subject: `Começamos ${b.isIntegration ? "a configurar" : "a cuidar"} ${b.domain ?? "do seu pedido"}`,
        text: `Oi, ${b.orgName}!

A equipe ${APP_NAME} pegou ${what}. A partir de agora estamos cuidando de tudo.

Você vai receber um email assim que finalizarmos${b.isIntegration ? " (geralmente em 24h úteis)" : ""}.

Acompanhar: ${tickerUrl}

Ticket: ${b.ticketId}
Time ${APP_NAME}.`,
        html: emailShell({
          chip: "[ EM ANDAMENTO ]",
          chipBg: "#0a0a0a",
          chipColor: "#c8ff3d",
          headline: `Pegamos ${b.isIntegration ? b.domain ?? "seu pedido" : "seu pedido"}.`,
          body: `<p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#404040;">
A equipe <strong style="color:#0a0a0a;">${APP_NAME}</strong> tá cuidando ${what.replace(/&/g, "&amp;")}${b.isIntegration ? " — você não precisa fazer mais nada" : ""}.
</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#404040;">
Vamos te avisar por email assim que finalizarmos${b.isIntegration ? " (normalmente em 24h úteis)" : ""}.
</p>`,
          cta: { label: "Acompanhar pedido", href: tickerUrl },
          ticketId: b.ticketId,
        }),
      };

    case "waiting_client":
      return {
        subject: `Precisamos de uma info sua — ${b.domain ?? "seu pedido"}`,
        text: `Oi, ${b.orgName}!

A gente tá quase finalizando ${what}, mas precisa de uma informação sua antes de continuar.${b.note ? `\n\n"${b.note}"\n` : ""}

Responde esse email ou nos chama no WhatsApp pra gente seguir.

Ticket: ${b.ticketId}
Time ${APP_NAME}.`,
        html: emailShell({
          chip: "[ AGUARDANDO INFO ]",
          chipBg: "#fef3c7",
          chipColor: "#92400e",
          headline: "A gente precisa de uma info sua.",
          body: `<p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#404040;">
Tamos quase finalizando ${what}, mas falta uma informação sua antes de seguir.
</p>${b.note ? `<div style="background:#fffbeb;border:2px solid #fde68a;border-radius:8px;padding:16px;font-size:14px;color:#92400e;margin-bottom:24px;">
<strong style="color:#78350f;">Pedido do time:</strong><br>${b.note.replace(/\n/g, "<br>").replace(/</g, "&lt;")}
</div>` : ""}<p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#737373;">
Responde esse email ou chama no WhatsApp pra seguirmos.
</p>`,
          cta: { label: "Abrir pedido", href: tickerUrl },
          ticketId: b.ticketId,
        }),
      };

    case "resolved":
      if (b.isIntegration && b.domain) {
        const blogUrl = `https://${b.domain}/blog`;
        return {
          subject: `🎉 Pronto! ${b.domain}/blog está no ar`,
          text: `Pronto, ${b.orgName}!

Configuramos ${b.domain} e seu blog tá ativo em:
${blogUrl}

A partir de agora todo conteúdo gerado no ${APP_NAME} publica direto ali, no seu domínio próprio.

Qualquer dúvida, responde esse email.

Ticket: ${b.ticketId}
Time ${APP_NAME}.`,
          html: emailShell({
            chip: "[ TUDO PRONTO ]",
            chipBg: "#c8ff3d",
            chipColor: "#0a0a0a",
            headline: "Seu blog tá no ar.",
            body: `<p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#404040;">
Configuramos <strong style="color:#0a0a0a;">${b.domain}</strong> e seu blog tá ativo em:
</p>
<a href="${blogUrl}" style="display:inline-block;font-family:ui-monospace,monospace;font-size:15px;color:#0a0a0a;background:#c8ff3d;border:2px solid #0a0a0a;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;margin-bottom:24px;">
${b.domain}/blog →
</a>
<p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#525252;">
A partir de agora todo conteúdo gerado no ${APP_NAME} publica direto ali, no seu domínio próprio.
</p>`,
            cta: { label: "Abrir painel", href: APP_URL + "/dashboard" },
            ticketId: b.ticketId,
          }),
        };
      }
      return {
        subject: `Resolvido — ${b.orgName}`,
        text: `Oi, ${b.orgName}!

Concluímos ${what}. Qualquer dúvida, responde esse email.

Ticket: ${b.ticketId}
Time ${APP_NAME}.`,
        html: emailShell({
          chip: "[ RESOLVIDO ]",
          chipBg: "#c8ff3d",
          chipColor: "#0a0a0a",
          headline: "Tá resolvido.",
          body: `<p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#404040;">
Concluímos ${what}. Qualquer dúvida, responde esse email direto.
</p>`,
          cta: { label: "Abrir painel", href: APP_URL + "/dashboard" },
          ticketId: b.ticketId,
        }),
      };

    case "cancelled":
      return {
        subject: `Cancelamos seu pedido — ${b.orgName}`,
        text: `Oi, ${b.orgName}!

Seu pedido foi cancelado.${b.note ? `\n\nMotivo: ${b.note}\n` : ""}
Se foi engano ou você quer retomar, responde esse email.

Ticket: ${b.ticketId}
Time ${APP_NAME}.`,
        html: emailShell({
          chip: "[ CANCELADO ]",
          chipBg: "#e7e5e4",
          chipColor: "#525252",
          headline: "Cancelamos seu pedido.",
          body: `<p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#404040;">
${what.charAt(0).toUpperCase() + what.slice(1)} foi cancelado${b.note ? "" : "."}
</p>${b.note ? `<div style="background:#fff;border:2px solid #e7e5e4;border-radius:8px;padding:16px;font-size:14px;color:#404040;margin-bottom:24px;">
<strong style="color:#0a0a0a;">Motivo:</strong><br>${b.note.replace(/\n/g, "<br>").replace(/</g, "&lt;")}
</div>` : ""}<p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#525252;">
Se foi engano ou você quer retomar, responde esse email direto.
</p>`,
          cta: { label: "Falar com a equipe", href: tickerUrl },
          ticketId: b.ticketId,
        }),
      };
  }
}

interface ShellArgs {
  chip: string;
  chipBg: string;
  chipColor: string;
  headline: string;
  body: string;
  cta: { label: string; href: string };
  ticketId: string;
}

function emailShell(s: ShellArgs): string {
  return `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f4ef;color:#0a0a0a;margin:0;padding:0;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="font-family:ui-monospace,monospace;font-size:11px;background:${s.chipBg};color:${s.chipColor};display:inline-block;padding:6px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:24px;">
    ${s.chip}
  </div>
  <h1 style="font-size:30px;font-weight:900;line-height:1.15;margin:0 0 20px;letter-spacing:-0.02em;color:#0a0a0a;">
    ${s.headline}
  </h1>
  ${s.body}
  <a href="${s.cta.href}" style="display:inline-block;background:#0a0a0a;color:#ffffff;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px;text-decoration:none;margin-bottom:32px;">
    ${s.cta.label}
  </a>
  <div style="border-top:1px solid #e7e5e4;padding-top:16px;font-size:11px;color:#737373;font-family:ui-monospace,monospace;">
    Ticket <span style="color:#0a0a0a;">${s.ticketId.slice(0, 8)}</span> · Time ${APP_NAME}
  </div>
</div></body></html>`;
}
