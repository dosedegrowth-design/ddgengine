/**
 * FloatingOrbs — esferas blurred lime se movendo lentamente no background
 * Inspirado em Aura/Bloom — dá profundidade e vida sem ser AI-óbvio
 *
 * Performance: 3-4 orbs com transform CSS (GPU), animação lenta (20-40s).
 */
"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface Orb {
  size: number;
  color: string;
  initialX: string;
  initialY: string;
  duration: number;
  delay?: number;
}

const DEFAULT_ORBS: Orb[] = [
  { size: 640, color: "rgba(200, 255, 61, 0.32)", initialX: "-5%", initialY: "5%", duration: 28 },
  { size: 520, color: "rgba(200, 255, 61, 0.26)", initialX: "75%", initialY: "55%", duration: 34, delay: 4 },
  { size: 420, color: "rgba(200, 255, 61, 0.22)", initialX: "60%", initialY: "0%", duration: 26, delay: 2 },
  { size: 380, color: "rgba(200, 255, 61, 0.28)", initialX: "10%", initialY: "80%", duration: 32, delay: 6 },
  { size: 280, color: "rgba(200, 255, 61, 0.30)", initialX: "88%", initialY: "15%", duration: 30, delay: 1 },
];

export function FloatingOrbs({
  className,
  variant = "light",
  orbs = DEFAULT_ORBS,
}: {
  className?: string;
  variant?: "light" | "dark";
  orbs?: Orb[];
}) {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none",
        className
      )}
      aria-hidden
    >
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.initialX,
            top: orb.initialY,
            background: variant === "dark"
              ? orb.color.replace("0.32", "0.12").replace("0.26", "0.10").replace("0.22", "0.08").replace("0.28", "0.11").replace("0.30", "0.11")
              : orb.color,
            filter: "blur(140px)",
            willChange: "transform",
          }}
          animate={
            reduced
              ? undefined
              : {
                  x: [0, 60, -40, 0],
                  y: [0, -50, 30, 0],
                  scale: [1, 1.15, 0.95, 1],
                }
          }
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}
