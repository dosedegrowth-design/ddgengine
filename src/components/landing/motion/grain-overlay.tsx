/**
 * GrainOverlay — SVG noise filter sutil sobre toda a section
 * Inspirado em Aura / Prisma — dá textura editorial premium
 *
 * Sem CSS animation pesado. Apenas SVG filter rasterizado.
 */

export function GrainOverlay({
  opacity = 0.05,
  className,
}: {
  opacity?: number;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 mix-blend-overlay z-[1] ${className ?? ""}`}
      style={{ opacity }}
      aria-hidden
    >
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <filter id="ddg-grain-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#ddg-grain-filter)" />
      </svg>
    </div>
  );
}
