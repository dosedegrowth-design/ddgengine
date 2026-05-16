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
  { size: 640, color: "rgba(200, 255, 61, 0.55)", initialX: "5%", initialY: "10%", duration: 28 },
  { size: 520, color: "rgba(200, 255, 61, 0.42)", initialX: "70%", initialY: "55%", duration: 34, delay: 4 },
  { size: 420, color: "rgba(200, 255, 61, 0.38)", initialX: "55%", initialY: "5%", duration: 26, delay: 2 },
  { size: 380, color: "rgba(200, 255, 61, 0.45)", initialX: "15%", initialY: "75%", duration: 32, delay: 6 },
  { size: 280, color: "rgba(200, 255, 61, 0.50)", initialX: "85%", initialY: "20%", duration: 30, delay: 1 },
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
              ? orb.color.replace("0.55", "0.18").replace("0.42", "0.14").replace("0.38", "0.10").replace("0.45", "0.15").replace("0.50", "0.16")
              : orb.color,
            filter: "blur(120px)",
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
