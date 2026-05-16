/**
 * AnimatedCounter — count-up animado quando entra no viewport
 * Suporta decimais, prefixo/sufixo, e respeita prefers-reduced-motion
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "motion/react";

export function AnimatedCounter({
  to,
  from = 0,
  duration = 1.6,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  // Fallback: depois de 100ms, força o valor final caso o IntersectionObserver
  // ainda não tenha disparado (acontece em screenshots, navegadores antigos,
  // ou quando o elemento renderiza fora do viewport em mobile).
  const [forceShow, setForceShow] = useState(false);
  const [value, setValue] = useState(from);

  useEffect(() => {
    const t = setTimeout(() => setForceShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!inView && !forceShow) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(to);
      return;
    }
    const controls = animate(from, to, {
      duration,
      ease: [0.16, 1, 0.3, 1], // ease-out-expo
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, forceShow, from, to, duration]);

  const formatted = value.toFixed(decimals);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
