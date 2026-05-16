/**
 * BrandMark — placeholder do logo final
 *
 * Quando o nome/logo final vier, edita SÓ este arquivo.
 * Tudo no site atualiza automaticamente.
 */
import { cn } from "@/lib/utils";

const BRAND_NAME_LEFT = "DDG";
const BRAND_NAME_RIGHT = "ENGINE";

export function BrandMark({
  variant = "wordmark",
  size = "md",
  className,
  asLink = false,
}: {
  variant?: "wordmark" | "lockup" | "symbol";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  asLink?: boolean;
}) {
  const sizeClass = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-3xl md:text-4xl",
    xl: "text-5xl md:text-6xl",
  }[size];

  if (variant === "symbol") {
    // Símbolo isolado: bolinha lime
    return (
      <span
        aria-label={`${BRAND_NAME_LEFT} ${BRAND_NAME_RIGHT}`}
        className={cn(
          "inline-block rounded-full bg-ddg-lime",
          size === "sm" && "h-3 w-3",
          size === "md" && "h-4 w-4",
          size === "lg" && "h-6 w-6",
          size === "xl" && "h-10 w-10",
          className
        )}
      />
    );
  }

  return (
    <span
      aria-label={`${BRAND_NAME_LEFT} ${BRAND_NAME_RIGHT}`}
      className={cn(
        "inline-flex items-center gap-1.5 font-black tracking-tight select-none",
        sizeClass,
        asLink && "hover:opacity-80 transition-opacity",
        className
      )}
    >
      <span className="text-ddg-ink">{BRAND_NAME_LEFT}</span>
      <span
        className={cn(
          "rounded-full bg-ddg-lime",
          size === "sm" && "h-1.5 w-1.5",
          size === "md" && "h-2 w-2",
          size === "lg" && "h-3 w-3",
          size === "xl" && "h-4 w-4"
        )}
        aria-hidden
      />
      <span className="text-ddg-ink">{BRAND_NAME_RIGHT}</span>
    </span>
  );
}

/**
 * BrandMark "inverted" — usado em backgrounds escuros
 */
export function BrandMarkInverted({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeClass = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-3xl md:text-4xl",
    xl: "text-5xl md:text-6xl",
  }[size];

  return (
    <span
      aria-label={`${BRAND_NAME_LEFT} ${BRAND_NAME_RIGHT}`}
      className={cn(
        "inline-flex items-center gap-1.5 font-black tracking-tight select-none",
        sizeClass,
        className
      )}
    >
      <span className="text-ddg-paper">{BRAND_NAME_LEFT}</span>
      <span
        className={cn(
          "rounded-full bg-ddg-lime",
          size === "sm" && "h-1.5 w-1.5",
          size === "md" && "h-2 w-2",
          size === "lg" && "h-3 w-3",
          size === "xl" && "h-4 w-4"
        )}
        aria-hidden
      />
      <span className="text-ddg-paper">{BRAND_NAME_RIGHT}</span>
    </span>
  );
}
