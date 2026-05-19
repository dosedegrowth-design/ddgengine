/**
 * Emails do ciclo de vida do trial / desativação.
 * Disparados pelo cron /api/cron/trial-lifecycle.
 */
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://conteudai.com.br";

async function getOwnerEmail(orgId: string): Promise<string | null> {
  const admin = createServiceClient();
  const { data: org } = await admin
    .from("organizations")
    .select("owner_user_id")
    .eq("id", orgId)
    .maybeSingle();
  if (!org?.owner_user_id) return null;
  const { data: u } = await admin.auth.admin.getUserById(org.owner_user_id);
  return u?.user?.email ?? null;
}

/** Trial acabou — cliente tem 7 dias pra escolher plano antes de bloqueio total. */
export async function sendTrialExpiredEmail(args: {
  orgId: string;
  orgName: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const email = await getOwnerEmail(args.orgId);
  if (!email) return;

  const billingUrl = `${APP_URL}/settings/billing`;

  await sendEmail({
    to: email,
    subject: "Seu trial acabou — escolha um plano pra continuar",
    text: `Oi! Seu trial de 14 dias do Conteudai acabou.

Você tem 7 dias pra escolher um plano e continuar publicando.
Depois disso, vamos desativar o blog (mas seus posts ficam guardados por 90 dias).

Escolher plano: ${billingUrl}

Time DDG.`,
    html: `<!DOCTYPE html>
<html lang="pt-BR"><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f0;color:#0a0a0a;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="font-family:ui-monospace,monospace;font-size:11px;color:#c8ff3d;background:#0a0a0a;display:inline-block;padding:6px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:24px;">
    [ TRIAL EXPIRADO ]
  </div>
  <h1 style="font-size:32px;font-weight:900;line-height:1.2;margin:0 0 16px;letter-spacing:-0.02em;">
    Seu trial acabou.
  </h1>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#404040;">
    Você tem <strong>7 dias</strong> pra escolher um plano antes do blog
    desativar. Seus posts ficam guardados por 90 dias caso queira voltar.
  </p>
  <a href="${billingUrl}" style="display:inline-block;background:#c8ff3d;color:#0a0a0a;font-weight:700;font-size:15px;padding:14px 24px;border:2px solid #0a0a0a;border-radius:8px;text-decoration:none;box-shadow:3px 3px 0 #0a0a0a;">
    Escolher plano
  </a>
  <p style="font-size:12px;color:#737373;margin:32px 0 0;">
    Dúvidas? Responde esse email.<br><strong style="color:#0a0a0a;">Time Conteudai</strong>
  </p>
</div></body></html>`,
  });
}

/** Org desativada (7 dias após trial expirar sem pagamento). */
export async function sendOrgDeactivatedEmail(args: {
  orgId: string;
  orgName: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const email = await getOwnerEmail(args.orgId);
  if (!email) return;

  const billingUrl = `${APP_URL}/settings/billing`;

  await sendEmail({
    to: email,
    subject: "Conta desativada — posts ficam guardados por 90 dias",
    text: `Oi!

Sua conta Conteudai foi desativada porque o trial acabou sem assinatura.

Seus posts e configurações ficam guardados por 90 dias — basta voltar
e escolher um plano que tudo volta ao ar.

${billingUrl}

Time DDG.`,
    html: `<!DOCTYPE html>
<html lang="pt-BR"><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f0;color:#0a0a0a;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="font-family:ui-monospace,monospace;font-size:11px;color:#fff;background:#dc2626;display:inline-block;padding:6px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:24px;">
    [ CONTA DESATIVADA ]
  </div>
  <h1 style="font-size:28px;font-weight:900;line-height:1.2;margin:0 0 16px;letter-spacing:-0.02em;">
    Conta desativada.
  </h1>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#404040;">
    Seu blog em <strong>${args.orgName}</strong> saiu do ar porque o trial
    acabou sem assinatura. Mas calma — seus posts ficam guardados por
    <strong>90 dias</strong>.
  </p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#404040;">
    Quer voltar? Escolhe um plano e tudo volta ao ar em minutos.
  </p>
  <a href="${billingUrl}" style="display:inline-block;background:#c8ff3d;color:#0a0a0a;font-weight:700;font-size:15px;padding:14px 24px;border:2px solid #0a0a0a;border-radius:8px;text-decoration:none;box-shadow:3px 3px 0 #0a0a0a;">
    Reativar conta
  </a>
  <p style="font-size:12px;color:#737373;margin:32px 0 0;">
    <strong style="color:#0a0a0a;">Time Conteudai</strong>
  </p>
</div></body></html>`,
  });
}
