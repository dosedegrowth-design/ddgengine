/**
 * CursorTrail — micro-dots lime seguindo o cursor
 * Funciona dentro de uma area específica (não site inteiro).
 *
 * Performance: usa apenas 6 dots com spring de stiffness diferente,
 * gerando o efeito "rastro" sem custo alto.
 */
"use client";

import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const DOT_COUNT = 5;
const DOT_STIFFNESS = [400, 300, 220, 160, 110];

export function CursorTrail({
  className,
  color = "#c8ff3d",
}: {
  className?: string;
  color?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Springs com stiffness decrescente = trail effect
  const dots = DOT_STIFFNESS.map((stiff) => ({
    x: useSpring(mouseX, { stiffness: stiff, damping: 28 }),
    y: useSpring(mouseY, { stiffness: stiff, damping: 28 }),
  }));

  useEffect(() => {
    if (reduced) return;
    const container = containerRef.current;
    if (!container) return;

    function handleMove(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }

    function handleLeave() {
      mouseX.set(-100);
      mouseY.set(-100);
    }

    container.addEventListener("mousemove", handleMove);
    container.addEventListener("mouseleave", handleLeave);
    return () => {
      container.removeEventListener("mousemove", handleMove);
      container.removeEventListener("mouseleave", handleLeave);
    };
  }, [mouseX, mouseY, reduced]);

  if (reduced) return null;

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      aria-hidden
    >
      {dots.map((dot, i) => {
        const size = 18 - i * 2.5;
        const opacity = 0.7 - i * 0.12;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              x: dot.x,
              y: dot.y,
              width: size,
              height: size,
              background: color,
              opacity,
              translateX: "-50%",
              translateY: "-50%",
              filter: i > 0 ? `blur(${i * 1.5}px)` : undefined,
              boxShadow: i === 0 ? `0 0 ${size}px ${color}` : undefined,
              mixBlendMode: "screen",
            }}
          />
        );
      })}
    </div>
  );
}
