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
          "relative rounded-2xl md:rounded-3xl border-2 overflow-hidden",
          variant === "old"
            ? "border-ddg-ink bg-ddg-paper text-ddg-ink p-5 sm:p-6 md:p-8 lg:p-10"
            : "border-ddg-lime bg-ddg-ink text-ddg-paper shadow-[6px_6px_0_var(--ddg-lime)] md:shadow-[10px_10px_0_var(--ddg-lime)] p-6 sm:p-8 md:p-10 lg:p-12"
        )}
      >
        {/* Decorações de fundo APENAS pro variant new */}
        {variant === "new" && (
          <>
            {/* Glow radial lime no canto */}
            <div
              className="pointer-events-none absolute -top-1/2 -right-1/3 w-[600px] h-[600px] rounded-full opacity-30"
              style={{
                background:
                  "radial-gradient(circle, rgba(200,255,61,0.25) 0%, transparent 65%)",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-1/2 -left-1/4 w-[500px] h-[500px] rounded-full opacity-20"
              style={{
                background:
                  "radial-gradient(circle, rgba(200,255,61,0.2) 0%, transparent 70%)",
              }}
              aria-hidden
            />
            {/* Asteriscos decorativos */}
            <div
              className="pointer-events-none absolute top-6 right-6 text-ddg-lime/40 text-2xl ddg-spin-slow"
              aria-hidden
            >
              ✦
            </div>
            <div
              className="pointer-events-none absolute bottom-8 left-8 text-ddg-lime/30 text-lg ddg-spin-slow"
              style={{ animationDirection: "reverse", animationDuration: "32s" }}
              aria-hidden
            >
              ✦
            </div>
            {/* Dot grid sutil */}
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(200,255,61,0.08) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
              aria-hidden
            />
          </>
        )}

        {/* Badge "RECOMENDADO" pro variant new */}
        {variant === "new" && (
          <div className="relative z-10 flex justify-center md:justify-start mb-5 md:mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ddg-lime text-ddg-ink shadow-[0_0_24px_rgba(200,255,61,0.4)]">
              <span className="h-1.5 w-1.5 rounded-full bg-ddg-ink ddg-pulse" />
              <span className="text-[10px] font-mono font-black uppercase tracking-widest">
                Recomendado · A virada
              </span>
            </div>
          </div>
        )}

        <div className={cn(
          "relative z-10 grid md:grid-cols-12",
          variant === "new" ? "gap-6 md:gap-10" : "gap-5 md:gap-8"
        )}>
          {/* Esquerda — badge + título + descrição */}
          <div className={cn(
            "md:col-span-7",
            variant === "new" ? "space-y-5 md:space-y-6" : "space-y-4 md:space-y-5"
          )}>
            {variant === "old" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="ddg-bracket whitespace-nowrap">
                  Jeito antigo · 0{index + 1}
                </div>
                <div className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap bg-ddg-stone text-ddg-muted">
                  {badge}
                </div>
              </div>
            )}

            <h3
              className={cn(
                "ddg-display",
                variant === "new"
                  ? "text-3xl sm:text-4xl md:text-4xl lg:text-5xl text-ddg-paper"
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

            {/* Lista de cons (old) ou pros (new) */}
            {variant === "old" ? (
              <ul className="pt-2 space-y-2">
                {cons?.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm md:text-base text-ddg-muted"
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5 text-red-500 mt-0.5 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="pt-3">
                <div className="ddg-bracket text-ddg-lime mb-4">O que você ganha</div>
                <ul className="space-y-3">
                  {pros?.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm md:text-base text-ddg-paper font-medium group/item"
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-ddg-lime/15 border border-ddg-lime/40 shrink-0 mt-0.5 group-hover/item:bg-ddg-lime/25 transition-colors">
                        <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-ddg-lime stroke-[3]" />
                      </span>
                      <span className="pt-0.5">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Direita — preço */}
          <div className={cn(
            "md:col-span-5 flex flex-col justify-center md:items-end",
            variant === "new"
              ? "items-center text-center md:text-right space-y-3 md:border-l md:border-ddg-lime/20 md:pl-8 lg:pl-10"
              : "items-start space-y-2"
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
                  : "text-6xl sm:text-7xl md:text-7xl lg:text-8xl text-ddg-lime drop-shadow-[0_0_40px_rgba(200,255,61,0.45)]"
              )}
              style={{ fontFamily: 'ui-serif, "Times New Roman", serif' }}
            >
              {price}
            </div>
            {variant === "new" && (
              <>
                <div className="text-sm md:text-base font-mono uppercase tracking-widest text-ddg-paper/70 font-bold">
                  = R$ 9,90/dia
                </div>
                <div className="pt-2 flex flex-col items-center md:items-end gap-1">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-ddg-paper/50">
                    <span className="h-1 w-1 rounded-full bg-ddg-lime" />
                    14 dias grátis
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-ddg-paper/50">
                    <span className="h-1 w-1 rounded-full bg-ddg-lime" />
                    Garantia 90 dias
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-ddg-paper/50">
                    <span className="h-1 w-1 rounded-full bg-ddg-lime" />
                    Cancela em 1 clique
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer link sutil pro variant new */}
        {variant === "new" && (
          <div className="relative z-10 mt-8 md:mt-10 pt-6 border-t border-ddg-paper/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-mono uppercase tracking-widest text-ddg-paper/50">
              4 planos self-service · 2 enterprise
            </div>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 text-sm font-medium text-ddg-lime hover:text-ddg-lime-bright transition-colors"
            >
              Ver detalhes dos planos
              <span className="text-base leading-none">→</span>
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
}
