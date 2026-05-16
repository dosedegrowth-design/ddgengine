/**
 * Magnet — efeito magnético seguindo o cursor
 * Inspirado em portfolio 3D "Jack" — elementos "puxam" o mouse
 *
 * Uso ideal: CTAs principais, botões grandes, avatares.
 * Performance: usa transform translate3d + willChange.
 */
"use client";

import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

export function Magnet({
  children,
  strength = 0.35,
  padding = 80,
  className,
}: {
  children: ReactNode;
  /** Quanto o elemento "puxa" o cursor (0-1, default 0.35) */
  strength?: number;
  /** Distância em px que ativa o efeito */
  padding?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 18, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 200, damping: 18, mass: 0.5 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || reduced) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.max(rect.width, rect.height) / 2 + padding;
    if (dist < maxDist) {
      x.set(dx * strength);
      y.set(dy * strength);
    } else {
      x.set(0);
      y.set(0);
    }
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY, willChange: "transform" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
