/**
 * QuizProgress — barra de progresso lime brutalist
 * Mostra passo atual / total + porcentagem
 */
"use client";

import { motion } from "motion/react";

export function QuizProgress({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, (current / total) * 100));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-paper/60">
          {label ?? "Briefing"} · {current} de {total}
        </span>
        <span className="text-[10px] font-mono tabular-nums text-ddg-lime">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-ddg-paper/10 overflow-hidden">
        <motion.div
          className="h-full bg-ddg-lime"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ boxShadow: "0 0 12px rgba(200,255,61,0.5)" }}
        />
      </div>
    </div>
  );
}
