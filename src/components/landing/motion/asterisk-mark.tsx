/**
 * AsteriskMark — superscript asterisco rotacionando lentamente
 * Inspirado em Prisma — vira marca tipográfica de personalidade.
 *
 * Renderiza como * em superscript, gira 360° em loop lento.
 */
"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function AsteriskMark({
  className,
  duration = 12,
}: {
  className?: string;
  duration?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.span
      animate={reduced ? undefined : { rotate: 360 }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear",
      }}
      className={cn(
        "inline-block align-super text-[0.4em] text-ddg-lime-deep ml-1",
        className
      )}
      aria-hidden
    >
      ✦
    </motion.span>
  );
}
