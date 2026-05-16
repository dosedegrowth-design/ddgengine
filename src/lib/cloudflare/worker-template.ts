/**
 * Template do Cloudflare Worker — reverse proxy do blog do cliente.
 *
 * Cada cliente recebe um Worker próprio, injetado no domínio dele
 * via rota `cliente.com/blog/*`. O Worker faz proxy pro nosso
 * servidor (tenant-X.ddg.engine) e reescreve URLs no HTML pra
 * parecer 100% nativo do domínio do cliente.
 *
 * Resultado SEO: subdiretório `/blog` mantém autoridade do domínio
 * principal (caso real Salesforce: +100% tráfego ao migrar de
 * subdomínio pra subdiretório).
 */

export interface WorkerTemplateVars {
  /** Tenant slug — ex: tenant-12345 */
  tenantSlug: string;
  /** Origem do nosso servidor (ex: app.ddgengine.com.br) */
  upstreamOrigin: string;
  /** Domínio do cliente (ex: meusite.com.br) */
  customerDomain: string;
  /** Caminho onde o blog vive no site do cliente (default: /blog) */
  blogPath: string;
}

/**
 * Gera o código JavaScript do Worker pra um tenant específico.
 * Esse código é uploadado pra Cloudflare via API.
 */
export function renderWorkerScript(vars: WorkerTemplateVars): string {
  const { tenantSlug, upstreamOrigin, customerDomain, blogPath } = vars;
  const path = blogPath.startsWith("/") ? blogPath : `/${blogPath}`;

  return `/**
 * DDG Engine — Reverse Proxy Worker
 * Tenant: ${tenantSlug}
 * Customer: ${customerDomain}
 * Generated: ${new Date().toISOString()}
 */

const UPSTREAM_ORIGIN = ${JSON.stringify(`https://${upstreamOrigin}`)};
const CUSTOMER_ORIGIN = ${JSON.stringify(`https://${customerDomain}`)};
const TENANT_SLUG = ${JSON.stringify(tenantSlug)};
const BLOG_PATH = ${JSON.stringify(path)};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Só intercepta requisições no /blog/*
    if (!url.pathname.startsWith(BLOG_PATH)) {
      return fetch(request);
    }

    // Constroi URL no upstream
    const upstreamPath = url.pathname.replace(BLOG_PATH, "") || "/";
    const upstreamUrl = UPSTREAM_ORIGIN + "/_proxy/" + TENANT_SLUG + upstreamPath + url.search;

    // Forward request com headers limpos
    const fwdHeaders = new Headers(request.headers);
    fwdHeaders.set("X-DDG-Tenant", TENANT_SLUG);
    fwdHeaders.set("X-DDG-Customer-Domain", url.hostname);
    fwdHeaders.set("X-Forwarded-Host", url.hostname);
    fwdHeaders.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
    fwdHeaders.delete("host");

    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: fwdHeaders,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "follow",
    });

    let response;
    try {
      response = await fetch(upstreamRequest, {
        cf: {
          cacheTtl: 300,
          cacheEverything: false,
        },
      });
    } catch (err) {
      return new Response("Blog temporariamente indisponível", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const contentType = response.headers.get("Content-Type") || "";

    // Apenas HTML é reescrito
    if (!contentType.toLowerCase().includes("text/html")) {
      return passThrough(response);
    }

    const html = await response.text();
    const rewritten = rewriteHtml(html, url);

    const outHeaders = new Headers(response.headers);
    outHeaders.delete("content-length");
    outHeaders.set("X-DDG-Proxy", "v1");

    return new Response(rewritten, {
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders,
    });
  },
};

function passThrough(response) {
  const h = new Headers(response.headers);
  h.set("X-DDG-Proxy", "pass-through");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: h,
  });
}

function rewriteHtml(html, customerUrl) {
  // Troca origem upstream pelo customer domain
  let out = html.split(UPSTREAM_ORIGIN).join(CUSTOMER_ORIGIN);

  // Reescreve URLs absolutas que apontam pro nosso domínio
  out = out.replace(/https?:\\/\\/[^\\s"'<>]+\\/_proxy\\/[^\\s"'<>]+/g, function(match) {
    try {
      const u = new URL(match);
      const tail = u.pathname.replace("/_proxy/" + TENANT_SLUG, "");
      return CUSTOMER_ORIGIN + BLOG_PATH + tail;
    } catch (e) {
      return match;
    }
  });

  // Reescreve canonical e og:url se apontarem pro nosso domínio
  out = out.replace(
    /<link\\s+rel=["']canonical["']\\s+href=["']([^"']+)["']/gi,
    function(match, href) {
      const rewritten = rewriteUrl(href);
      return '<link rel="canonical" href="' + rewritten + '"';
    }
  );

  out = out.replace(
    /<meta\\s+property=["']og:url["']\\s+content=["']([^"']+)["']/gi,
    function(match, content) {
      const rewritten = rewriteUrl(content);
      return '<meta property="og:url" content="' + rewritten + '"';
    }
  );

  // Adiciona <base href> garantindo URLs relativas funcionem
  if (!out.includes("<base ")) {
    out = out.replace(
      /<head([^>]*)>/i,
      '<head$1>\\n<base href="' + customerUrl.origin + BLOG_PATH + '/">'
    );
  }

  return out;
}

function rewriteUrl(href) {
  try {
    const u = new URL(href);
    if (u.host === new URL(UPSTREAM_ORIGIN).host) {
      const tail = u.pathname.replace("/_proxy/" + TENANT_SLUG, "");
      return CUSTOMER_ORIGIN + BLOG_PATH + tail + u.search + u.hash;
    }
    return href;
  } catch (e) {
    return href;
  }
}
`;
}

/**
 * Nome do Worker no Cloudflare (slug único).
 */
export function workerName(tenantSlug: string): string {
  return `ddg-engine-${tenantSlug}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 63);
}

/**
 * Rota do Worker (custom domain do cliente).
 */
export function workerRoute(customerDomain: string, blogPath = "/blog"): string {
  const cleanPath = blogPath.startsWith("/") ? blogPath : `/${blogPath}`;
  return `${customerDomain}${cleanPath}/*`;
}
