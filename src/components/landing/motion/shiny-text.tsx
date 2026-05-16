/**
 * ShinyText — texto com gradiente animado infinito
 * Inspirado em Aura email — efeito "shimmer" sofisticado
 *
 * Diferente do ddg-text-shimmer (utility CSS): aqui o gradiente é
 * customizável por prop. Ideal pra headlines onde 1 palavra
 * precisa de destaque diferenciado.
 */
"use client";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function ShinyText({
  children,
  variant = "lime",
  className,
  duration = 5,
}: {
  children: ReactNode;
  variant?: "lime" | "white" | "premium";
  className?: string;
  /** Segundos do ciclo completo */
  duration?: number;
}) {
  const reduced = useReducedMotion();

  const gradients = {
    lime: "linear-gradient(90deg, #ffffff 0%, #ffffff 40%, #c8ff3d 50%, #ffffff 60%, #ffffff 100%)",
    white: "linear-gradient(90deg, #525252 0%, #525252 40%, #ffffff 50%, #525252 60%, #525252 100%)",
    premium: "linear-gradient(90deg, #0a0a0a 0%, #1a1a1a 40%, #c8ff3d 50%, #1a1a1a 60%, #0a0a0a 100%)",
  };

  if (reduced) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: gradients[variant],
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
        animation: `ddg-shiny-text ${duration}s linear infinite`,
      }}
    >
      {children}
    </span>
  );
}
