/**
 * Renderização de PDF dos reports mensais.
 *
 * Estratégia: HTML → PDF via puppeteer-core (chromium-min em Edge).
 * Pra MVP: gera HTML estático que pode ser convertido em PDF do lado do cliente,
 * ou via @sparticuz/chromium serverless quando precisarmos.
 *
 * Versão atual: retorna HTML formatado pra impressão.
 * Browser → File → Print → Save as PDF funciona perfeito.
 */
import { createServiceClient } from "@/lib/supabase/server";

export async function renderReportHtml(reportId: string): Promise<string> {
  const supabase = createServiceClient();

  const { data: report } = await supabase
    .from("reports")
    .select("*, sites(domain, organizations(name))")
    .eq("id", reportId)
    .single();

  if (!report) throw new Error("Report não encontrado");

  const orgName = ((report as any).sites?.organizations?.name as string) ?? "Cliente";
  const domain = ((report as any).sites?.domain as string) ?? "";
  const metrics = (report.metrics as any) ?? {};
  const recommendations = (report.recommendations as string[]) ?? [];
  const start = new Date(report.period_start as string);
  const monthLabel = start.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const deltaPv = metrics.delta_pageviews ?? 0;
  const deltaStr = deltaPv >= 0 ? `+${deltaPv.toFixed(1)}%` : `${deltaPv.toFixed(1)}%`;
  const deltaColor = deltaPv >= 0 ? "#10b981" : "#ef4444";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório ${monthLabel} — ${orgName}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      color: #0a0a0a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 24mm;
      page-break-after: always;
    }
    .header {
      border-bottom: 2px solid #0a0a0a;
      padding-bottom: 16px;
      margin-bottom: 32px;
      display: flex;
      align-items: end;
      justify-content: space-between;
    }
    .header .brand { font-size: 14px; color: #737373; font-weight: 500; }
    .header .domain { font-size: 18px; font-weight: 600; }
    h1 { font-size: 42px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px 0; line-height: 1.05; }
    .subtitle { font-size: 18px; color: #525252; margin: 0 0 32px 0; }
    h2 { font-size: 22px; font-weight: 600; margin: 32px 0 12px 0; letter-spacing: -0.01em; }
    .summary {
      background: #fafafa;
      border-left: 4px solid #0a0a0a;
      padding: 16px 20px;
      margin: 24px 0;
      font-size: 16px;
      line-height: 1.5;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 24px 0;
    }
    .kpi {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 20px;
    }
    .kpi .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #737373;
      margin-bottom: 6px;
    }
    .kpi .value { font-size: 32px; font-weight: 700; }
    .kpi .delta { font-size: 13px; font-weight: 500; margin-top: 4px; }
    ul.recs {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    ul.recs li {
      padding: 14px 16px;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 14px;
      line-height: 1.5;
    }
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
      font-size: 11px;
      color: #737373;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand">Conteudai</div>
        <div class="domain">${domain}</div>
      </div>
      <div style="font-size: 12px; color: #737373;">${new Date().toLocaleDateString("pt-BR")}</div>
    </div>

    <h1>Relatório de ${monthLabel}</h1>
    <p class="subtitle">${orgName}</p>

    ${report.summary ? `<div class="summary">${escapeHtml(report.summary as string)}</div>` : ""}

    <h2>📈 Números do mês</h2>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="label">Visitas</div>
        <div class="value">${(metrics.pageviews ?? 0).toLocaleString("pt-BR")}</div>
        <div class="delta" style="color: ${deltaColor};">${deltaStr} vs mês anterior</div>
      </div>
      <div class="kpi">
        <div class="label">Impressões Google</div>
        <div class="value">${(metrics.impressions ?? 0).toLocaleString("pt-BR")}</div>
        <div class="delta">${(metrics.clicks ?? 0).toLocaleString("pt-BR")} cliques</div>
      </div>
      <div class="kpi">
        <div class="label">Citações IA</div>
        <div class="value">${metrics.ai_citations ?? 0}</div>
        <div class="delta">ChatGPT + Perplexity + Claude + Gemini</div>
      </div>
    </div>

    ${
      recommendations.length
        ? `<h2>💡 Recomendações para o próximo mês</h2>
    <ul class="recs">
      ${recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}
    </ul>`
        : ""
    }

    <div class="footer">
      <span>Gerado automaticamente por Conteudai</span>
      <span>conteudai.com.br</span>
    </div>
  </div>

  <div class="no-print" style="position: fixed; bottom: 20px; right: 20px;">
    <button onclick="window.print()" style="padding: 12px 24px; background: #0a0a0a; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
      🖨️ Imprimir / Salvar como PDF
    </button>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
