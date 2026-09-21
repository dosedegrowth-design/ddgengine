/**
 * BlogShell — wrapper das pages públicas do blog.
 *
 * Aplica brand tokens (cor + fonte) via CSS variables e classes do template.
 * Carrega Google Font dinamicamente se o cliente configurou font_url.
 *
 * Cada template tem sua "personalidade" via CSS class no <body>:
 *  - blog-editorial: fonte serif no conteúdo, sans na UI
 *  - blog-magazine:  sans heavy, cards grandes
 *  - blog-minimal:   sans uniforme, sem ornamento
 *  - blog-bold:      brutalist, borders pretas grossas
 */
import Link from "next/link";
import {
  type BlogTemplate,
  type BrandTokens,
  brandTokensToCSSVars,
  TEMPLATE_BODY_CLASS,
} from "@/lib/blog/templates";
import { type BlogCta, ctaHref } from "@/lib/blog/cta";

interface Props {
  template: BlogTemplate;
  tokens: BrandTokens;
  orgSlug: string;
  orgName: string;
  /** Prefixo dos links. "" no subdomínio, "/blog/{orgSlug}" no preview. */
  basePath: string;
  cta?: BlogCta;
  children: React.ReactNode;
}

export function BlogShell({ template, tokens, orgSlug, orgName, basePath, cta, children }: Props) {
  const style = brandTokensToCSSVars(tokens);
  const bodyClass = TEMPLATE_BODY_CLASS[template];
  void orgSlug; // mantido na assinatura por compat; links usam basePath

  // Quando detectamos bg/text do cliente, sobrepõe o do template via inline
  // (a classe do template ainda dá o "esqueleto", mas a cor real vem do DNA).
  const overrides: React.CSSProperties = {};
  if (tokens.bg_color) overrides.backgroundColor = "var(--blog-bg)";
  if (tokens.text_color) overrides.color = "var(--blog-text)";

  return (
    <div
      className={`blog-shell min-h-screen ${bodyClass}`}
      style={{ ...style, ...overrides }}
    >
      {/* Fontes dinâmicas do cliente (corpo + título) */}
      {tokens.font_url && (
        // eslint-disable-next-line @next/next/no-css-tags
        <link rel="stylesheet" href={tokens.font_url} />
      )}
      {tokens.heading_font_url && tokens.heading_font_url !== tokens.font_url && (
        // eslint-disable-next-line @next/next/no-css-tags
        <link rel="stylesheet" href={tokens.heading_font_url} />
      )}

      <SiteHeader template={template} basePath={basePath} orgName={orgName} cta={cta} />

      <main>{children}</main>

      <SiteFooter template={template} orgName={orgName} cta={cta} />
    </div>
  );
}

function SiteHeader({
  template,
  basePath,
  orgName,
  cta,
}: {
  template: BlogTemplate;
  basePath: string;
  orgName: string;
  cta?: BlogCta;
}) {
  const headerClass =
    template === "bold"
      ? "border-b-4 border-black bg-yellow-100"
      : template === "magazine"
      ? "border-b border-black/10 bg-white"
      : template === "minimal"
      ? "border-b border-stone-200 bg-white"
      : "border-b border-stone-200 bg-stone-50";

  const linkClass =
    template === "bold"
      ? "font-black text-xl tracking-tight"
      : template === "magazine"
      ? "font-black text-lg tracking-tight"
      : template === "minimal"
      ? "font-medium text-base tracking-tight"
      : "font-semibold text-lg tracking-tight";

  return (
    <header className={headerClass}>
      <div className="container mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
        <Link href={basePath || "/"} className={linkClass}>
          {orgName}
        </Link>
        <nav className="flex items-center gap-4">
          {cta?.site_url && (
            <a href={cta.site_url} className="text-sm opacity-70 hover:opacity-100 hidden sm:inline">Site</a>
          )}
          <Link
            href={`${basePath}/search`}
            className="text-sm text-current/70 hover:opacity-100 opacity-70"
          >
            Buscar
          </Link>
          {cta && (
            <a href={ctaHref(cta)} target="_blank" rel="noopener" className="hidden sm:inline-flex items-center rounded-full px-4 h-9 text-sm font-semibold transition hover:opacity-90" style={{ background: "var(--blog-primary)", color: "#fff" }}>
              {cta.botao}
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter({ template, orgName, cta }: { template: BlogTemplate; orgName: string; cta?: BlogCta }) {
  const year = new Date().getFullYear();
  const footerClass =
    template === "bold"
      ? "border-t-4 border-black bg-yellow-100 mt-16"
      : template === "magazine"
      ? "border-t border-black/10 bg-white mt-16"
      : template === "minimal"
      ? "border-t border-stone-200 bg-white mt-20"
      : "border-t border-stone-200 bg-stone-50 mt-20";

  return (
    <footer className={footerClass}>
      <div className="container mx-auto max-w-5xl px-6 py-8 text-xs text-current/60 flex flex-wrap items-center justify-between gap-2">
        <span>© {year} {orgName}. Todos os direitos reservados.</span>
        <span className="flex items-center gap-4">
          {cta?.site_url && <a href={cta.site_url} className="hover:opacity-100">Site oficial</a>}
          {cta && <a href={ctaHref(cta)} target="_blank" rel="noopener" className="hover:opacity-100" style={{ color: "var(--blog-primary)" }}>{cta.botao}</a>}
        </span>
      </div>
    </footer>
  );
}
