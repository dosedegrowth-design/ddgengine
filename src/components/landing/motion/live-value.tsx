/**
 * LiveValue — número que faz count-up inicial e depois "respira"
 * com pequenas variações periódicas (simula dado real-time).
 *
 * Usado nos cards LLM do dashboard mockup pra dar sensação
 * que os dados estão atualizando ao vivo.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, animate, useReducedMotion } from "motion/react";

export function LiveValue({
  to,
  duration = 1.4,
  drift = 1, // amplitude máxima da variação (+/-)
  driftInterval = 4500, // ms entre variações
  startDelay = 0,
  decimals = 0,
  suffix = "",
  className,
}: {
  to: number;
  duration?: number;
  drift?: number;
  driftInterval?: number;
  startDelay?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const currentRef = useRef(0);

  // Count-up inicial
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      currentRef.current = to;
      return;
    }
    const timer = setTimeout(() => {
      const controls = animate(0, to, {
        duration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (v) => {
          setValue(v);
          currentRef.current = v;
        },
      });
      return () => controls.stop();
    }, startDelay * 1000);
    return () => clearTimeout(timer);
  }, [inView, to, duration, startDelay, reduced]);

  // Variação periódica depois do count-up
  useEffect(() => {
    if (!inView || reduced || drift === 0) return;
    const initialWait = (startDelay + duration) * 1000 + 800;
    let intervalId: ReturnType<typeof setInterval>;
    const startInterval = setTimeout(() => {
      intervalId = setInterval(() => {
        const variation = (Math.random() - 0.5) * 2 * drift;
        const next = Math.max(0, to + variation);
        animate(currentRef.current, next, {
          duration: 1.2,
          ease: "easeInOut",
          onUpdate: (v) => {
            setValue(v);
            currentRef.current = v;
          },
        });
      }, driftInterval);
    }, initialWait);
    return () => {
      clearTimeout(startInterval);
      if (intervalId) clearInterval(intervalId);
    };
  }, [inView, to, drift, driftInterval, startDelay, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
