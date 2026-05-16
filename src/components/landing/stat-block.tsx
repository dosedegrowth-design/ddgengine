/**
 * StatBlock — número gigante + label
 * Estilo RANTY: serif XXL, lime glow opcional
 */
import { cn } from "@/lib/utils";

export function StatBlock({
  value,
  label,
  helper,
  size = "lg",
  glow = false,
  variant = "dark",
}: {
  value: string;
  label: string;
  helper?: string;
  size?: "md" | "lg" | "xl";
  glow?: boolean;
  variant?: "dark" | "light";
}) {
  const sizeClass = {
    md: "text-5xl md:text-6xl",
    lg: "text-6xl md:text-7xl",
    xl: "text-7xl md:text-9xl",
  }[size];

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "ddg-stat ddg-counter font-black",
          sizeClass,
          variant === "dark" ? "text-ddg-paper" : "text-ddg-ink",
          glow && "drop-shadow-[0_0_24px_rgba(200,255,61,0.35)]"
        )}
        style={{ fontFamily: 'ui-serif, "Times New Roman", serif' }}
      >
        {value}
      </div>
      <div
        className={cn(
          "text-sm md:text-base uppercase tracking-widest font-bold",
          variant === "dark" ? "text-ddg-paper/70" : "text-ddg-ink/70"
        )}
      >
        {label}
      </div>
      {helper && (
        <div
          className={cn(
            "text-xs leading-relaxed max-w-xs",
            variant === "dark" ? "text-ddg-paper/50" : "text-ddg-muted"
          )}
        >
          {helper}
        </div>
      )}
    </div>
  );
}
