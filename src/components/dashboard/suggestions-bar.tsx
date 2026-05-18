"use client";

/**
 * SuggestionsBar — versão compacta do FirstUseHero, sempre visível.
 *
 * Diferenças do FirstUseHero:
 * - Recebe sugestões prontas via props (filtradas server-side em suggest-topics.ts)
 * - Layout horizontal compacto (3 chips clicáveis em row, não cards grandes)
 * - Não força grid 3 colunas: 1-3 chips conforme tem
 * - Não fica em destaque enorme — barra de produtividade
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, FileText, HelpCircle, Zap } from "lucide-react";
import { generatePostAction } from "@/app/(app)/posts/actions";

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
  const router = useRouter();
  const [pending, start] = useTransition();

  if (suggestions.length === 0) return null;

  function handleGenerate(s: Suggestion) {
    start(async () => {
      toast.info("Gerando post… pode levar 1-2 minutos.");
      const result = await generatePostAction(s.payload);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      const post = "post" in result ? (result.post as { id?: string; postId?: string } | null) : null;
      const postId = post?.id ?? post?.postId;
      toast.success("Post gerado! Abrindo editor…");
      if (postId) router.push(`/posts/${postId}`);
      else router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-4 md:p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="ddg-bracket">PRÓXIMAS IDEIAS · BASEADAS NO BRIEFING</div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
          1 clique = post gerado
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {suggestions.map((s, i) => {
          const Icon = ICONS[s.kind];
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleGenerate(s)}
              disabled={pending}
              className="group flex items-start gap-3 text-left p-3 rounded-xl border-2 border-ddg-stone bg-ddg-cream/40 hover:border-ddg-ink hover:bg-ddg-lime/15 hover:shadow-[3px_3px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              <div className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-ddg-lime border-2 border-ddg-ink mt-0.5">
                {pending ? (
                  <Loader2 className="w-4 h-4 text-ddg-ink animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-ddg-ink" strokeWidth={2.5} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-mono uppercase tracking-widest text-ddg-muted mb-0.5">
                  {KIND_LABEL[s.kind]}
                </div>
                <div className="font-bold text-xs text-ddg-ink leading-snug line-clamp-2">
                  {s.label}
                </div>
                <div className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono uppercase tracking-widest text-ddg-lime-deep font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="w-3 h-3" /> Gerar
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
