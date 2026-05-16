/**
 * MockupDashboard — preview do produto pro hero
 *
 * NÃO É imagem: é um mockup vivo em HTML/CSS, fica leve e
 * escala em qualquer resolução. Mostra Visibility Score real,
 * 4 cards LLM com status, e mini chart de citações ANIMADO.
 */
"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { AnimatedCounter } from "./motion/animated-counter";

const DAYS = [
  { d: 1, v: 12 },
  { d: 5, v: 18 },
  { d: 10, v: 16 },
  { d: 15, v: 24 },
  { d: 20, v: 31 },
  { d: 25, v: 28 },
  { d: 30, v: 47 },
];

export function MockupDashboard({ className }: { className?: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const inView = useInView(chartRef, { once: true, margin: "-50px" });
  const reduced = useReducedMotion();

  // Calcula curva pro chart
  const maxV = Math.max(...DAYS.map((d) => d.v));
  const points = DAYS.map((p, i) => {
    const x = (i / (DAYS.length - 1)) * 100;
    const y = 100 - (p.v / maxV) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-ddg-ink bg-ddg-graphite text-white",
        "shadow-[12px_12px_0_var(--ddg-ink)]",
        "overflow-hidden",
        className
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <div className="font-mono text-[10px] text-white/40 tracking-widest">
          DDG ENGINE · VISIBILITY
        </div>
        <div className="text-[10px] font-mono text-ddg-lime flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-ddg-lime ddg-pulse" />
          LIVE
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        {/* Hero stat — count-up animado */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase mb-1">
              Citation Score · últimos 30d
            </div>
            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                to={47.2}
                decimals={1}
                duration={2}
                className="text-5xl md:text-6xl font-black tracking-tight tabular-nums"
              />
              <span className="text-2xl font-bold text-ddg-lime">%</span>
            </div>
          </div>
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.8 }}
            whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.4, duration: 0.4 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ddg-lime/10 border border-ddg-lime/30 text-ddg-lime text-xs font-semibold"
          >
            <TrendingUp className="w-3 h-3" />
            +12.4%
          </motion.div>
        </div>

        {/* Mini chart com draw-in animado */}
        <div ref={chartRef} className="relative h-24 w-full">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            {/* Grid lines */}
            {[25, 50, 75].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100"
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.3"
              />
            ))}
            {/* Area fill */}
            <motion.polyline
              points={`0,100 ${points} 100,100`}
              fill="url(#mockup-grad)"
              initial={reduced ? false : { opacity: 0 }}
              animate={reduced || inView ? { opacity: 0.4 } : {}}
              transition={{ delay: 0.8, duration: 1 }}
            />
            {/* Line draw-in */}
            <motion.polyline
              points={points}
              fill="none"
              stroke="#c8ff3d"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduced ? false : { pathLength: 0 }}
              animate={reduced || inView ? { pathLength: 1 } : {}}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Last point dot */}
            <motion.circle
              cx="100"
              cy="0"
              r="1.5"
              fill="#c8ff3d"
              initial={reduced ? false : { opacity: 0 }}
              animate={reduced || inView ? { opacity: 1 } : {}}
              transition={{ delay: 1.4, duration: 0.3 }}
            />
            <defs>
              <linearGradient id="mockup-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#c8ff3d" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#c8ff3d" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 4 LLM cards com stagger */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { name: "ChatGPT", value: 58, status: "live" },
            { name: "Perplexity", value: 42, status: "live" },
            { name: "Claude", value: 31, status: "warning" },
            { name: "Gemini", value: 24, status: "live" },
          ].map((llm, i) => (
            <motion.div
              key={llm.name}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.6 + i * 0.1, duration: 0.4 }}
              className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-white/[0.03]"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full ddg-pulse",
                    llm.status === "live" ? "bg-emerald-400" : "bg-amber-400"
                  )}
                />
                <span className="text-xs font-medium text-white/90">{llm.name}</span>
              </div>
              <span className="text-sm font-bold tabular-nums text-ddg-lime">
                {llm.value}%
              </span>
            </motion.div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="font-mono text-[10px] text-white/40">
            ● 4 IAs monitoradas · atualiza a cada 6h
          </span>
          <span className="font-mono text-[10px] text-ddg-lime">→</span>
        </div>
      </div>
    </div>
  );
}
