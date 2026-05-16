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
}: {
  className?: string;
}) {
  const reduced = useReducedMotion();

  // Paleta DDG estrita — apenas tons de lime + ink
  const palette = {
    limeBright: "#d4ff5e",
    lime: "#c8ff3d",
    limeDeep: "#a8e620",
  };

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-ddg-ink ${className ?? ""}`}
      aria-hidden
    >
      {/* Layer 1 — aurora principal grande rolando (lime forte) */}
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
            background: `radial-gradient(ellipse at 30% 40%, ${palette.lime}99 0%, transparent 52%), radial-gradient(ellipse at 70% 60%, ${palette.limeDeep}77 0%, transparent 55%)`,
            filter: "blur(90px)",
          }}
        />
      </div>

      {/* Layer 2 — aurora secundária em sentido oposto (lime bright) */}
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
            background: `radial-gradient(ellipse at 60% 30%, ${palette.limeBright}66 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, ${palette.lime}88 0%, transparent 55%)`,
            filter: "blur(110px)",
          }}
        />
      </div>

      {/* Layer 3 — wisp lateral suave (lime deep) */}
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
            background: `radial-gradient(ellipse at 80% 50%, ${palette.limeDeep}55 0%, transparent 62%), radial-gradient(ellipse at 10% 20%, ${palette.lime}44 0%, transparent 58%)`,
            filter: "blur(130px)",
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
