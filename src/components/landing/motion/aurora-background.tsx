/**
 * AuroraBackground — auroras lime fluindo visivelmente no fundo
 *
 * Estratégia revista: blobs grandes mas com movimento DRAMÁTICO
 * (translate 30-60% ao invés de 5-8%), blur reduzido (50-70px) pra
 * blob shapes distintos e perceptíveis. Movimento orgânico via
 * 4 keyframes que combinam translate + scale + rotate.
 *
 * Paleta DDG estrita: lime + limeBright + limeDeep + ink base.
 */
"use client";

import { useReducedMotion } from "motion/react";

export function AuroraBackground({
  className,
}: {
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-ddg-ink ${className ?? ""}`}
      aria-hidden
    >
      {/* Blob 1 — lime forte, canto superior-esquerdo viajando */}
      <div
        className="absolute h-[55vw] w-[55vw] rounded-full"
        style={{
          left: "-15%",
          top: "-15%",
          background:
            "radial-gradient(circle at center, #c8ff3d 0%, #c8ff3d99 30%, transparent 70%)",
          filter: "blur(60px)",
          mixBlendMode: "screen",
          animation: reduced ? undefined : "ddg-aurora-blob-1 18s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Blob 2 — lime bright, canto inferior-direito */}
      <div
        className="absolute h-[50vw] w-[50vw] rounded-full"
        style={{
          right: "-12%",
          bottom: "-12%",
          background:
            "radial-gradient(circle at center, #d4ff5e 0%, #d4ff5e88 35%, transparent 75%)",
          filter: "blur(55px)",
          mixBlendMode: "screen",
          animation: reduced ? undefined : "ddg-aurora-blob-2 22s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Blob 3 — lime deep, no meio rolando */}
      <div
        className="absolute h-[45vw] w-[45vw] rounded-full"
        style={{
          left: "50%",
          top: "30%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle at center, #a8e620 0%, #a8e62077 40%, transparent 75%)",
          filter: "blur(70px)",
          mixBlendMode: "screen",
          animation: reduced ? undefined : "ddg-aurora-blob-3 26s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Blob 4 — lime médio, viajando da direita pra esquerda */}
      <div
        className="absolute h-[40vw] w-[40vw] rounded-full"
        style={{
          right: "-8%",
          top: "20%",
          background:
            "radial-gradient(circle at center, #c8ff3d 0%, #c8ff3d66 40%, transparent 75%)",
          filter: "blur(50px)",
          mixBlendMode: "screen",
          animation: reduced ? undefined : "ddg-aurora-blob-4 20s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Blob 5 — pequeno, accent rápido no fundo */}
      <div
        className="absolute h-[30vw] w-[30vw] rounded-full"
        style={{
          left: "10%",
          bottom: "10%",
          background:
            "radial-gradient(circle at center, #d4ff5e 0%, #d4ff5e55 50%, transparent 80%)",
          filter: "blur(40px)",
          mixBlendMode: "screen",
          animation: reduced ? undefined : "ddg-aurora-blob-5 16s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Camada dark por cima pra reduzir saturação geral */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.75) 70%, rgba(10,10,10,0.92) 100%)",
        }}
      />

      {/* SVG noise grain — toque editorial */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.10] mix-blend-overlay pointer-events-none"
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
