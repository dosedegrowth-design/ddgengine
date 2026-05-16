/**
 * FeatureCard — card com mockup mini do produto + descrição
 * Estilo Outlier+: 6 cards mistos no grid
 */
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function FeatureCard({
  label,
  title,
  description,
  visual,
  size = "md",
  variant = "light",
}: {
  label: string;
  title: string;
  description: string;
  visual?: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "group flex flex-col rounded-xl overflow-hidden border-2",
        size === "lg" && "md:col-span-2",
        variant === "light"
          ? "border-ddg-ink bg-ddg-paper"
          : "border-white/15 bg-ddg-graphite text-white"
      )}
    >
      {/* Visual area */}
      {visual && (
        <div
          className={cn(
            "relative p-5 border-b-2 min-h-[180px] flex items-center justify-center",
            variant === "light"
              ? "border-ddg-ink bg-ddg-cream"
              : "border-white/15 bg-black/40"
          )}
        >
          {visual}
        </div>
      )}
      {/* Content */}
      <div className="p-5 space-y-2">
        <div
          className={cn(
            "ddg-bracket",
            variant === "dark" && "text-white/40"
          )}
        >
          {label}
        </div>
        <h3 className="font-black text-lg md:text-xl tracking-tight uppercase">
          {title}
        </h3>
        <p
          className={cn(
            "text-sm leading-relaxed",
            variant === "light" ? "text-ddg-muted" : "text-white/60"
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
