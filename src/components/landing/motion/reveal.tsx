/**
 * Reveal — fade-up quando entra no viewport
 * Suporta stagger via index e variantes (fade, slide-left, slide-right, scale)
 */
"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const VARIANTS: Record<string, Variants> = {
  up: {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0 },
  },
  left: {
    hidden: { opacity: 0, x: -32 },
    show: { opacity: 1, x: 0 },
  },
  right: {
    hidden: { opacity: 0, x: 32 },
    show: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.94 },
    show: { opacity: 1, scale: 1 },
  },
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  },
};

export function Reveal({
  children,
  variant = "up",
  delay = 0,
  duration = 0.6,
  className,
  as = "div",
  once = true,
}: {
  children: ReactNode;
  variant?: "up" | "left" | "right" | "scale" | "fade";
  delay?: number;
  duration?: number;
  className?: string;
  as?: "div" | "span" | "section" | "h1" | "h2" | "p" | "li" | "article";
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <MotionTag
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-80px" }}
      variants={VARIANTS[variant]}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/**
 * StaggerGroup — anima children em sequência
 */
export function StaggerGroup({
  children,
  className,
  delay = 0,
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  variant = "up",
}: {
  children: ReactNode;
  className?: string;
  variant?: "up" | "left" | "right" | "scale" | "fade";
}) {
  return (
    <motion.div
      variants={VARIANTS[variant]}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
