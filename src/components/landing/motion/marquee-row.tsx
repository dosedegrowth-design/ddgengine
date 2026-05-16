/**
 * MarqueeRow — duas rows rolando em direções opostas conforme scroll
 * Inspirado em "Jack 3D Creator" — scroll-driven, NÃO CSS infinite
 *
 * Uso: prova social dinâmica. Cada item é um "card" pequeno
 * (citação detectada, log de uma LLM, etc).
 *
 * Performance: usa transform translate3d direto, sem reflow.
 * Items duplicados 3x pra parecer infinito visualmente.
 */
"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MarqueeRow({
  children,
  direction = "left",
  speed = 200,
  className,
}: {
  children: ReactNode;
  direction?: "left" | "right";
  /** Px de deslocamento por unidade de scroll */
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const range = direction === "left" ? [0, -speed] : [-speed, speed];
  const x = useTransform(scrollYProgress, [0, 1], range);

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.div
        style={{ x: reduced ? 0 : x, willChange: "transform" }}
        className="flex gap-4 whitespace-nowrap"
      >
        {/* Triplicar pra parecer infinito visualmente */}
        {[0, 1, 2].map((dup) => (
          <div key={dup} className="flex gap-4 shrink-0">
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
