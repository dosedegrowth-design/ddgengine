/**
 * Email transacional: "Seu blog tá no ar em {domain}/blog 🎉"
 * Disparado pelo cron quando DNS propaga e ativação termina.
 */
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";

export async function sendBlogActivatedEmail(args: {
  orgId: string;
  domain: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const admin = createServiceClient();

  // Pega owner e nome da org
  const { data: org } = await admin
    .from("organizations")
    .select("name, owner_user_id")
    .eq("id", args.orgId)
    .maybeSingle();
  if (!org?.owner_user_id) return;

  // Email do owner via auth.users
  const { data: userRes } = await admin.auth.admin.getUserById(org.owner_user_id);
  const email = userRes?.user?.email;
  if (!email) return;

  const blogUrl = `https://${args.domain}/blog`;
  const html = renderHtml({ orgName: org.name ?? "", blogUrl, domain: args.domain });
  const text = `Boas notícias! Seu blog está no ar em ${blogUrl}.

Tudo que você publicar a partir de agora vai aparecer automaticamente
em ${args.domain}/blog — ranqueando no Google e citável em ChatGPT/IAs.

Próximos passos:
- Gerar mais posts: https://conteudai.com.br/dashboard
- Acompanhar aparições em IA: https://conteudai.com.br/visibility

Time DDG.`;

  await sendEmail({
    to: email,
    subject: `Seu blog tá no ar em ${args.domain}/blog 🎉`,
    html,
    text,
  });
}

function renderHtml(opts: {
  orgName: string;
  blogUrl: string;
  domain: string;
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Seu blog tá no ar</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f0;color:#0a0a0a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-family:ui-monospace,monospace;font-size:11px;color:#c8ff3d;background:#0a0a0a;display:inline-block;padding:6px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:24px;">
      [ BLOG ATIVADO ]
    </div>
    <h1 style="font-size:32px;font-weight:900;line-height:1.2;margin:0 0 16px;letter-spacing:-0.02em;">
      Boas notícias — seu blog tá no ar.
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#404040;">
      A integração com <strong>${opts.domain}</strong> foi ativada agora.
      Tudo que você publicar vai aparecer automaticamente em:
    </p>
    <a href="${opts.blogUrl}" style="display:inline-block;background:#c8ff3d;color:#0a0a0a;font-weight:700;font-size:15px;padding:14px 24px;border:2px solid #0a0a0a;border-radius:8px;text-decoration:none;box-shadow:3px 3px 0 #0a0a0a;margin-bottom:24px;">
      ${opts.blogUrl}
    </a>
    <div style="border-top:1px solid #d4d4cc;padding-top:24px;margin-top:32px;">
      <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin:0 0 12px;color:#525252;">
        Próximos passos
      </h2>
      <ul style="font-size:14px;line-height:1.7;color:#404040;padding-left:18px;margin:0;">
        <li>Gere mais posts com 1 clique no <a href="https://conteudai.com.br/dashboard" style="color:#0a0a0a;">painel</a></li>
        <li>Acompanhe aparições em IA na seção <a href="https://conteudai.com.br/visibility" style="color:#0a0a0a;">Aparições em IA</a></li>
        <li>Edite cor / fonte / template do blog em <a href="https://conteudai.com.br/settings/site" style="color:#0a0a0a;">Configurações</a></li>
      </ul>
    </div>
    <p style="font-size:12px;color:#737373;margin:32px 0 0;line-height:1.5;">
      Recebeu por engano? Responde esse email — a gente lê todas.<br>
      <strong style="color:#0a0a0a;">Time Conteudai</strong>
    </p>
  </div>
</body>
</html>`;
}
