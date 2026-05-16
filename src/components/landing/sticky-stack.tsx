/**
 * StickyStack — cards empilhando com scale-down conforme scroll
 * Inspirado em Jack 3D Creator "Projects" section.
 *
 * Cada card é sticky e escala progressivamente quando o próximo
 * card empilha em cima. Cria efeito de "revelação" stepwise.
 *
 * Uso: comparação de jeitos antigos × DDG Engine.
 */
"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export interface StackCardData {
  index: number;
  total: number;
  badge: string;
  title: string;
  price: string;
  priceLabel?: string;
  description: string;
  cons?: string[];
  pros?: string[];
  variant: "old" | "new";
}

export function StickyStackContainer({ children }: { children: ReactNode }) {
  return <div className="relative">{children}</div>;
}

export function StickyStackCard({
  index,
  total,
  badge,
  title,
  price,
  priceLabel,
  description,
  cons,
  pros,
  variant,
}: StackCardData) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Scale-down progressivo conforme próximo card empilha
  const isLast = index === total - 1;
  const targetScale = 1 - (total - 1 - index) * 0.04;
  const scale = useTransform(scrollYProgress, [0, 1], [1, isLast ? 1 : targetScale]);
  const opacity = useTransform(scrollYProgress, [0.5, 1], [1, isLast ? 1 : 0.6]);

  const top = 80 + index * 28;

  return (
    <div
      ref={ref}
      className="sticky"
      style={{ top: `${top}px`, paddingTop: index === 0 ? 0 : `${index * 20}px` }}
    >
      <motion.div
        style={{
          scale: reduced ? 1 : scale,
          opacity: reduced ? 1 : opacity,
          transformOrigin: "top center",
        }}
        className={cn(
          "relative rounded-3xl border-2 p-8 md:p-12 overflow-hidden",
          variant === "old"
            ? "border-ddg-ink bg-ddg-paper text-ddg-ink"
            : "border-ddg-lime bg-ddg-ink text-ddg-paper shadow-[12px_12px_0_var(--ddg-lime)]"
        )}
      >
        <div className="grid md:grid-cols-12 gap-6 md:gap-10">
          {/* Esquerda — badge + título + descrição */}
          <div className="md:col-span-7 space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "ddg-bracket",
                  variant === "new" && "text-ddg-lime"
                )}
              >
                {variant === "old" ? `Jeito antigo · 0${index + 1}` : "Jeito novo"}
              </div>
              <div
                className={cn(
                  "text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-widest",
                  variant === "old"
                    ? "bg-ddg-stone text-ddg-muted"
                    : "bg-ddg-lime text-ddg-ink font-bold"
                )}
              >
                {badge}
              </div>
            </div>

            <h3
              className={cn(
                "ddg-display text-3xl md:text-5xl",
                variant === "new" && "text-ddg-paper"
              )}
            >
              {title}
            </h3>

            <p
              className={cn(
                "text-base md:text-lg leading-relaxed max-w-xl",
                variant === "old" ? "text-ddg-muted" : "text-ddg-paper/70"
              )}
            >
              {description}
            </p>

            {/* Cons (jeito antigo) ou Pros (jeito novo) */}
            <ul className="space-y-2 pt-3">
              {cons?.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-ddg-muted"
                >
                  <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
              {pros?.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-ddg-paper/90"
                >
                  <Check className="w-4 h-4 text-ddg-lime mt-0.5 shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Direita — preço */}
          <div className="md:col-span-5 flex flex-col justify-center items-start md:items-end space-y-2">
            <div className="ddg-bracket whitespace-nowrap">
              {priceLabel ?? "Custo médio mensal"}
            </div>
            <div
              className={cn(
                "ddg-stat text-5xl md:text-7xl font-black",
                variant === "old"
                  ? "text-ddg-ink line-through decoration-2 decoration-red-500/50"
                  : "text-ddg-lime"
              )}
              style={{ fontFamily: 'ui-serif, "Times New Roman", serif' }}
            >
              {price}
            </div>
            {variant === "new" && (
              <div className="text-xs font-mono uppercase tracking-widest text-ddg-paper/60">
                = R$ 9,90/dia
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
