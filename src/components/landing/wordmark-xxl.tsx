/**
 * WordmarkXXL — DDG ENGINE em tamanho gigante no footer
 * Estilo INSOMIO/ARCMAIL: ocupa quase toda a largura
 */
import { cn } from "@/lib/utils";

export function WordmarkXXL({
  variant = "light",
  className,
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ddg-wordmark text-[18vw] md:text-[14vw] leading-[0.85] select-none",
        variant === "light" ? "text-ddg-ink" : "text-ddg-paper",
        className
      )}
    >
      DDG <span className="text-ddg-lime">●</span> ENGINE
    </div>
  );
}
