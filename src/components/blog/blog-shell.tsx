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

interface Props {
  template: BlogTemplate;
  tokens: BrandTokens;
  orgSlug: string;
  orgName: string;
  /** Prefixo dos links. "" no subdomínio, "/blog/{orgSlug}" no preview. */
  basePath: string;
  children: React.ReactNode;
}

export function BlogShell({ template, tokens, orgSlug, orgName, basePath, children }: Props) {
  const style = brandTokensToCSSVars(tokens);
  const bodyClass = TEMPLATE_BODY_CLASS[template];
  void orgSlug; // mantido na assinatura por compat; links usam basePath

  return (
    <div className={`min-h-screen ${bodyClass}`} style={style}>
      {/* Font dinâmica do cliente, se houver */}
      {tokens.font_url && (
        // eslint-disable-next-line @next/next/no-css-tags
        <link rel="stylesheet" href={tokens.font_url} />
      )}

      <SiteHeader template={template} basePath={basePath} orgName={orgName} />

      <main>{children}</main>

      <SiteFooter template={template} orgName={orgName} />
    </div>
  );
}

function SiteHeader({
  template,
  basePath,
  orgName,
}: {
  template: BlogTemplate;
  basePath: string;
  orgName: string;
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
        <Link
          href={`${basePath}/search`}
          className="text-sm text-current/70 hover:opacity-100 opacity-70"
        >
          Buscar
        </Link>
      </div>
    </header>
  );
}

function SiteFooter({ template, orgName }: { template: BlogTemplate; orgName: string }) {
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
        <span>
          Powered by <span style={{ color: "var(--blog-accent)" }}>blog</span>
        </span>
      </div>
    </footer>
  );
}
