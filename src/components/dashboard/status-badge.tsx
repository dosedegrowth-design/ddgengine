/**
 * StatusBadge — pill mono uppercase com cor por status
 * Usado em posts, visibility runs, etc.
 */
import { cn } from "@/lib/utils";

const VARIANTS: Record<string, { label: string; class: string }> = {
  published: {
    label: "Publicado",
    class: "bg-ddg-lime/20 text-ddg-lime-deep border-ddg-lime/40",
  },
  in_review: {
    label: "Em revisão",
    class: "bg-amber-100 text-amber-900 border-amber-300",
  },
  generating: {
    label: "Gerando",
    class: "bg-blue-100 text-blue-900 border-blue-300",
  },
  draft: {
    label: "Rascunho",
    class: "bg-ddg-stone text-ddg-muted border-ddg-stone",
  },
  archived: {
    label: "Arquivado",
    class: "bg-ddg-stone text-ddg-muted border-ddg-stone",
  },
  completed: {
    label: "Completo",
    class: "bg-ddg-lime/20 text-ddg-lime-deep border-ddg-lime/40",
  },
  running: {
    label: "Rodando",
    class: "bg-blue-100 text-blue-900 border-blue-300",
  },
  failed: {
    label: "Falhou",
    class: "bg-red-100 text-red-900 border-red-300",
  },
  pending: {
    label: "Pendente",
    class: "bg-ddg-stone text-ddg-muted border-ddg-stone",
  },
};

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: string;
  size?: "xs" | "sm";
  className?: string;
}) {
  const cfg = VARIANTS[status] ?? {
    label: status,
    class: "bg-ddg-stone text-ddg-muted border-ddg-stone",
  };
  const sizeClass =
    size === "xs"
      ? "text-[9px] px-1.5 py-0.5"
      : "text-[10px] px-2 py-0.5";
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono uppercase tracking-widest rounded-full border",
        sizeClass,
        cfg.class,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}
