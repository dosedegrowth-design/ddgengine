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
  { size: 480, color: "rgba(200, 255, 61, 0.25)", initialX: "10%", initialY: "20%", duration: 28 },
  { size: 380, color: "rgba(200, 255, 61, 0.18)", initialX: "75%", initialY: "60%", duration: 34, delay: 4 },
  { size: 320, color: "rgba(200, 255, 61, 0.15)", initialX: "55%", initialY: "10%", duration: 26, delay: 2 },
  { size: 260, color: "rgba(200, 255, 61, 0.20)", initialX: "20%", initialY: "75%", duration: 32, delay: 6 },
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
              ? orb.color.replace("0.25", "0.12").replace("0.18", "0.08").replace("0.15", "0.06").replace("0.20", "0.10")
              : orb.color,
            filter: "blur(80px)",
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
