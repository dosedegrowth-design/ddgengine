"use client";

/**
 * Seletor do método de instalação do blog:
 *   - Subdomínio (blog.seusite.com.br) — self-service, 1 CNAME. PADRÃO.
 *   - Subdiretório (seusite.com.br/blog) — avançado, reverse proxy na origem
 *     (a gente configura ou o dev do cliente).
 */
import { useState } from "react";
import { Globe, FolderTree, Check } from "lucide-react";
import { IntegrationWizard } from "./wizard";
import { SubdirectoryPanel } from "./subdirectory-panel";

type Method = "subdomain" | "subdirectory";

interface Props {
  siteId: string;
  domain: string;
  state: string;
  blogHost: string;
  cnameName: string;
  cnameTarget: string;
  tenantSlug: string;
}

export function InstallMethodChooser(props: Props) {
  const [method, setMethod] = useState<Method>("subdomain");

  return (
    <div className="space-y-5">
      {/* Cards de escolha */}
      <div className="grid sm:grid-cols-2 gap-3">
        <MethodCard
          active={method === "subdomain"}
          onClick={() => setMethod("subdomain")}
          icon={Globe}
          badge="Recomendado"
          title={`blog.${props.domain}`}
          subtitle="Você mesmo conecta em ~5 min (1 registro CNAME). Funciona em qualquer site."
        />
        <MethodCard
          active={method === "subdirectory"}
          onClick={() => setMethod("subdirectory")}
          icon={FolderTree}
          badge="Avançado"
          title={`${props.domain}/blog`}
          subtitle="A gente (ou seu dev) configura no seu servidor. Pra quem quer o blog no domínio raiz."
        />
      </div>

      {/* Conteúdo do método escolhido */}
      {method === "subdomain" ? (
        <IntegrationWizard
          siteId={props.siteId}
          domain={props.domain}
          state={props.state}
          blogHost={props.blogHost}
          cnameName={props.cnameName}
          cnameTarget={props.cnameTarget}
        />
      ) : (
        <SubdirectoryPanel domain={props.domain} tenantSlug={props.tenantSlug} />
      )}
    </div>
  );
}

function MethodCard({
  active,
  onClick,
  icon: Icon,
  badge,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-2xl border-2 transition-all ${
        active
          ? "border-ddg-ink bg-ddg-paper shadow-[4px_4px_0_var(--ddg-ink)]"
          : "border-ddg-stone bg-ddg-paper hover:border-ddg-ink/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 ${
            active
              ? "border-ddg-ink bg-ddg-lime text-ddg-ink"
              : "border-ddg-stone text-ddg-muted"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span
          className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${
            badge === "Recomendado"
              ? "bg-ddg-lime text-ddg-ink font-bold"
              : "bg-ddg-stone text-ddg-muted"
          }`}
        >
          {badge}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <code className="font-mono text-sm font-bold text-ddg-ink truncate">
          {title}
        </code>
        {active && <Check className="w-3.5 h-3.5 text-ddg-lime-deep shrink-0" />}
      </div>
      <p className="text-xs text-ddg-muted mt-1 leading-relaxed">{subtitle}</p>
    </button>
  );
}
