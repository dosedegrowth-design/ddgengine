/**
 * AuroraBackground — efeito aurora fluindo continuamente no fundo
 * Inspirado em referência tipo signup Vercel/Linear com aurora colorida.
 *
 * Usa SVG com filtros gauss + animação CSS transform pra simular
 * gradientes orgânicos fluindo. Cores DDG (lime + dark) em vez do
 * arco-íris da referência — fica fiel à identidade.
 *
 * Performance: SVG estático com transforms via keyframes (GPU).
 * Sem JS animation loop. Respeita prefers-reduced-motion.
 */
"use client";

import { useReducedMotion } from "motion/react";

export function AuroraBackground({
  className,
  variant = "lime",
}: {
  className?: string;
  variant?: "lime" | "rainbow";
}) {
  const reduced = useReducedMotion();

  const palette =
    variant === "rainbow"
      ? {
          a: "#c8ff3d", // lime
          b: "#5BE9E9", // cyan
          c: "#7B5CFF", // roxo
          d: "#FF6B9D", // pink
          e: "#FFB84D", // orange
        }
      : {
          a: "#c8ff3d", // lime forte
          b: "#a8e620", // lime deep
          c: "#5BE9E9", // cyan accent sutil
          d: "#c8ff3d",
          e: "#a8e620",
        };

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-ddg-ink ${className ?? ""}`}
      aria-hidden
    >
      {/* Layer 1 — aurora principal grande rolando */}
      <div
        className="absolute -inset-[40%]"
        style={{
          animation: reduced ? undefined : "ddg-aurora-flow-1 28s ease-in-out infinite",
          willChange: "transform",
        }}
      >
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{
            background: `radial-gradient(ellipse at 30% 40%, ${palette.a}aa 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, ${palette.b}88 0%, transparent 55%)`,
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Layer 2 — aurora secundária em sentido oposto */}
      <div
        className="absolute -inset-[30%]"
        style={{
          animation: reduced ? undefined : "ddg-aurora-flow-2 36s ease-in-out infinite reverse",
          willChange: "transform",
        }}
      >
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{
            background: `radial-gradient(ellipse at 60% 30%, ${palette.c}77 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, ${palette.d}99 0%, transparent 55%)`,
            filter: "blur(100px)",
          }}
        />
      </div>

      {/* Layer 3 — wisp lateral suave */}
      <div
        className="absolute -inset-[20%]"
        style={{
          animation: reduced ? undefined : "ddg-aurora-flow-3 22s ease-in-out infinite",
          willChange: "transform",
        }}
      >
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{
            background: `radial-gradient(ellipse at 80% 50%, ${palette.e}66 0%, transparent 60%), radial-gradient(ellipse at 10% 20%, ${palette.a}55 0%, transparent 55%)`,
            filter: "blur(120px)",
          }}
        />
      </div>

      {/* Vinheta nas bordas pra concentrar o foco */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(10,10,10,0.55) 75%, rgba(10,10,10,0.85) 100%)",
        }}
      />

      {/* Grain sutil */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.12] mix-blend-overlay"
        preserveAspectRatio="none"
      >
        <filter id="ddg-aurora-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#ddg-aurora-grain)" />
      </svg>
    </div>
  );
}
