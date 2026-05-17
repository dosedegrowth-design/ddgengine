"use client";

/**
 * FirstUseHero — bloco "primeiro uso" no dashboard.
 *
 * Aparece quando user tem 0 posts. Mostra 3 sugestões prontas
 * de conteúdo extraídas do briefing dele, com botão direto pra gerar.
 *
 * Objetivo: o cliente NUNCA chegar num painel vazio sem ação clara.
 * Em 1 clique ele tem o primeiro post saindo, sentindo o valor.
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, FileText, HelpCircle, Zap, Loader2 } from "lucide-react";
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
  primaryKeyword?: string;
  targetQuestion?: string;
  differentialTopic?: string;
}

export function FirstUseHero({
  primaryKeyword,
  targetQuestion,
  differentialTopic,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const suggestions: Suggestion[] = [];

  if (primaryKeyword) {
    suggestions.push({
      kind: "keyword",
      label: `Artigo sobre "${primaryKeyword}"`,
      description: "Conteúdo SEO otimizado pra ranquear no Google nessa palavra-chave principal.",
      payload: { type: "long_form", targetKeyword: primaryKeyword },
    });
  }

  if (targetQuestion) {
    suggestions.push({
      kind: "question",
      label: `Resposta pra "${targetQuestion}"`,
      description: "FAQ otimizado pra aparecer quando alguém pergunta isso em ChatGPT/Google.",
      payload: { type: "faq_page", targetQuestion },
    });
  }

  if (differentialTopic) {
    suggestions.push({
      kind: "differential",
      label: `Artigo sobre "${differentialTopic}"`,
      description: "Conteúdo focado em mostrar seu diferencial — pra quem chega no site converter.",
      payload: { type: "long_form", topic: differentialTopic },
    });
  }

  const icons = {
    keyword: FileText,
    question: HelpCircle,
    differential: Zap,
  } as const;

  function handleGenerate(s: Suggestion) {
    start(async () => {
      toast.info("Gerando seu primeiro post… pode levar 1-2 minutos.");
      const result = await generatePostAction(s.payload);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Post gerado! Abrindo editor…");
      const post = "post" in result ? (result.post as { id?: string } | null | undefined) : null;
      if (post?.id) {
        router.push(`/posts/${post.id}`);
      } else {
        router.push("/posts");
      }
    });
  }

  return (
    <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 md:p-8 relative overflow-hidden">
      {/* Decoração lime */}
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
          Clica em uma — em ~1 minuto sai um artigo otimizado pra SEO e IAs.
        </p>

        {suggestions.length === 0 ? (
          <p className="mt-6 text-sm text-ddg-muted italic">
            Não conseguimos extrair sugestões do briefing. Use o botão{" "}
            <strong className="text-ddg-ink">Gerar post</strong> no menu lateral.
          </p>
        ) : (
          <div className="mt-6 grid md:grid-cols-3 gap-3">
            {suggestions.map((s, i) => {
              const Icon = icons[s.kind];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleGenerate(s)}
                  disabled={pending}
                  className="group relative text-left p-4 rounded-xl border-2 border-ddg-ink bg-ddg-cream/50 hover:bg-ddg-lime/15 hover:shadow-[3px_3px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-wait"
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
                    {pending ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Gerando…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Gerar este post
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-5 text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
          Você pode editar / regerar / aprovar antes de publicar. Nada vai pro ar sem você ver.
        </p>
      </div>
    </section>
  );
}
