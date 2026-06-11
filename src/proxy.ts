/**
 * Middleware raiz (Next.js 16 chama de `proxy`).
 *
 * Dois caminhos:
 *  1. Hosts do nosso app (conteudai.com.br, *.vercel.app, localhost):
 *     fluxo normal → updateSession (auth Supabase).
 *  2. Subdomínio de blog do cliente (blog.cliente.com.br):
 *     resolve o tenant pelo Host e reescreve pra /blog/{orgSlug}/...
 *     servindo o blog daquele cliente com URLs limpas na raiz.
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { BLOG_SUBDOMAIN_HEADER } from "@/lib/blog/base-path";

/** Hosts que são o NOSSO app (não subdomínio de cliente). */
const APP_HOSTS = new Set([
  "conteudai.com.br",
  "www.conteudai.com.br",
  "localhost",
]);

function isAppHost(host: string): boolean {
  if (APP_HOSTS.has(host)) return true;
  // Preview/prod da Vercel
  if (host.endsWith(".vercel.app")) return true;
  return false;
}

/**
 * Resolve o orgSlug a partir do host do blog (blog.cliente.com.br),
 * consultando o Supabase REST (edge-friendly).
 */
async function resolveOrgSlugByHost(host: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/sites?select=organizations(slug)&blog_host=eq.${encodeURIComponent(
        host
      )}&cname_verified=eq.true&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Accept-Profile": "ddg_engine",
        },
        // Cache curto pra não bater no banco a cada request
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      organizations?: { slug?: string } | null;
    }>;
    return rows?.[0]?.organizations?.slug ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const rawHost = request.headers.get("host") ?? "";
  const host = rawHost.toLowerCase().split(":")[0];

  // Caminho 1: nosso app → auth normal
  if (isAppHost(host)) {
    return await updateSession(request);
  }

  // Caminho 2: subdomínio de blog do cliente
  const orgSlug = await resolveOrgSlugByHost(host);
  if (!orgSlug) {
    // Host desconhecido / ainda não verificado → 404 limpo
    return new NextResponse("Blog não encontrado ou ainda não ativado.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Reescreve blog.cliente.com.br/{path} → /blog/{orgSlug}/{path}
  const url = request.nextUrl.clone();
  const path = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/blog/${orgSlug}${path}`;

  // Seta REQUEST header (não response) pra as Server Components lerem via headers()
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(BLOG_SUBDOMAIN_HEADER, host);

  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths exceto:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files com extensão
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
