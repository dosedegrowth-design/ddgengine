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
          "relative rounded-2xl md:rounded-3xl border-2 p-5 sm:p-6 md:p-8 lg:p-10 overflow-hidden",
          variant === "old"
            ? "border-ddg-ink bg-ddg-paper text-ddg-ink"
            : "border-ddg-lime bg-ddg-ink text-ddg-paper shadow-[6px_6px_0_var(--ddg-lime)] md:shadow-[10px_10px_0_var(--ddg-lime)]"
        )}
      >
        <div className="grid md:grid-cols-12 gap-5 md:gap-8">
          {/* Esquerda — badge + título + descrição */}
          <div className="md:col-span-7 space-y-4 md:space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={cn(
                  "ddg-bracket whitespace-nowrap",
                  variant === "new" && "text-ddg-lime"
                )}
              >
                {variant === "old" ? `Jeito antigo · 0${index + 1}` : "Jeito novo"}
              </div>
              <div
                className={cn(
                  "text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap",
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
                "ddg-display",
                variant === "new"
                  ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-ddg-paper"
                  : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
              )}
            >
              {title}
            </h3>

            <p
              className={cn(
                "leading-relaxed max-w-xl",
                variant === "new"
                  ? "text-base md:text-lg text-ddg-paper/80"
                  : "text-base md:text-lg text-ddg-muted"
              )}
            >
              {description}
            </p>

            {/* Cons (jeito antigo) ou Pros (jeito novo) */}
            <ul className={cn("pt-2", variant === "new" ? "space-y-2.5" : "space-y-2")}>
              {cons?.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm md:text-base text-ddg-muted"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5 text-red-500 mt-0.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
              {pros?.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm md:text-base text-ddg-paper/90 font-medium"
                >
                  <Check className="w-4 h-4 md:w-5 md:h-5 text-ddg-lime mt-0.5 shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Direita — preço */}
          <div className={cn(
            "md:col-span-5 flex flex-col justify-center items-start md:items-end",
            variant === "new" ? "space-y-2" : "space-y-2"
          )}>
            <div className={cn(
              "ddg-bracket whitespace-nowrap",
              variant === "new" && "text-ddg-lime"
            )}>
              {priceLabel ?? "Custo médio mensal"}
            </div>
            <div
              className={cn(
                "ddg-stat font-black break-words leading-[0.9]",
                variant === "old"
                  ? "text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-ddg-ink line-through decoration-2 decoration-red-500/50"
                  : "text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-ddg-lime drop-shadow-[0_0_32px_rgba(200,255,61,0.35)]"
              )}
              style={{ fontFamily: 'ui-serif, "Times New Roman", serif' }}
            >
              {price}
            </div>
            {variant === "new" && (
              <div className="text-sm md:text-base font-mono uppercase tracking-widest text-ddg-paper/70 font-bold">
                = R$ 9,90/dia
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
