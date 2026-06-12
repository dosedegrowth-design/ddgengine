"use client";

/**
 * Painel do modo AVANÇADO — blog no subdiretório (seusite.com.br/blog).
 *
 * Não é self-service pra leigo: exige uma regra de reverse proxy na origem
 * do site do cliente. Então oferecemos 2 saídas:
 *   1. "A gente configura pra você" → dispara o fluxo de concierge.
 *   2. Snippet pronto por stack → pro dev do cliente colar.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Code2, Sparkles, ArrowDown } from "lucide-react";

interface Props {
  domain: string;
  /** Slug do tenant — usado no destino do proxy. */
  tenantSlug: string;
}

type StackId = "vercel" | "nginx" | "apache" | "cloudflare" | "wordpress" | "outro";

const STACKS: Array<{ id: StackId; label: string }> = [
  { id: "vercel", label: "Vercel / Next.js" },
  { id: "nginx", label: "Nginx" },
  { id: "apache", label: "Apache" },
  { id: "cloudflare", label: "Cloudflare (do cliente)" },
  { id: "wordpress", label: "WordPress" },
  { id: "outro", label: "Outro / não sei" },
];

function snippetFor(stack: StackId, tenant: string): string {
  const dest = `https://conteudai.com.br/_proxy/${tenant}`;
  switch (stack) {
    case "vercel":
      return `// vercel.json (ou next.config rewrites)
{
  "rewrites": [
    {
      "source": "/blog/:path*",
      "destination": "${dest}/:path*"
    }
  ]
}`;
    case "nginx":
      return `# nginx.conf — dentro do server { }
location /blog/ {
    proxy_pass ${dest}/;
    proxy_set_header Host conteudai.com.br;
    proxy_ssl_server_name on;
}`;
    case "apache":
      return `# Apache (mod_proxy + mod_ssl)
SSLProxyEngine on
ProxyPass        /blog/ ${dest}/
ProxyPassReverse /blog/ ${dest}/`;
    case "cloudflare":
      return `// Cloudflare Worker (na conta do cliente) + rota seusite.com.br/blog/*
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\\/blog/, "");
    return fetch("${dest}" + path + url.search, request);
  }
}`;
    case "wordpress":
      return `# WordPress: precisa de reverse proxy no servidor (Nginx/Apache acima)
# ou plugin de proxy. Aponte /blog/ para:
${dest}/
# (a maioria dos casos é mais simples usar o subdomínio blog.${"{dominio}"})`;
    case "outro":
      return `# Encaminhe (reverse proxy) /blog/* do seu domínio para:
${dest}/
# Mantenha o Host original e repasse o path após /blog.
# Se seu host não permite proxy (Wix/Squarespace), use o subdomínio.`;
  }
}

export function SubdirectoryPanel({ domain, tenantSlug }: Props) {
  const [stack, setStack] = useState<StackId>("vercel");
  const [copied, setCopied] = useState(false);
  const snippet = snippetFor(stack, tenantSlug).replace("{dominio}", domain);

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Snippet copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Explicação */}
      <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5">
        <div className="ddg-bracket mb-2">MODO AVANÇADO · SUBDIRETÓRIO</div>
        <h3 className="font-black text-lg text-ddg-ink mb-1">
          Blog em {domain}/blog
        </h3>
        <p className="text-sm text-ddg-muted leading-relaxed">
          O blog no caminho do seu domínio raiz consolida um pouco mais a
          autoridade de SEO. Diferente do subdomínio (que é só 1 registro DNS),
          isso exige uma <strong className="text-ddg-ink">regra de reverse
          proxy</strong> no servidor onde seu site está hospedado. Por isso a
          gente não deixa você &ldquo;se virar&rdquo; — escolhe abaixo:
        </p>
      </div>

      {/* Opção 1: a gente configura */}
      <div className="rounded-2xl border-2 border-ddg-lime bg-ddg-lime/10 p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-ddg-lime border-2 border-ddg-ink">
            <Sparkles className="w-5 h-5 text-ddg-ink" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base text-ddg-ink mb-1">
              A gente configura pra você
            </h4>
            <p className="text-sm text-ddg-muted leading-relaxed">
              Você compartilha o acesso do seu host (ou conecta a gente com seu
              dev) e o time DDG instala o /blog em até 24h úteis. Sem você mexer
              em nada técnico. Use o botão{" "}
              <strong className="text-ddg-ink">&ldquo;Configurar pra mim&rdquo;</strong>{" "}
              logo abaixo nesta página.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-ddg-lime-deep">
              <ArrowDown className="w-3.5 h-3.5" />
              Configurar pra mim
            </div>
          </div>
        </div>
      </div>

      {/* Opção 2: snippet pro dev */}
      <div className="rounded-2xl border-2 border-ddg-stone bg-ddg-paper p-5">
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="w-4 h-4 text-ddg-muted" />
          <h4 className="font-bold text-base text-ddg-ink">
            Tem um dev? Passa esse código pra ele
          </h4>
        </div>

        {/* Seletor de stack */}
        <div className="flex flex-wrap gap-2 mb-3">
          {STACKS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStack(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                stack === s.id
                  ? "border-ddg-ink bg-ddg-lime text-ddg-ink shadow-[2px_2px_0_var(--ddg-ink)]"
                  : "border-ddg-stone text-ddg-muted hover:border-ddg-ink/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Snippet */}
        <div className="relative">
          <pre className="rounded-lg border-2 border-ddg-ink bg-ddg-ink text-ddg-paper p-4 text-xs font-mono overflow-x-auto leading-relaxed">
            {snippet}
          </pre>
          <button
            type="button"
            onClick={copy}
            className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-ddg-paper/10 hover:bg-ddg-paper/20 text-ddg-paper text-xs font-bold transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-ddg-muted mt-3 leading-relaxed">
          O destino <code className="text-ddg-ink">_proxy/{tenantSlug}</code> é
          o endpoint que serve o seu blog. O resto do seu site fica intocado.
          Depois que o dev aplicar, me avisa que a gente confirma que tá no ar.
        </p>
      </div>
    </div>
  );
}
