/**
 * basePath do blog — resolve o prefixo de URL dos links do blog conforme
 * onde ele está sendo servido:
 *
 *  - Subdomínio (blog.cliente.com.br): basePath = "" (links na raiz do subdomínio)
 *  - Preview/nosso domínio (conteudai.com.br/blog/{orgSlug}): basePath = "/blog/{orgSlug}"
 *
 * O middleware (proxy.ts) seta o header `x-blog-subdomain` quando a request
 * vem de um subdomínio de cliente. As pages leem esse header pra decidir o
 * basePath e gerar links limpos.
 */
import { headers } from "next/headers";

export const BLOG_SUBDOMAIN_HEADER = "x-blog-subdomain";
/** Setado pelo middleware no modo subdiretório (ex: "/blog") */
export const BLOG_BASEPATH_HEADER = "x-blog-basepath";

/**
 * Retorna o prefixo de URL pros links do blog. 3 modos:
 *  - Subdiretório (header x-blog-basepath, ex "/blog"): usa esse prefixo →
 *    links viram /blog/{slug} no domínio do cliente.
 *  - Subdomínio (header x-blog-subdomain): "" → links na raiz.
 *  - Preview (nosso domínio): /blog/{orgSlug}.
 */
export async function getBlogBasePath(orgSlug: string): Promise<string> {
  const h = await headers();
  const explicitBase = h.get(BLOG_BASEPATH_HEADER);
  if (explicitBase) return explicitBase;
  const subdomainHost = h.get(BLOG_SUBDOMAIN_HEADER);
  if (subdomainHost) return "";
  return `/blog/${orgSlug}`;
}

/**
 * Versão síncrona pra quando já se tem o host (ex: dentro do middleware
 * ou quando o header já foi lido). Não usa next/headers.
 */
export function blogBasePathFor(orgSlug: string, isSubdomain: boolean): string {
  return isSubdomain ? "" : `/blog/${orgSlug}`;
}

/**
 * URL pública canônica do blog. Quando o cliente já conectou o subdomínio
 * (blog_host verificado), o canonical/OG apontam pro DOMÍNIO DO CLIENTE
 * (`https://blog.cliente.com.br`) — é lá que o Google deve indexar, pra a
 * autoridade SEO ir pro domínio do cliente, não pro nosso.
 *
 * Se ainda não conectou, cai no nosso preview.
 */
export function publicBlogBaseUrl(opts: {
  blogHost?: string | null;
  cnameVerified?: boolean | null;
}): string | null {
  if (opts.blogHost && opts.cnameVerified) {
    return `https://${opts.blogHost}`;
  }
  return null;
}
