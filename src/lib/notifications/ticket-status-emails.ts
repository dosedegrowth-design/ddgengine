/**
 * Emails de mudança de status do ticket — disparados pelo admin panel.
 *
 * Fluxo:
 *   admin muda status no painel  →  updateTicketStatus()  →
 *   sendTicketStatusEmail(...)        →  Resend (CLIENTE)
 *   sendTicketStatusToTeam(...)       →  Resend (TIME DDG)
 *
 * Política:
 *  - CLIENTE: mensagens curativas, só em transições "úteis" (skip no-op
 *    e voltas pra atrás)
 *  - TIME: log compacto pra inbox compartilhada — sabe quem mudou o quê
 *    e o que aconteceu, com link direto pro /admin/tickets/{id}
 *  - Fire-and-forget — falha de email NUNCA bloqueia a mutação do ticket
 */
import { sendEmail } from "@/lib/email/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://conteudai.com.br";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Conteudai";
const TEAM_EMAIL =
  process.env.SUPPORT_TEAM_EMAIL ?? "suporte@dosedegrowth.com.br";

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

  // URL pública do ticket — cliente NÃO precisa estar logado
  const tickerUrl = `${APP_URL}/tickets/${b.ticketId}`;

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
        const blogUrl = `https://blog.${b.domain}`;
        return {
          subject: `🎉 Pronto! blog.${b.domain} está no ar`,
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
blog.${b.domain} →
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

/**
 * Notificações internas pro time DDG.
 * Diferente do email do cliente (curativo, sucinto), este aqui é um log
 * compacto pra inbox compartilhada do suporte.
 */
const TEAM_EVENT_LABEL: Record<string, string> = {
  status_change: "STATUS MUDOU",
  assigned: "ATRIBUÍDO",
  note_added: "NOVA NOTA",
};

const STATUS_LABEL_TEAM: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_client: "Aguardando cliente",
  resolved: "Resolvido",
  cancelled: "Cancelado",
};

interface TicketTeamArgs {
  ticketId: string;
  orgName: string;
  domain?: string;
  ticketType: string;
  /** Quem fez a ação — email do admin. */
  actor: string;
  /** Email do cliente cadastrado no ticket (pra contexto). */
  contactEmail?: string | null;
  contactPhone?: string | null;
}

interface StatusChangeArgs extends TicketTeamArgs {
  event: "status_change";
  fromStatus: string;
  toStatus: string;
}

interface AssignedArgs extends TicketTeamArgs {
  event: "assigned";
  fromAssignee: string | null;
  toAssignee: string | null;
}

interface NoteAddedArgs extends TicketTeamArgs {
  event: "note_added";
  noteText: string;
}

type TicketTeamEventArgs = StatusChangeArgs | AssignedArgs | NoteAddedArgs;

/**
 * Envia notificação pro time DDG sobre evento no ticket.
 * Retorna `false` se não disparou (sem RESEND_API_KEY, sem TEAM_EMAIL, ou
 * transição cosmética).
 */
export async function sendTicketStatusToTeam(
  args: TicketTeamEventArgs
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  if (!TEAM_EMAIL) return false;

  // Skip eventos sem interesse pro time
  if (args.event === "status_change") {
    // Mudanças "voltando atrás" — não polui inbox
    if (args.fromStatus === args.toStatus) return false;
  }

  const { subject, summary } = teamSubjectAndSummary(args);
  const adminUrl = `${APP_URL}/admin/tickets/${args.ticketId}`;

  try {
    await sendEmail({
      to: TEAM_EMAIL,
      subject,
      text: buildTeamText(args, summary, adminUrl),
      html: buildTeamHtml(args, summary, adminUrl),
    });
    return true;
  } catch (err) {
    console.warn(
      "[ticket-status-team] falha:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

function teamSubjectAndSummary(args: TicketTeamEventArgs): {
  subject: string;
  summary: string;
} {
  const ref = args.domain ?? args.orgName;
  if (args.event === "status_change") {
    const from = STATUS_LABEL_TEAM[args.fromStatus] ?? args.fromStatus;
    const to = STATUS_LABEL_TEAM[args.toStatus] ?? args.toStatus;
    return {
      subject: `[Ticket] ${ref}: ${from} → ${to}`,
      summary: `${args.actor} mudou status: <strong>${from}</strong> → <strong>${to}</strong>`,
    };
  }
  if (args.event === "assigned") {
    if (!args.toAssignee) {
      return {
        subject: `[Ticket] ${ref}: atribuição removida`,
        summary: `${args.actor} removeu atribuição (era <strong>${args.fromAssignee ?? "—"}</strong>)`,
      };
    }
    if (!args.fromAssignee) {
      return {
        subject: `[Ticket] ${ref}: atribuído a ${args.toAssignee}`,
        summary: `${args.actor} atribuiu pra <strong>${args.toAssignee}</strong>`,
      };
    }
    return {
      subject: `[Ticket] ${ref}: reatribuído ${args.fromAssignee} → ${args.toAssignee}`,
      summary: `${args.actor} reatribuiu de <strong>${args.fromAssignee}</strong> pra <strong>${args.toAssignee}</strong>`,
    };
  }
  // note_added
  return {
    subject: `[Ticket] ${ref}: nova nota interna`,
    summary: `${args.actor} adicionou uma nota interna`,
  };
}

function buildTeamText(
  args: TicketTeamEventArgs,
  summary: string,
  adminUrl: string
): string {
  const plain = summary.replace(/<\/?strong>/g, "");
  const extra =
    args.event === "note_added"
      ? `\n\nNota:\n${args.noteText}\n`
      : "";
  return `[Ticket Conteudai]

Cliente: ${args.orgName}${args.domain ? ` (${args.domain})` : ""}
Evento: ${TEAM_EVENT_LABEL[args.event]}
${plain}${extra}

Contato cliente: ${args.contactEmail ?? "—"}${args.contactPhone ? ` · ${args.contactPhone}` : ""}

Abrir no painel: ${adminUrl}`;
}

function buildTeamHtml(
  args: TicketTeamEventArgs,
  summary: string,
  adminUrl: string
): string {
  const noteHtml =
    args.event === "note_added"
      ? `<div style="background:#fffbeb;border:2px solid #fde68a;border-radius:8px;padding:14px;font-size:14px;color:#404040;margin:14px 0;line-height:1.5;">
${args.noteText.replace(/</g, "&lt;").replace(/\n/g, "<br>")}
</div>`
      : "";

  const eventChip = TEAM_EVENT_LABEL[args.event] ?? args.event.toUpperCase();

  return `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f4ef;color:#0a0a0a;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:28px 24px;">
  <div style="font-family:ui-monospace,monospace;font-size:11px;background:#0a0a0a;color:#c8ff3d;display:inline-block;padding:6px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:18px;">
    [ ${eventChip} ]
  </div>
  <h1 style="font-size:22px;font-weight:900;margin:0 0 6px;letter-spacing:-0.02em;color:#0a0a0a;">
    ${args.orgName.replace(/</g, "&lt;")}
    ${args.domain ? `<span style="color:#737373;font-weight:500;font-size:16px;"> · ${args.domain}</span>` : ""}
  </h1>
  <p style="font-size:14px;line-height:1.5;color:#404040;margin:0 0 12px;">
    ${summary}
  </p>
  ${noteHtml}
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;border-top:1px solid #e7e5e4;border-bottom:1px solid #e7e5e4;">
    <tr><td style="padding:6px 0;color:#737373;width:120px;">Contato</td><td style="padding:6px 0;">${args.contactEmail ? `<a href="mailto:${args.contactEmail}" style="color:#0a0a0a;">${args.contactEmail}</a>` : "—"}${args.contactPhone ? ` · <a href="https://wa.me/${args.contactPhone.replace(/\D/g, "")}" style="color:#0a0a0a;">${args.contactPhone}</a>` : ""}</td></tr>
    <tr><td style="padding:6px 0;color:#737373;">Tipo</td><td style="padding:6px 0;font-family:ui-monospace,monospace;">${args.ticketType}</td></tr>
    <tr><td style="padding:6px 0;color:#737373;">Ticket</td><td style="padding:6px 0;font-family:ui-monospace,monospace;font-size:11px;">${args.ticketId}</td></tr>
  </table>
  <a href="${adminUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;font-weight:700;font-size:14px;padding:10px 18px;border-radius:8px;text-decoration:none;">
    Abrir no /admin/tickets
  </a>
</div></body></html>`;
}

/**
 * Notificação especial: cliente comentou no ticket público (/tickets/[id]).
 * Dispara pro TEAM (sempre) — sinaliza que precisa de atenção humana.
 */
interface ClientCommentArgs {
  ticketId: string;
  ticketType: string;
  orgName: string;
  domain?: string;
  contactEmail: string | null;
  contactPhone: string | null;
  commentText: string;
}

export async function sendClientCommentToTeam(
  args: ClientCommentArgs
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  if (!TEAM_EMAIL) return false;

  const ref = args.domain ?? args.orgName;
  const subject = `[Ticket] ${ref}: 💬 cliente comentou`;
  const adminUrl = `${APP_URL}/admin/tickets/${args.ticketId}`;
  const summary = `<strong>${args.contactEmail ?? args.orgName}</strong> deixou um comentário no ticket público.`;

  const text = `[Ticket Conteudai] ${args.orgName}${args.domain ? ` (${args.domain})` : ""}

Cliente comentou:
"${args.commentText}"

Responder via /admin/tickets/${args.ticketId}
ou direto por email: ${args.contactEmail ?? "—"}`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f4ef;color:#0a0a0a;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:28px 24px;">
  <div style="font-family:ui-monospace,monospace;font-size:11px;background:#c8ff3d;color:#0a0a0a;display:inline-block;padding:6px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:18px;">
    [ 💬 NOVO COMENTÁRIO ]
  </div>
  <h1 style="font-size:22px;font-weight:900;margin:0 0 6px;letter-spacing:-0.02em;color:#0a0a0a;">
    ${args.orgName.replace(/</g, "&lt;")}
    ${args.domain ? `<span style="color:#737373;font-weight:500;font-size:16px;"> · ${args.domain}</span>` : ""}
  </h1>
  <p style="font-size:14px;line-height:1.5;color:#404040;margin:0 0 14px;">
    ${summary}
  </p>
  <div style="background:#fff;border:2px solid #0a0a0a;border-radius:10px;padding:16px;font-size:14px;color:#0a0a0a;margin:14px 0;line-height:1.5;box-shadow:3px 3px 0 #c8ff3d;">
${args.commentText.replace(/</g, "&lt;").replace(/\n/g, "<br>")}
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;border-top:1px solid #e7e5e4;border-bottom:1px solid #e7e5e4;">
    <tr><td style="padding:6px 0;color:#737373;width:120px;">Contato</td><td style="padding:6px 0;">${args.contactEmail ? `<a href="mailto:${args.contactEmail}" style="color:#0a0a0a;">${args.contactEmail}</a>` : "—"}${args.contactPhone ? ` · <a href="https://wa.me/${args.contactPhone.replace(/\D/g, "")}" style="color:#0a0a0a;">${args.contactPhone}</a>` : ""}</td></tr>
    <tr><td style="padding:6px 0;color:#737373;">Tipo</td><td style="padding:6px 0;font-family:ui-monospace,monospace;">${args.ticketType}</td></tr>
    <tr><td style="padding:6px 0;color:#737373;">Ticket</td><td style="padding:6px 0;font-family:ui-monospace,monospace;font-size:11px;">${args.ticketId}</td></tr>
  </table>
  <a href="${adminUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;font-weight:700;font-size:14px;padding:10px 18px;border-radius:8px;text-decoration:none;">
    Responder no /admin/tickets
  </a>
</div></body></html>`;

  try {
    await sendEmail({ to: TEAM_EMAIL, subject, text, html });
    return true;
  } catch (err) {
    console.warn(
      "[client-comment] falha:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
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
