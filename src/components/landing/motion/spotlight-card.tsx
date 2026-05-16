/**
 * SpotlightCard — gradiente lime seguindo o cursor sobre o card
 * Inspirado em Aura liquid-glass / Vercel/Linear cards modernos
 *
 * Quando o mouse passa, um glow lime "ilumina" a parte do card
 * mais próxima. Borda também acende sutilmente.
 */
"use client";

import { useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className,
  intensity = 0.18,
}: {
  children: ReactNode;
  className?: string;
  /** Opacidade máxima do glow (0-1) */
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [active, setActive] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || reduced) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className={cn("relative overflow-hidden group", className)}
    >
      {/* Spotlight overlay */}
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: active ? intensity : 0,
            background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, rgba(200, 255, 61, 0.4), transparent 50%)`,
          }}
          aria-hidden
        />
      )}
      {/* Border glow */}
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: active ? 0.5 : 0,
            background: `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, rgba(200, 255, 61, 0.3), transparent 40%)`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: "1px",
          }}
          aria-hidden
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
