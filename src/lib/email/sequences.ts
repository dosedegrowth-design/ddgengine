/**
 * Email sequences (drip campaigns).
 *
 * Welcome series + trial expiring + reativação.
 * Disparado via Inngest (scheduled events).
 */
import { sendEmail } from "./resend";
import { createServiceClient } from "@/lib/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ddgengine.vercel.app";
const BRAND = process.env.NEXT_PUBLIC_APP_NAME ?? "DDG Engine";

function wrapper(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,sans-serif;">
<table cellpadding="0" cellspacing="0" width="100%" style="padding:40px 16px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;">
<tr><td style="padding:32px;color:#0a0a0a;font-size:15px;line-height:1.6;">${content}</td></tr>
<tr><td style="padding:20px 32px;background:#f5f5f5;color:#737373;font-size:12px;border-top:1px solid #e5e5e5;">
Enviado por ${BRAND} · <a href="${APP_URL}" style="color:#737373;">${APP_URL.replace(/^https?:\/\//, "")}</a><br>
Pra cancelar: <a href="${APP_URL}/settings/notifications" style="color:#737373;">Configurar notificações</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

const button = (label: string, href: string) =>
  `<a href="${href}" style="display:inline-block;padding:12px 24px;background:#0a0a0a;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;">${label}</a>`;

// =================== WELCOME SERIES ===================

export async function sendWelcomeDay0(args: { email: string; userName: string }) {
  const firstName = args.userName.split(" ")[0];
  return sendEmail({
    to: args.email,
    subject: "Bem-vindo ao DDG Engine 👋",
    html: wrapper(`
<h1 style="margin:0 0 16px 0;font-size:24px;">Oi ${firstName}!</h1>
<p style="margin:0 0 16px 0;">Tudo certo com sua conta. Você tem 14 dias grátis pra testar tudo.</p>
<p style="margin:0 0 16px 0;">Em 7 minutos, seu blog pode estar rodando. Comece pelo onboarding:</p>
<p style="margin:0 0 24px 0;">${button("Começar agora", `${APP_URL}/onboarding`)}</p>
<p style="margin:0 0 8px 0;font-size:13px;color:#737373;"><strong>Próximos passos:</strong></p>
<ul style="margin:0 0 16px 0;color:#525252;font-size:14px;">
  <li>Conectar seu site (1 min)</li>
  <li>Preencher briefing inteligente (5 min)</li>
  <li>Aprovar primeira pauta (1 min)</li>
</ul>
<p style="font-size:13px;color:#737373;">Qualquer dúvida, é só responder este email.</p>
`),
    text: `Oi ${firstName}! Tudo certo com sua conta. Comece o onboarding: ${APP_URL}/onboarding`,
  });
}

export async function sendWelcomeDay3(args: { email: string; userName: string; postsPublished: number }) {
  const firstName = args.userName.split(" ")[0];
  if (args.postsPublished > 0) {
    return sendEmail({
      to: args.email,
      subject: `${firstName}, primeiro post no ar 🎉`,
      html: wrapper(`
<h1 style="margin:0 0 16px 0;font-size:24px;">3 dias de DDG Engine</h1>
<p style="margin:0 0 16px 0;">Você já publicou ${args.postsPublished} post. Boa!</p>
<p style="margin:0 0 16px 0;">Próximos passos pra acelerar:</p>
<ul style="margin:0 0 16px 0;color:#525252;font-size:14px;">
  <li>Conectar Google Search Console (vê posições reais)</li>
  <li>Conectar GA4 (mede tráfego)</li>
  <li>Configurar WhatsApp pra aprovar posts em 1 clique</li>
</ul>
<p style="margin:0 0 24px 0;">${button("Conectar integrações", `${APP_URL}/settings/integrations`)}</p>
`),
      text: `${firstName}, 3 dias no DDG Engine. Próximo passo: conectar GSC + GA4.`,
    });
  }

  return sendEmail({
    to: args.email,
    subject: `${firstName}, ainda não começou?`,
    html: wrapper(`
<h1 style="margin:0 0 16px 0;font-size:24px;">Precisa de ajuda?</h1>
<p style="margin:0 0 16px 0;">Você se cadastrou faz 3 dias e ainda não publicou nada. Posso te ajudar?</p>
<p style="margin:0 0 24px 0;">${button("Continuar onboarding", `${APP_URL}/onboarding`)}</p>
<p style="font-size:13px;color:#737373;">Ou responde esse email com a dúvida que eu resolvo.</p>
`),
    text: `${firstName}, precisa de ajuda? Continue: ${APP_URL}/onboarding`,
  });
}

// =================== TRIAL ENDING ===================

export async function sendTrialEnding(args: { email: string; userName: string; daysLeft: number; postsPublished: number }) {
  const firstName = args.userName.split(" ")[0];
  return sendEmail({
    to: args.email,
    subject:
      args.daysLeft <= 2
        ? `${firstName}, seu trial acaba em ${args.daysLeft} dia${args.daysLeft === 1 ? "" : "s"}`
        : `${firstName}, ${args.daysLeft} dias restantes no trial`,
    html: wrapper(`
<h1 style="margin:0 0 16px 0;font-size:24px;">Faltam ${args.daysLeft} dia${args.daysLeft === 1 ? "" : "s"}</h1>
<p style="margin:0 0 16px 0;">Você publicou <strong>${args.postsPublished} posts</strong> durante o trial. Pra continuar:</p>
<p style="margin:0 0 24px 0;">${button(`Escolher plano (a partir de R$ 97)`, `${APP_URL}/settings/billing`)}</p>
<p style="font-size:13px;color:#525252;margin:0 0 8px 0;"><strong>Lembre:</strong></p>
<ul style="margin:0 0 16px 0;color:#525252;font-size:14px;">
  <li>Garantia 90 dias se não crescer impressions no Google</li>
  <li>Cancele quando quiser, sem multa</li>
  <li>PIX + cartão recorrente</li>
</ul>
`),
    text: `${firstName}, ${args.daysLeft} dias restantes no trial. Escolha plano: ${APP_URL}/settings/billing`,
  });
}

// =================== TRIGGER VIA INNGEST ===================

export async function dispatchWelcomeDay0(orgId: string) {
  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, owner_user_id")
    .eq("id", orgId)
    .single();
  if (!org) return;
  const { data: ownerData } = await supabase.auth.admin.getUserById(org.owner_user_id as string);
  const email = ownerData.user?.email;
  if (!email) return;
  await sendWelcomeDay0({
    email,
    userName: (ownerData.user?.user_metadata?.name as string) ?? org.name,
  });
}
