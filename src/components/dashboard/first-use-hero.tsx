"use client";

/**
 * FirstUseHero — bloco "primeiro uso" no dashboard.
 *
 * Aparece quando user tem 0 posts. 3 cards sempre garantidos (com
 * fallbacks). Click abre <SuggestionDetailModal> pra contexto extra
 * antes de gerar.
 */
import { useState } from "react";
import { Sparkles, FileText, HelpCircle, Zap } from "lucide-react";
import { SuggestionDetailModal } from "./suggestion-detail-modal";

interface Suggestion {
  kind: "keyword" | "question" | "differential";
  label: string;
  description: string;
  payload:
    | { type: "long_form"; topic?: string; targetKeyword?: string }
    | { type: "faq_page"; targetQuestion: string };
}

interface Props {
  primaryKeyword?: string;
  targetQuestion?: string;
  differentialTopic?: string;
  description?: string;
  idealCustomer?: string;
  companyName?: string;
}

export function FirstUseHero({
  primaryKeyword,
  targetQuestion,
  differentialTopic,
  description,
  idealCustomer,
  companyName,
}: Props) {
  const [selected, setSelected] = useState<Suggestion | null>(null);

  // Garante sempre 3 sugestões.
  const kw =
    primaryKeyword ||
    (companyName ? `${companyName.toLowerCase()}` : "seu nicho principal");

  const question =
    targetQuestion ||
    (description
      ? `Como ${description.toLowerCase().replace(/\.$/, "")}?`
      : idealCustomer
      ? `Como ajudar ${idealCustomer.toLowerCase()}?`
      : "Como funciona seu serviço?");

  const diff = differentialTopic || "Por que escolher você";

  const suggestions: Suggestion[] = [
    {
      kind: "keyword",
      label: `Artigo sobre "${kw}"`,
      description:
        "Conteúdo SEO otimizado pra ranquear no Google nessa palavra-chave principal.",
      payload: { type: "long_form", targetKeyword: kw },
    },
    {
      kind: "question",
      label: `Resposta pra "${question}"`,
      description:
        "FAQ otimizado pra aparecer quando alguém pergunta isso em ChatGPT/Google.",
      payload: { type: "faq_page", targetQuestion: question },
    },
    {
      kind: "differential",
      label: `Artigo sobre "${diff}"`,
      description:
        "Conteúdo focado em mostrar seu diferencial — pra quem chega no site converter.",
      payload: { type: "long_form", topic: diff },
    },
  ];

  const icons = {
    keyword: FileText,
    question: HelpCircle,
    differential: Zap,
  } as const;

  return (
    <>
      <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 md:p-8 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(200,255,61,0.5) 0%, transparent 60%)",
          }}
          aria-hidden
        />

        <div className="relative">
          <div className="ddg-bracket text-ddg-lime-deep mb-3 inline-block">
            PRIMEIRO POST · ESCOLHE UMA E A ENGINE FAZ
          </div>
          <h2 className="ddg-display text-2xl md:text-3xl text-ddg-ink mb-2">
            A engine já entendeu seu negócio.
          </h2>
          <p className="text-sm md:text-base text-ddg-muted max-w-2xl leading-relaxed">
            Selecionamos 3 ideias prontas baseadas no que você contou no briefing.
            Click em uma — você pode dar detalhes adicionais antes de gerar.
          </p>

          <div className="mt-6 grid md:grid-cols-3 gap-3">
            {suggestions.map((s, i) => {
              const Icon = icons[s.kind];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(s)}
                  className="group relative text-left p-4 rounded-xl border-2 border-ddg-ink bg-ddg-cream/50 hover:bg-ddg-lime/15 hover:shadow-[3px_3px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-ddg-lime border-2 border-ddg-ink">
                      <Icon className="w-4 h-4 text-ddg-ink" strokeWidth={2.5} />
                    </div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-ddg-muted">
                      {s.kind === "keyword"
                        ? "SEO"
                        : s.kind === "question"
                        ? "FAQ pra IAs"
                        : "Diferencial"}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-ddg-ink mb-1.5 leading-snug">
                    {s.label}
                  </div>
                  <p className="text-xs text-ddg-muted leading-relaxed mb-3">
                    {s.description}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-ddg-lime-deep font-bold group-hover:gap-2 transition-all">
                    <Sparkles className="w-3 h-3" />
                    Personalizar e gerar
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
            Você pode editar / regerar / aprovar antes de publicar. Nada vai pro ar sem você ver.
          </p>
        </div>
      </section>

      {selected && (
        <SuggestionDetailModal
          suggestion={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
