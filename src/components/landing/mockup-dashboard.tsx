/**
 * MockupDashboard — preview do produto pro hero (TURBINADO)
 *
 * NÃO É imagem: é um mockup VIVO em HTML/CSS/SVG com 10 micro-animações
 * que dão sensação de dado real-time:
 *
 *  1. Tilt 3D suave seguindo mouse (desktop)
 *  2. Floating sutil (idle breathing)
 *  3. Top bar LIVE com radar ping ring
 *  4. Citation Score com text-shimmer infinito após count-up
 *  5. Badge +12.4% com breathing glow lime
 *  6. Chart com draw-in + shimmer band varrendo a linha
 *  7. Pulse radial wave no último ponto do chart
 *  8. Toast "NEW CITATION" surgindo periodicamente
 *  9. LLM values com drift contínuo (variação periódica)
 * 10. Background scanline sutil (efeito monitor)
 */
"use client";

import { motion, useInView, useReducedMotion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Sparkles } from "lucide-react";
import { AnimatedCounter } from "./motion/animated-counter";
import { LiveValue } from "./motion/live-value";

const DAYS = [
  { d: 1, v: 12 },
  { d: 5, v: 18 },
  { d: 10, v: 16 },
  { d: 15, v: 24 },
  { d: 20, v: 31 },
  { d: 25, v: 28 },
  { d: 30, v: 47 },
];

const TOAST_MESSAGES = [
  { llm: "ChatGPT", text: "Nova citação detectada" },
  { llm: "Perplexity", text: "Sua marca mencionada" },
  { llm: "Claude", text: "Nova menção identificada" },
  { llm: "Gemini", text: "Citação registrada" },
];

export function MockupDashboard({ className }: { className?: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(chartRef, { once: true, margin: "-50px" });
  const reduced = useReducedMotion();

  // ===== 1. Tilt 3D seguindo mouse =====
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-100, 100], [4, -4]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-100, 100], [-4, 4]), {
    stiffness: 150,
    damping: 20,
  });

  function handleMouseMove(e: React.MouseEvent) {
    if (!containerRef.current || reduced) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    mouseX.set(e.clientX - cx);
    mouseY.set(e.clientY - cy);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  // ===== 8. Toast rotativo =====
  const [toastIdx, setToastIdx] = useState(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!inView || reduced) return;
    const startDelay = setTimeout(() => {
      setShowToast(true);
      const cycle = setInterval(() => {
        setShowToast(false);
        setTimeout(() => {
          setToastIdx((i) => (i + 1) % TOAST_MESSAGES.length);
          setShowToast(true);
        }, 600);
      }, 5200);
      return () => clearInterval(cycle);
    }, 3000);
    return () => clearTimeout(startDelay);
  }, [inView, reduced]);

  // Calcula curva pro chart
  const maxV = Math.max(...DAYS.map((d) => d.v));
  const points = DAYS.map((p, i) => {
    const x = (i / (DAYS.length - 1)) * 100;
    const y = 100 - (p.v / maxV) * 100;
    return { x, y, ...p };
  });
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const lastPoint = points[points.length - 1];

  const currentToast = TOAST_MESSAGES[toastIdx];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative", className)}
      style={{ perspective: 1200 }}
    >
      <motion.div
        style={{
          rotateX: reduced ? 0 : rotateX,
          rotateY: reduced ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "relative rounded-2xl border-2 border-ddg-ink bg-ddg-graphite text-white",
          "shadow-[12px_12px_0_var(--ddg-ink)]",
          "overflow-hidden",
          !reduced && "ddg-float"
        )}
      >
        {/* ===== 10. Scanline background sutil ===== */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(180deg, transparent 0px, transparent 27px, rgba(200,255,61,0.04) 28px)",
            backgroundSize: "100% 28px",
            animation: reduced ? undefined : "ddg-scanline 8s linear infinite",
          }}
        />

        {/* Top bar */}
        <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <div className="font-mono text-[10px] text-white/40 tracking-widest">
            DDG ENGINE · VISIBILITY
          </div>
          {/* ===== 3. LIVE com radar ping ring ===== */}
          <div className="text-[10px] font-mono text-ddg-lime flex items-center gap-1.5">
            <span className="relative flex items-center justify-center">
              <span className="absolute h-2 w-2 rounded-full bg-ddg-lime/40 ddg-ping-ring" aria-hidden />
              <span className="relative h-1.5 w-1.5 rounded-full bg-ddg-lime" />
            </span>
            LIVE
          </div>
        </div>

        <div className="relative p-5 md:p-6 space-y-5">
          {/* Hero stat — count-up + text-shimmer */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase mb-1">
                Citation Score · últimos 30d
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-5xl md:text-6xl font-black tracking-tight tabular-nums",
                    !reduced && "ddg-text-shimmer"
                  )}
                  style={{ color: "#ffffff" }}
                >
                  <AnimatedCounter to={47.2} decimals={1} duration={2} />
                </span>
                <span className="text-2xl font-bold text-ddg-lime">%</span>
              </div>
            </div>
            {/* ===== 5. Badge +12.4% com breathing glow ===== */}
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.6, y: 8 }}
              whileInView={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.4, duration: 0.5, type: "spring", stiffness: 200 }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ddg-lime/10 border border-ddg-lime/40 text-ddg-lime text-xs font-bold",
                !reduced && "ddg-breath"
              )}
            >
              <motion.span
                animate={reduced ? undefined : { y: [0, -2, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="flex"
              >
                <TrendingUp className="w-3 h-3" />
              </motion.span>
              +12.4%
            </motion.div>
          </div>

          {/* Mini chart com draw-in + shimmer band + radar dot */}
          <div ref={chartRef} className="relative h-28 w-full">
            {/* Shimmer band overlay — gradiente cruzando horizontal */}
            {!reduced && inView && (
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden rounded"
                aria-hidden
              >
                <div
                  className="absolute inset-y-0 w-1/3 ddg-shimmer-x"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(200,255,61,0.08), transparent)",
                  }}
                />
              </div>
            )}

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
            >
              {/* Grid */}
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
                points={`0,100 ${polylinePoints} 100,100`}
                fill="url(#mockup-grad)"
                initial={reduced ? false : { opacity: 0 }}
                animate={reduced || inView ? { opacity: 0.45 } : {}}
                transition={{ delay: 0.8, duration: 1 }}
              />
              {/* Line draw-in */}
              <motion.polyline
                points={polylinePoints}
                fill="none"
                stroke="#c8ff3d"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduced ? false : { pathLength: 0 }}
                animate={reduced || inView ? { pathLength: 1 } : {}}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                filter="url(#glow)"
              />
              {/* Pequenos dots em cada ponto (vibram quando entram) */}
              {points.slice(0, -1).map((p, i) => (
                <motion.circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="0.9"
                  fill="#c8ff3d"
                  initial={reduced ? false : { opacity: 0, scale: 0 }}
                  animate={reduced || inView ? { opacity: 0.6, scale: 1 } : {}}
                  transition={{ delay: 1.6 + i * 0.08, duration: 0.3 }}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <defs>
                <linearGradient id="mockup-grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#c8ff3d" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#c8ff3d" stopOpacity="0" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="0.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>

            {/* ===== 7. Pulse radial wave no último ponto (overlay) ===== */}
            {inView && !reduced && (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: `${lastPoint.x}%`,
                  top: `${lastPoint.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                aria-hidden
              >
                <span className="relative flex items-center justify-center">
                  <span className="absolute h-4 w-4 rounded-full bg-ddg-lime/40 ddg-ping-ring" />
                  <span className="absolute h-4 w-4 rounded-full bg-ddg-lime/30 ddg-ping-ring" style={{ animationDelay: "1s" }} />
                  <span className="relative h-2 w-2 rounded-full bg-ddg-lime shadow-[0_0_8px_rgba(200,255,61,0.8)]" />
                </span>
              </div>
            )}
          </div>

          {/* ===== 9. 4 LLM cards com LiveValue (drift contínuo) ===== */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { name: "ChatGPT", value: 58, status: "live", delay: 0 },
              { name: "Perplexity", value: 42, status: "live", delay: 0.1 },
              { name: "Claude", value: 31, status: "warning", delay: 0.2 },
              { name: "Gemini", value: 24, status: "live", delay: 0.3 },
            ].map((llm, i) => (
              <motion.div
                key={llm.name}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.6 + i * 0.1, duration: 0.4 }}
                whileHover={reduced ? undefined : { y: -2, borderColor: "rgba(200,255,61,0.4)" }}
                className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-default"
              >
                <div className="flex items-center gap-2">
                  <span className="relative flex items-center justify-center">
                    {llm.status === "live" && !reduced && (
                      <span
                        className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400/40 ddg-ping-ring"
                        style={{ animationDelay: `${i * 0.4}s` }}
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        "relative h-1.5 w-1.5 rounded-full",
                        llm.status === "live" ? "bg-emerald-400" : "bg-amber-400 ddg-pulse"
                      )}
                    />
                  </span>
                  <span className="text-xs font-medium text-white/90">{llm.name}</span>
                </div>
                <span className="text-sm font-bold tabular-nums text-ddg-lime">
                  <LiveValue
                    to={llm.value}
                    drift={1.2}
                    driftInterval={4000 + i * 700}
                    startDelay={2 + llm.delay}
                    duration={1.2}
                    suffix="%"
                  />
                </span>
              </motion.div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="font-mono text-[10px] text-white/40 flex items-center gap-1.5">
              <span className="relative flex items-center justify-center">
                <span className="absolute h-2 w-2 rounded-full bg-ddg-lime/20 ddg-ping-ring" aria-hidden />
                <span className="relative h-1 w-1 rounded-full bg-ddg-lime/60" />
              </span>
              4 IAs monitoradas · atualiza a cada 6h
            </span>
            <motion.span
              animate={reduced ? undefined : { x: [0, 3, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="font-mono text-[10px] text-ddg-lime"
            >
              →
            </motion.span>
          </div>
        </div>
      </motion.div>

      {/* ===== 8. Toast NEW CITATION flutuando ===== */}
      <motion.div
        initial={false}
        animate={
          reduced || !showToast
            ? { opacity: 0, x: 20, scale: 0.9 }
            : { opacity: 1, x: 0, scale: 1 }
        }
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="absolute -right-3 top-20 md:-right-6 z-10 pointer-events-none"
        aria-hidden
      >
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ddg-lime border-2 border-ddg-ink shadow-[4px_4px_0_var(--ddg-ink)] text-ddg-ink">
          <Sparkles className="w-3.5 h-3.5" />
          <div className="flex flex-col">
            <div className="font-mono text-[9px] uppercase tracking-widest opacity-70">
              {currentToast.llm}
            </div>
            <div className="text-xs font-bold whitespace-nowrap">
              {currentToast.text}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
