/**
 * Sistema de convite de equipe.
 *
 * Fluxo:
 * 1. Owner clica "convidar" e digita email + role
 * 2. Sistema cria invitation com token único
 * 3. Envia email com link /accept-invite/[token]
 * 4. Destinatário clica → faz cadastro (se não tiver conta) → vira member
 */
import { randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function createInvitation(args: {
  organizationId: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  invitedBy: string;
  inviterName: string;
  orgName: string;
}) {
  const supabase = createServiceClient();
  const token = randomBytes(32).toString("base64url");
  const cleanEmail = args.email.trim().toLowerCase();

  // Verifica se já é membro
  const { data: existingUser } = await supabase
    .from("auth.users" as any)
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existingUser) {
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("id")
      .eq("organization_id", args.organizationId)
      .eq("user_id", existingUser.id)
      .maybeSingle();
    if (membership) {
      return { error: "Esse email já é membro da organização" };
    }
  }

  // Upsert invitation (cancela anterior se existir)
  const { error: cancelErr } = await supabase
    .from("team_invitations")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("organization_id", args.organizationId)
    .eq("email", cleanEmail)
    .is("accepted_at", null)
    .is("cancelled_at", null);
  // ignora erro se não havia

  const { data: invite, error } = await supabase
    .from("team_invitations")
    .insert({
      organization_id: args.organizationId,
      email: cleanEmail,
      role: args.role,
      token,
      invited_by: args.invitedBy,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const inviteUrl = `${APP_URL}/accept-invite/${token}`;
  try {
    await sendEmail({
      to: cleanEmail,
      subject: `${args.inviterName} te convidou pra ${args.orgName} no Conteudai`,
      html: `
<table cellpadding="0" cellspacing="0" width="100%" style="background-color:#fafafa;padding:40px 16px;font-family:-apple-system,sans-serif;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px 0;font-size:22px;">Você foi convidado(a) 🎉</h1>
          <p style="color:#525252;margin:0 0 24px 0;">
            <strong>${args.inviterName}</strong> te convidou pra fazer parte de <strong>${args.orgName}</strong> no Conteudai como <strong>${args.role}</strong>.
          </p>
          <p style="margin:0 0 24px 0;">
            <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#0a0a0a;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;">
              Aceitar convite
            </a>
          </p>
          <p style="margin:0;color:#737373;font-size:12px;">
            Esse convite expira em 7 dias. Se você não conhece quem enviou, ignore este email.
          </p>
        </td></tr>
      </table>
    </td>
  </tr>
</table>`,
      text: `${args.inviterName} te convidou pra ${args.orgName} no Conteudai.\n\nAceitar: ${inviteUrl}`,
    });
  } catch (err) {
    console.error("Erro ao enviar email de convite:", err);
  }

  return { success: true, invitationId: invite.id, inviteUrl };
}

export async function acceptInvitation(token: string, userId: string) {
  const supabase = createServiceClient();

  const { data: invite } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .is("cancelled_at", null)
    .maybeSingle();

  if (!invite) return { error: "Convite inválido ou expirado" };
  if (new Date(invite.expires_at as string) < new Date()) {
    return { error: "Convite expirou" };
  }

  // Verifica se user já é membro
  const { data: existing } = await supabase
    .from("org_memberships")
    .select("id")
    .eq("organization_id", invite.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("team_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    return { success: true, alreadyMember: true };
  }

  const { error: memberErr } = await supabase.from("org_memberships").insert({
    organization_id: invite.organization_id,
    user_id: userId,
    role: invite.role,
  });
  if (memberErr) return { error: memberErr.message };

  await supabase
    .from("team_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return { success: true, organizationId: invite.organization_id };
}

export async function cancelInvitation(invitationId: string, orgId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("team_invitations")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("organization_id", orgId);
  return error ? { error: error.message } : { success: true };
}
