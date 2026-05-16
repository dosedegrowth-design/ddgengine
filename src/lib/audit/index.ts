/**
 * Auditor automático do site do cliente.
 * Roda quando cliente conecta URL na onboarding.
 *
 * Verifica:
 * - DNS / Cloudflare presence
 * - Stack do CMS (WordPress, Wix, Webflow, Shopify, custom)
 * - HTTPS + redirects
 * - robots.txt + sitemap.xml
 * - Meta tags e schema básico
 *
 * Retorna score 0-100 + relatório detalhado.
 */

export interface AuditResult {
  score: number;
  classification: "healthy" | "ok_with_fixes" | "needs_work" | "not_recommended";
  expected_traffic_timeline: string;
  domain: string;
  normalized_url: string;
  checks: {
    https: { passed: boolean; details: string };
    cloudflare: { detected: boolean; details: string };
    stack: { detected: string; confidence: number; details: string };
    robots: { passed: boolean; details: string };
    sitemap: { passed: boolean; url?: string; details: string };
    meta_tags: { passed: boolean; details: string };
    schema_markup: { passed: boolean; types: string[]; details: string };
    response_time_ms: number;
  };
  recommendations: string[];
  ran_at: string;
}

export async function auditSite(rawUrl: string): Promise<AuditResult> {
  // Normaliza URL
  let url: URL;
  try {
    const cleaned = rawUrl.trim().toLowerCase();
    const withProtocol = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
    url = new URL(withProtocol);
  } catch {
    throw new Error("URL inválida");
  }

  const domain = url.hostname.replace(/^www\./, "");
  const normalized = `${url.protocol}//${url.hostname}`;
  const recommendations: string[] = [];

  const checks: AuditResult["checks"] = {
    https: { passed: false, details: "" },
    cloudflare: { detected: false, details: "" },
    stack: { detected: "unknown", confidence: 0, details: "" },
    robots: { passed: false, details: "" },
    sitemap: { passed: false, details: "" },
    meta_tags: { passed: false, details: "" },
    schema_markup: { passed: false, types: [], details: "" },
    response_time_ms: 0,
  };

  // Fetch da home
  const start = Date.now();
  let homeResponse: Response | null = null;
  let homeHtml = "";

  try {
    homeResponse = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DDGEngineBot/1.0)",
      },
      signal: AbortSignal.timeout(15000),
    });
    homeHtml = await homeResponse.text();
    checks.response_time_ms = Date.now() - start;
  } catch (err) {
    checks.response_time_ms = Date.now() - start;
    checks.https.details = "Não conseguimos acessar o site. Verifique se está online.";
    recommendations.push("Verifique se o domínio está acessível publicamente");
  }

  // HTTPS
  if (homeResponse?.url?.startsWith("https://")) {
    checks.https.passed = true;
    checks.https.details = "HTTPS funcional";
  } else {
    checks.https.details = "HTTPS não detectado ou redirect pra HTTP";
    recommendations.push("Configure certificado SSL (HTTPS) — Cloudflare oferece grátis");
  }

  // Cloudflare detection (via headers)
  if (homeResponse) {
    const server = homeResponse.headers.get("server") || "";
    const cfRay = homeResponse.headers.get("cf-ray");
    if (cfRay || server.toLowerCase().includes("cloudflare")) {
      checks.cloudflare.detected = true;
      checks.cloudflare.details = "Cloudflare ativo (CF-Ray detectado). Reverse proxy disponível.";
    } else {
      checks.cloudflare.details =
        "Cloudflare não detectado. Recomendamos apontar nameservers pro Cloudflare grátis.";
      recommendations.push(
        "Configure Cloudflare grátis no seu domínio pra habilitar reverse proxy"
      );
    }
  }

  // Stack detection
  checks.stack = detectStack(homeHtml, homeResponse);

  // Robots.txt
  try {
    const robotsResp = await fetch(`${normalized}/robots.txt`, {
      signal: AbortSignal.timeout(10000),
    });
    if (robotsResp.ok) {
      const robotsText = await robotsResp.text();
      checks.robots.passed = true;
      checks.robots.details =
        robotsText.toLowerCase().includes("disallow: /")
          ? "robots.txt bloqueia indexação"
          : "robots.txt configurado corretamente";
      if (robotsText.toLowerCase().match(/disallow:\s*\/\s*$/m)) {
        recommendations.push("Seu robots.txt bloqueia indexação. Ajuste antes de publicar.");
      }
    } else {
      checks.robots.details = "robots.txt não encontrado — vamos criar pra você";
    }
  } catch {
    checks.robots.details = "Não conseguimos verificar robots.txt";
  }

  // Sitemap
  for (const path of ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"]) {
    try {
      const r = await fetch(`${normalized}${path}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        checks.sitemap.passed = true;
        checks.sitemap.url = `${normalized}${path}`;
        checks.sitemap.details = `Sitemap encontrado em ${path}`;
        break;
      }
    } catch {
      // continua
    }
  }
  if (!checks.sitemap.passed) {
    checks.sitemap.details = "Sitemap não encontrado — vamos gerar pra você";
    recommendations.push("Geraremos um sitemap.xml automático pro seu blog");
  }

  // Meta tags
  if (homeHtml) {
    const hasTitle = /<title[^>]*>.+?<\/title>/i.test(homeHtml);
    const hasDescription = /<meta[^>]+name=["']description["'][^>]+>/i.test(homeHtml);
    const hasOG = /<meta[^>]+property=["']og:/i.test(homeHtml);
    const passed = hasTitle && hasDescription;
    checks.meta_tags.passed = passed;
    checks.meta_tags.details = passed
      ? `Meta tags OK${hasOG ? " com Open Graph" : ""}`
      : "Meta tags faltando (title/description)";
    if (!hasOG) {
      recommendations.push(
        "Adicionaremos Open Graph tags nos seus posts pra compartilhamento social"
      );
    }
  }

  // Schema markup
  if (homeHtml) {
    const ldJsonMatches = [...homeHtml.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const types: string[] = [];
    for (const match of ldJsonMatches) {
      try {
        const obj = JSON.parse(match[1]);
        const items = Array.isArray(obj) ? obj : [obj];
        for (const item of items) {
          const t = item["@type"];
          if (t) types.push(Array.isArray(t) ? t.join(",") : t);
        }
      } catch {
        // ignora JSON inválido
      }
    }
    checks.schema_markup.types = types;
    checks.schema_markup.passed = types.length > 0;
    checks.schema_markup.details = types.length
      ? `Schema markup encontrado: ${types.slice(0, 3).join(", ")}${types.length > 3 ? "..." : ""}`
      : "Sem schema markup — vamos adicionar nos posts";
  }

  // Calcula score (0-100)
  let score = 50; // base
  if (checks.https.passed) score += 15;
  if (checks.cloudflare.detected) score += 10;
  if (checks.stack.detected !== "unknown") score += 5;
  if (checks.robots.passed) score += 5;
  if (checks.sitemap.passed) score += 5;
  if (checks.meta_tags.passed) score += 5;
  if (checks.schema_markup.passed) score += 5;
  if (checks.response_time_ms > 0 && checks.response_time_ms < 2000) score += 5;
  score = Math.min(100, Math.max(0, score));

  // Classificação + timeline
  let classification: AuditResult["classification"];
  let timeline: string;
  if (score >= 80) {
    classification = "healthy";
    timeline = "Tráfego esperado em 60-90 dias";
  } else if (score >= 60) {
    classification = "ok_with_fixes";
    timeline = "Tráfego esperado em 90-150 dias (com ajustes)";
  } else if (score >= 40) {
    classification = "needs_work";
    timeline = "Tráfego esperado em 150-240 dias — recomendamos fixar pendências";
  } else {
    classification = "not_recommended";
    timeline = "Site com problemas críticos — recomendamos plano Native com auditoria assistida";
  }

  return {
    score,
    classification,
    expected_traffic_timeline: timeline,
    domain,
    normalized_url: normalized,
    checks,
    recommendations,
    ran_at: new Date().toISOString(),
  };
}

function detectStack(
  html: string,
  response: Response | null
): { detected: string; confidence: number; details: string } {
  if (!html) return { detected: "unknown", confidence: 0, details: "Não conseguimos analisar" };

  const lower = html.toLowerCase();

  // Wix
  if (lower.includes("wix.com") || lower.includes("wixstatic.com") || lower.includes("static.parastorage.com")) {
    return { detected: "wix", confidence: 0.95, details: "Wix detectado (CDN wixstatic)" };
  }

  // Webflow
  if (lower.includes("webflow.com") || /<html[^>]+data-wf-page=/i.test(html)) {
    return { detected: "webflow", confidence: 0.95, details: "Webflow detectado (data-wf-page)" };
  }

  // Squarespace
  if (lower.includes("squarespace.com") || lower.includes("static1.squarespace.com")) {
    return { detected: "squarespace", confidence: 0.95, details: "Squarespace detectado" };
  }

  // Shopify
  if (
    lower.includes("cdn.shopify.com") ||
    lower.includes("shopify.com/s/files") ||
    response?.headers.get("x-shopid")
  ) {
    return { detected: "shopify", confidence: 0.95, details: "Shopify detectado" };
  }

  // WordPress
  if (
    /<meta name=["']generator["'] content=["']wordpress/i.test(html) ||
    lower.includes("wp-content/") ||
    lower.includes("wp-includes/")
  ) {
    return { detected: "wordpress", confidence: 0.95, details: "WordPress detectado" };
  }

  // Next.js
  if (lower.includes("/_next/") || lower.includes("__next_data__")) {
    return { detected: "nextjs", confidence: 0.9, details: "Next.js detectado" };
  }

  // Generator meta tag
  const generatorMatch = /<meta name=["']generator["'] content=["']([^"']+)["']/i.exec(html);
  if (generatorMatch) {
    return {
      detected: "custom",
      confidence: 0.5,
      details: `Generator: ${generatorMatch[1]}`,
    };
  }

  return { detected: "custom", confidence: 0.3, details: "Stack customizada ou não identificada" };
}
