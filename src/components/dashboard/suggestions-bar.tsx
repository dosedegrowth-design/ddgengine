"use client";

/**
 * SuggestionsBar — chips clicáveis com sugestões filtradas (não-repetição
 * cuidada server-side em suggest-topics.ts).
 *
 * Click numa sugestão abre <SuggestionDetailModal> pro user dar contexto
 * extra (texto + áudio) antes de gerar. Há opção "pular e gerar direto".
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
  suggestions: Suggestion[];
}

const ICONS = {
  keyword: FileText,
  question: HelpCircle,
  differential: Zap,
} as const;

const KIND_LABEL = {
  keyword: "SEO",
  question: "FAQ pra IAs",
  differential: "Diferencial",
} as const;

export function SuggestionsBar({ suggestions }: Props) {
  const [selected, setSelected] = useState<Suggestion | null>(null);

  if (suggestions.length === 0) return null;

  return (
    <>
      <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-4 md:p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="ddg-bracket">PRÓXIMAS IDEIAS · BASEADAS NO BRIEFING</div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
            Click pra gerar (você pode dar detalhes antes)
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {suggestions.map((s, i) => {
            const Icon = ICONS[s.kind];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(s)}
                className="group flex items-start gap-3 text-left p-3 rounded-xl border-2 border-ddg-stone bg-ddg-cream/40 hover:border-ddg-ink hover:bg-ddg-lime/15 hover:shadow-[3px_3px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
              >
                <div className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-ddg-lime border-2 border-ddg-ink mt-0.5">
                  <Icon className="w-4 h-4 text-ddg-ink" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-ddg-muted mb-0.5">
                    {KIND_LABEL[s.kind]}
                  </div>
                  <div className="font-bold text-xs text-ddg-ink leading-snug line-clamp-2">
                    {s.label}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono uppercase tracking-widest text-ddg-lime-deep font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3" /> Personalizar e gerar
                  </div>
                </div>
              </button>
            );
          })}
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
