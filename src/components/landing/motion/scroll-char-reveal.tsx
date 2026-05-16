/**
 * ScrollCharReveal — caracteres ganham opacidade progressivamente
 * conforme o usuário rola pelo parágrafo.
 *
 * Inspirado em Prisma + Jack 3D. Usa o scroll do PRÓPRIO elemento
 * como driver, criando sensação de "leitura guiada".
 *
 * Use SEM EXAGERO — só em parágrafos importantes (problema, missão).
 */
"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

export function ScrollCharReveal({
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

  const chars = useMemo(() => text.split(""), [text]);
  const total = chars.length;

  const highlightSet = useMemo(() => {
    if (!highlightWords) return null;
    const set = new Set<number>();
    let idx = 0;
    for (const word of text.split(" ")) {
      const isHL = highlightWords.some((hl) =>
        word.toLowerCase().replace(/[.,!?]$/, "").includes(hl.toLowerCase())
      );
      if (isHL) {
        for (let i = 0; i < word.length; i++) set.add(idx + i);
      }
      idx += word.length + 1;
    }
    return set;
  }, [text, highlightWords]);

  if (reduced) {
    return (
      <p ref={ref} className={className}>
        {text}
      </p>
    );
  }

  return (
    <p ref={ref} className={cn("relative", className)}>
      {chars.map((char, i) => (
        <Char
          key={i}
          char={char}
          progress={scrollYProgress}
          start={i / total - 0.05}
          end={i / total + 0.05}
          isHighlight={highlightSet?.has(i) ?? false}
        />
      ))}
    </p>
  );
}

function Char({
  char,
  progress,
  start,
  end,
  isHighlight,
}: {
  char: string;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  start: number;
  end: number;
  isHighlight: boolean;
}) {
  const opacity = useTransform(progress, [start, end], [0.15, 1]);
  const color = useTransform(progress, [start, end], [
    "rgba(107,107,107,1)",
    isHighlight ? "#c8ff3d" : "rgba(10,10,10,1)",
  ]);

  return (
    <motion.span style={{ opacity, color }}>
      {char === " " ? " " : char}
    </motion.span>
  );
}

/**
 * ScrollCharRevealDark — versão pra fundos escuros
 */
export function ScrollCharRevealDark({
  text,
  className,
  highlightWords,
}: {
  text: string;
  className?: string;
  highlightWords?: string[];
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.35"],
  });

  const chars = useMemo(() => text.split(""), [text]);
  const total = chars.length;

  const highlightSet = useMemo(() => {
    if (!highlightWords) return null;
    const set = new Set<number>();
    let idx = 0;
    for (const word of text.split(" ")) {
      const isHL = highlightWords.some((hl) =>
        word.toLowerCase().replace(/[.,!?]$/, "").includes(hl.toLowerCase())
      );
      if (isHL) {
        for (let i = 0; i < word.length; i++) set.add(idx + i);
      }
      idx += word.length + 1;
    }
    return set;
  }, [text, highlightWords]);

  if (reduced) {
    return (
      <p ref={ref} className={className}>
        {text}
      </p>
    );
  }

  return (
    <p ref={ref} className={cn("relative", className)}>
      {chars.map((char, i) => (
        <CharDark
          key={i}
          char={char}
          progress={scrollYProgress}
          start={i / total - 0.05}
          end={i / total + 0.05}
          isHighlight={highlightSet?.has(i) ?? false}
        />
      ))}
    </p>
  );
}

function CharDark({
  char,
  progress,
  start,
  end,
  isHighlight,
}: {
  char: string;
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
    <motion.span style={{ opacity, color }}>
      {char === " " ? " " : char}
    </motion.span>
  );
}
