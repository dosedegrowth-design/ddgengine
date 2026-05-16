/**
 * Templates HTML de email (simples, inline styles pra compatibilidade).
 */

interface BaseTemplateVars {
  brand: string;
  appUrl: string;
}

const wrapper = (content: string, vars: BaseTemplateVars) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fafafa;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #e5e5e5;">
              <div style="font-weight:600;font-size:16px;color:#0a0a0a;letter-spacing:-0.02em;">${vars.brand}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#0a0a0a;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#f5f5f5;color:#737373;font-size:12px;">
              Enviado por ${vars.brand} · <a href="${vars.appUrl}" style="color:#737373;">${vars.appUrl.replace(/^https?:\/\//, "")}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const button = (label: string, href: string, primary = true) => `
<a href="${href}" style="display:inline-block;padding:12px 24px;background-color:${primary ? "#0a0a0a" : "#ffffff"};color:${primary ? "#ffffff" : "#0a0a0a"};border:1px solid ${primary ? "#0a0a0a" : "#e5e5e5"};border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;">${label}</a>`;

const baseVars = (): BaseTemplateVars => ({
  brand: process.env.NEXT_PUBLIC_APP_NAME ?? "DDG Engine",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ddgengine.com.br",
});

export function emailPostPendingReview(args: {
  userName: string;
  postTitle: string;
  postType: "long_form" | "faq_page";
  wordCount: number;
  approveUrl: string;
  reviewUrl: string;
}) {
  const v = baseVars();
  const typeLabel = args.postType === "long_form" ? "Artigo longo" : "FAQ page";
  return {
    subject: `📝 Novo post pra revisar: ${args.postTitle.slice(0, 50)}`,
    html: wrapper(
      `
<h1 style="margin:0 0 8px 0;font-size:24px;font-weight:600;letter-spacing:-0.02em;">Olá ${args.userName.split(" ")[0]} 👋</h1>
<p style="margin:0 0 24px 0;color:#525252;">Tem um post novo aguardando sua aprovação.</p>

<div style="background-color:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:20px;margin:0 0 24px 0;">
  <div style="font-size:12px;color:#737373;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${typeLabel} · ${args.wordCount} palavras</div>
  <div style="font-weight:600;font-size:18px;line-height:1.3;">${args.postTitle}</div>
</div>

<table cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
  <tr>
    <td style="padding-right:8px;">${button("Aprovar e publicar", args.approveUrl, true)}</td>
    <td>${button("Revisar antes", args.reviewUrl, false)}</td>
  </tr>
</table>

<p style="margin:24px 0 0 0;font-size:13px;color:#737373;">A IA passou por 7 checagens automáticas. Você só revisa se quiser. Em modo auto, publicaria sozinho.</p>`,
      v
    ),
    text: `Novo post pra revisar: ${args.postTitle}\n\nAprovar: ${args.approveUrl}\nRevisar: ${args.reviewUrl}`,
  };
}

export function emailPostPublished(args: {
  userName: string;
  postTitle: string;
  postUrl: string;
}) {
  const v = baseVars();
  return {
    subject: `🎉 Post publicado: ${args.postTitle.slice(0, 50)}`,
    html: wrapper(
      `
<h1 style="margin:0 0 8px 0;font-size:24px;font-weight:600;letter-spacing:-0.02em;">Post no ar 🚀</h1>
<p style="margin:0 0 24px 0;color:#525252;">"${args.postTitle}" foi publicado com sucesso.</p>

<p style="margin:0 0 24px 0;">${button("Ver no blog", args.postUrl, true)}</p>

<p style="margin:24px 0 0 0;font-size:13px;color:#737373;">Em até 48h o Google indexa. Em até 7 dias começa a aparecer em buscas IA.</p>`,
      v
    ),
    text: `Post publicado: ${args.postTitle}\n\n${args.postUrl}`,
  };
}

export function emailMonthlyReport(args: {
  userName: string;
  monthLabel: string;
  summary: string;
  pageviews: number;
  deltaPageviews: number;
  aiCitations: number;
  postsPublished: number;
  recommendations: string[];
  reportUrl: string;
}) {
  const v = baseVars();
  const deltaStr =
    args.deltaPageviews > 0
      ? `+${args.deltaPageviews.toFixed(1)}%`
      : `${args.deltaPageviews.toFixed(1)}%`;
  const deltaColor = args.deltaPageviews >= 0 ? "#16a34a" : "#dc2626";

  return {
    subject: `📊 Relatório mensal — ${args.monthLabel}`,
    html: wrapper(
      `
<h1 style="margin:0 0 8px 0;font-size:24px;font-weight:600;letter-spacing:-0.02em;">Relatório de ${args.monthLabel}</h1>
<p style="margin:0 0 24px 0;color:#525252;">${args.summary}</p>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0;">
  <tr>
    <td width="33%" style="padding:16px;background-color:#fafafa;border-radius:8px;text-align:center;">
      <div style="font-size:12px;color:#737373;text-transform:uppercase;letter-spacing:0.05em;">Visitas</div>
      <div style="font-size:24px;font-weight:600;margin:4px 0;">${args.pageviews.toLocaleString("pt-BR")}</div>
      <div style="font-size:12px;color:${deltaColor};">${deltaStr}</div>
    </td>
    <td width="33%" style="padding:16px;background-color:#fafafa;border-radius:8px;text-align:center;border-left:8px solid #ffffff;border-right:8px solid #ffffff;">
      <div style="font-size:12px;color:#737373;text-transform:uppercase;letter-spacing:0.05em;">Citações IA</div>
      <div style="font-size:24px;font-weight:600;margin:4px 0;">${args.aiCitations}</div>
      <div style="font-size:12px;color:#737373;">no mês</div>
    </td>
    <td width="33%" style="padding:16px;background-color:#fafafa;border-radius:8px;text-align:center;">
      <div style="font-size:12px;color:#737373;text-transform:uppercase;letter-spacing:0.05em;">Posts</div>
      <div style="font-size:24px;font-weight:600;margin:4px 0;">${args.postsPublished}</div>
      <div style="font-size:12px;color:#737373;">publicados</div>
    </td>
  </tr>
</table>

${
  args.recommendations.length
    ? `<h2 style="font-size:16px;font-weight:600;margin:24px 0 12px 0;">💡 Recomendações</h2>
<ul style="margin:0 0 24px 0;padding-left:20px;color:#525252;">
  ${args.recommendations.map((r) => `<li style="margin-bottom:8px;">${r}</li>`).join("")}
</ul>`
    : ""
}

<p style="margin:24px 0 0 0;">${button("Ver relatório completo", args.reportUrl, true)}</p>`,
      v
    ),
    text: `Relatório mensal ${args.monthLabel}\n\n${args.summary}\n\nVisitas: ${args.pageviews}\nCitações IA: ${args.aiCitations}\nPosts publicados: ${args.postsPublished}\n\nVer completo: ${args.reportUrl}`,
  };
}

export function emailAiVisibilityMilestone(args: {
  userName: string;
  citations: number;
  llmName: string;
  visibilityUrl: string;
}) {
  const v = baseVars();
  return {
    subject: `🤖 ${args.citations} citações no ${args.llmName} esta semana`,
    html: wrapper(
      `
<h1 style="margin:0 0 8px 0;font-size:24px;font-weight:600;letter-spacing:-0.02em;">Milestone alcançado!</h1>
<p style="margin:0 0 24px 0;color:#525252;">Sua marca foi citada <strong>${args.citations} vezes</strong> no ${args.llmName} esta semana.</p>

<p style="margin:0 0 16px 0;">Continue produzindo conteúdo de qualidade e essa curva sobe.</p>

<p style="margin:0;">${button("Ver dashboard de visibility", args.visibilityUrl, true)}</p>`,
      v
    ),
    text: `${args.citations} citações no ${args.llmName} esta semana.\n\nDashboard: ${args.visibilityUrl}`,
  };
}
