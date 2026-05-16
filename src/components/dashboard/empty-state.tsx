/**
 * EmptyState — card vazio padronizado pra listas/dashboards sem dados
 */
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon: Icon, title, description, cta }: Props) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ddg-ink/30 bg-ddg-cream/50 p-10 md:p-14 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ddg-ink text-ddg-paper mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-black text-ddg-ink mb-2">{title}</h3>
      <p className="text-sm text-ddg-muted max-w-md mx-auto leading-relaxed mb-5">
        {description}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
        >
          {cta.label}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
