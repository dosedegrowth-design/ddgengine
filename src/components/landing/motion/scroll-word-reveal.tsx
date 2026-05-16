/**
 * ScrollWordReveal — palavras (não caracteres) ganham opacity progressiva
 * conforme o scroll. Evita quebras feias de palavras compostas como
 * "R$ 3-5 mil" que aconteciam no ScrollCharReveal.
 *
 * Use sempre que o texto tiver números, valores monetários, hifens.
 */
"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

export function ScrollWordRevealDark({
  text,
  className,
  highlightWords,
}: {
  text: string;
  className?: string;
  /** Palavras que ficam com cor lime quando reveladas */
  highlightWords?: string[];
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.35"],
  });

  // Tokens preservam grupos com NBSP — ex: "R$ 3-5 mil" pode entrar
  // como uma única "palavra" se tiver hífens.
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const total = words.filter((w) => w.trim().length > 0).length;

  const highlightSet = useMemo(() => {
    if (!highlightWords) return new Set<string>();
    return new Set(highlightWords.map((w) => w.toLowerCase().replace(/[.,!?]$/, "")));
  }, [highlightWords]);

  if (reduced) {
    return (
      <p ref={ref} className={className}>
        {text}
      </p>
    );
  }

  let visibleIdx = -1;

  return (
    <p ref={ref} className={cn(className)}>
      {words.map((word, i) => {
        if (word.trim().length === 0) {
          // Espaço — preserva como texto literal
          return <span key={i}>{word}</span>;
        }
        visibleIdx += 1;
        const clean = word.toLowerCase().replace(/[.,!?]$/, "");
        const isHighlight = highlightSet.has(clean);
        const start = visibleIdx / total - 0.1;
        const end = visibleIdx / total + 0.05;
        return (
          <Word
            key={i}
            text={word}
            progress={scrollYProgress}
            start={start}
            end={end}
            isHighlight={isHighlight}
          />
        );
      })}
    </p>
  );
}

function Word({
  text,
  progress,
  start,
  end,
  isHighlight,
}: {
  text: string;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  start: number;
  end: number;
  isHighlight: boolean;
}) {
  const opacity = useTransform(progress, [start, end], [0.2, 1]);
  const color = useTransform(progress, [start, end], [
    "rgba(255,255,255,0.4)",
    isHighlight ? "#c8ff3d" : "rgba(255,255,255,1)",
  ]);

  return (
    <motion.span style={{ opacity, color, display: "inline-block" }}>
      {text}
    </motion.span>
  );
}
