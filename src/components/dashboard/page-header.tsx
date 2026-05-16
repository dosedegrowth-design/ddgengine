/**
 * PageHeader — header padronizado pra cada página do painel
 *
 * Visual: bracket lime + display headline + sub opcional + actions à direita
 * Reutilizado em todas as pages internas do (app)
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  bracket: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({
  bracket,
  title,
  subtitle,
  actions,
  backHref,
  backLabel = "Voltar",
}: Props) {
  return (
    <header className="border-b-2 border-ddg-ink bg-ddg-paper">
      <div className="container mx-auto max-w-7xl px-6 py-6 md:py-8">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {backLabel}
          </Link>
        )}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="ddg-bracket mb-2">{bracket}</div>
            <h1 className="ddg-display text-3xl md:text-4xl truncate">{title}</h1>
            {subtitle && (
              <div className="mt-2 text-sm text-ddg-muted">{subtitle}</div>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </div>
    </header>
  );
}
