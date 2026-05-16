/**
 * HeroDecorations — elementos decorativos espalhados pelo hero
 * Inspirado em Prisma/Aura/Bloom — preenche o "vazio" do hero
 * com micro-elementos animados pra dar vida.
 *
 * Não usar mais que isso — quanto mais decoração, mais ruído.
 */
"use client";

import { motion, useReducedMotion } from "motion/react";

interface DecoItem {
  type: "asterisk" | "plus" | "dot" | "bracket" | "circle";
  x: string;
  y: string;
  size: number;
  delay?: number;
  rotateDuration?: number;
  pulse?: boolean;
}

const DECORATIONS: DecoItem[] = [
  // Top-left quadrant
  { type: "asterisk", x: "8%", y: "18%", size: 32, rotateDuration: 16 },
  { type: "bracket", x: "5%", y: "55%", size: 22 },
  { type: "plus", x: "14%", y: "78%", size: 18, pulse: true, delay: 0.4 },
  { type: "dot", x: "22%", y: "32%", size: 6, pulse: true },

  // Top-right quadrant
  { type: "asterisk", x: "88%", y: "15%", size: 26, rotateDuration: 22, delay: 1 },
  { type: "circle", x: "93%", y: "40%", size: 14 },
  { type: "plus", x: "82%", y: "62%", size: 16, pulse: true, delay: 0.8 },

  // Bottom quadrants
  { type: "asterisk", x: "10%", y: "92%", size: 22, rotateDuration: 18, delay: 2 },
  { type: "bracket", x: "94%", y: "88%", size: 20, delay: 1.5 },
  { type: "dot", x: "75%", y: "94%", size: 5, pulse: true, delay: 0.2 },
  { type: "circle", x: "30%", y: "12%", size: 10 },
];

export function HeroDecorations() {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {DECORATIONS.map((deco, i) => (
        <motion.div
          key={i}
          className="absolute text-ddg-lime-deep"
          style={{
            left: deco.x,
            top: deco.y,
            width: deco.size,
            height: deco.size,
          }}
          initial={reduced ? false : { opacity: 0, scale: 0.5 }}
          animate={reduced ? undefined : { opacity: 0.45, scale: 1 }}
          transition={{ delay: 0.4 + (deco.delay ?? 0) * 0.3, duration: 0.8 }}
        >
          <Glyph
            type={deco.type}
            size={deco.size}
            rotateDuration={deco.rotateDuration}
            pulse={deco.pulse}
          />
        </motion.div>
      ))}
    </div>
  );
}

function Glyph({
  type,
  size,
  rotateDuration,
  pulse,
}: {
  type: DecoItem["type"];
  size: number;
  rotateDuration?: number;
  pulse?: boolean;
}) {
  const reduced = useReducedMotion();

  const motionProps = {
    animate:
      reduced
        ? undefined
        : rotateDuration
        ? { rotate: 360 }
        : pulse
        ? { scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }
        : undefined,
    transition: {
      duration: rotateDuration ?? 2.4,
      repeat: Infinity,
      ease: (rotateDuration ? "linear" : "easeInOut") as "linear" | "easeInOut",
    },
  };

  switch (type) {
    case "asterisk":
      return (
        <motion.span
          {...motionProps}
          className="block leading-none text-ddg-lime-deep"
          style={{ fontSize: size, fontWeight: 900 }}
        >
          ✦
        </motion.span>
      );
    case "plus":
      return (
        <motion.span
          {...motionProps}
          className="block leading-none text-ddg-ink/30"
          style={{ fontSize: size, fontWeight: 700 }}
        >
          +
        </motion.span>
      );
    case "dot":
      return (
        <motion.div
          {...motionProps}
          className="rounded-full bg-ddg-lime"
          style={{ width: size, height: size }}
        />
      );
    case "bracket":
      return (
        <span
          className="block font-mono text-ddg-ink/40"
          style={{ fontSize: size }}
        >
          {"[ ]"}
        </span>
      );
    case "circle":
      return (
        <motion.div
          {...motionProps}
          className="rounded-full border-2 border-ddg-ink/30"
          style={{ width: size, height: size }}
        />
      );
  }
}
