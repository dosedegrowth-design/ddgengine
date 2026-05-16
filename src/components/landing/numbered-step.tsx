/**
 * NumberedStep — passos 01/02/03/04 estilo ARCMAIL/Brutalist
 * Número XXL preto + título + descrição + ícone opcional
 */
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function NumberedStep({
  number,
  title,
  description,
  badge,
  icon: Icon,
  align = "left",
}: {
  number: string;
  title: string;
  description: string;
  badge?: string;
  icon?: LucideIcon;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-4 p-6 border-2 border-ddg-ink bg-ddg-paper",
        "transition-all duration-200 hover:bg-ddg-cream hover:-translate-y-1",
        align === "center" && "items-center text-center"
      )}
    >
      <div className="flex items-baseline justify-between w-full">
        <span
          className="ddg-display text-7xl md:text-8xl tracking-tighter"
          style={{ fontFamily: 'ui-serif, "Times New Roman", serif' }}
        >
          {number}
        </span>
        {Icon && (
          <Icon className="w-6 h-6 text-ddg-ink opacity-30 group-hover:opacity-100 group-hover:text-ddg-lime-deep transition" />
        )}
      </div>

      {badge && (
        <div className="ddg-bracket inline-block">{badge}</div>
      )}

      <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase">
        {title}
      </h3>

      <p className="text-base text-ddg-muted leading-relaxed">{description}</p>
    </div>
  );
}
