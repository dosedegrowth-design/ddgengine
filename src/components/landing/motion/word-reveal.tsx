/**
 * WordReveal — anima headline word-by-word
 * O olho do usuário lê a frase no ritmo certo
 */
"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function WordReveal({
  text,
  highlight,
  className,
  delay = 0,
  stagger = 0.06,
}: {
  text: string;
  /** Palavras que ganham o pill verde lime */
  highlight?: string[];
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");
  const highlightSet = new Set((highlight ?? []).map((w) => w.toLowerCase()));

  if (reduced) {
    return (
      <span className={className}>
        {words.map((w, i) => {
          const isHighlight = highlightSet.has(w.toLowerCase().replace(/[.,!?]$/, ""));
          return (
            <span key={i} className={isHighlight ? "ddg-pill-lime mx-1" : ""}>
              {w}{" "}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <motion.span
      className={cn("inline", className)}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
    >
      {words.map((w, i) => {
        const clean = w.toLowerCase().replace(/[.,!?]$/, "");
        const isHighlight = highlightSet.has(clean);
        return (
          <motion.span
            key={i}
            className={cn(
              "inline-block",
              isHighlight && "ddg-pill-lime mx-1"
            )}
            variants={{
              hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
              show: { opacity: 1, y: 0, filter: "blur(0px)" },
            }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}
            {i < words.length - 1 && " "}
          </motion.span>
        );
      })}
    </motion.span>
  );
}
