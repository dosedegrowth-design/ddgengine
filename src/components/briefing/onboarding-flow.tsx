/**
 * OnboardingFlow — orquestrador das 6 etapas do briefing
 *
 * Etapas:
 * 0 — Welcome (escolha do modo)
 * 1 — Conectar site
 * 2 — Quiz (12 perguntas ou áudio livre ou mínimo)
 * 3 — Refinando (Claude)
 * 4 — Revisão (ficha editável)
 * 5 — Confirmação final → /dashboard
 *
 * State management: useState local + persiste a cada step via /api/briefing/save
 * (rascunho). Só marca completion_status='completed' no último step.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowLeft, Loader2, Sparkles, Mic, ListChecks, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { AuroraBackground } from "@/components/landing/motion/aurora-background";
import { BrandMarkInverted } from "@/components/brand/brand-mark";
import { Magnet } from "@/components/landing/motion/magnet";

import { QuizProgress } from "./quiz-progress";
import { QuizStep } from "./quiz-step";
import { AudioRecorder } from "./audio-recorder";
import { ReviewCard } from "./review-card";

import {
  BRIEFING_QUESTIONS,
  REQUIRED_QUESTIONS,
  QUESTIONS_BY_ID,
  CATEGORIES,
  type RawAnswers,
  type RawAnswer,
  type RefinedBrief,
} from "@/lib/briefing/questions";

type Mode = "guided" | "audio_free" | "minimal";
type Phase = "welcome" | "site" | "quiz" | "refining" | "review" | "done";

interface Props {
  initialBriefing: {
    id: string;
    raw_answers: RawAnswers | null;
    refined_brief: RefinedBrief | null;
    mode: Mode | null;
    completion_status: string | null;
  } | null;
  initialSite: { id: string; url: string } | null;
  userName: string;
}

export function OnboardingFlow({ initialBriefing, initialSite, userName }: Props) {
  const router = useRouter();

  // ===== STATE =====
  const [phase, setPhase] = useState<Phase>(() => {
    if (initialBriefing?.completion_status === "completed") return "done";
    if (initialBriefing?.refined_brief) return "review";
    if (initialBriefing?.raw_answers) return "quiz";
    if (initialSite?.url) return "welcome";
    return "welcome";
  });
  const [mode, setMode] = useState<Mode>(initialBriefing?.mode ?? "guided");
  const [siteUrl, setSiteUrl] = useState(initialSite?.url ?? "");
  const [answers, setAnswers] = useState<RawAnswers>(initialBriefing?.raw_answers ?? {});
  const [refined, setRefined] = useState<RefinedBrief | null>(initialBriefing?.refined_brief ?? null);
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [freeAudioText, setFreeAudioText] = useState("");

  const questions = useMemo(() => {
    if (mode === "minimal") return REQUIRED_QUESTIONS;
    return BRIEFING_QUESTIONS;
  }, [mode]);

  // Resume — pula stepIndex pra primeira pergunta SEM resposta.
  // Se todas respondidas, fica na última (UI mostra "Revisar" no botão).
  const initialStepIndex = useMemo(() => {
    const initialAnswers = initialBriefing?.raw_answers ?? {};
    const firstUnanswered = questions.findIndex((q) => {
      const a = initialAnswers[q.id];
      return !a?.value?.trim();
    });
    return firstUnanswered === -1 ? Math.max(0, questions.length - 1) : firstUnanswered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // só na primeira render — depois é o user navegando
  const [stepIndex, setStepIndex] = useState(initialStepIndex);

  // Conta quantas respostas já estavam salvas — pra mostrar banner "Continuando"
  const resumedAnswersCount = useMemo(() => {
    const initialAnswers = initialBriefing?.raw_answers ?? {};
    return Object.values(initialAnswers).filter((a) => a?.value?.trim()).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isResuming = resumedAnswersCount > 0;

  // ===== EFFECTS (no topo, fora de condicionais — regra dos hooks) =====

  // Dispara refine ao entrar em phase 'refining'
  useEffect(() => {
    if (phase !== "refining") return;
    let cancelled = false;
    (async () => {
      setRefining(true);
      try {
        const res = await fetch("/api/briefing/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw_answers: answers }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { refined: RefinedBrief };
        if (cancelled) return;
        setRefined(data.refined);
        // persist
        try {
          await fetch("/api/briefing/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              raw_answers: answers,
              refined_brief: data.refined,
              mode,
              completion_status: "review",
              site_url: siteUrl || undefined,
            }),
          });
        } catch {
          /* silencioso */
        }
        if (!cancelled) setPhase("review");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao organizar";
        if (!cancelled) {
          toast.error(msg);
          setPhase("quiz");
        }
      } finally {
        if (!cancelled) setRefining(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-redirect quando entra em phase 'done'
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => router.push("/dashboard"), 2500);
    return () => clearTimeout(t);
  }, [phase, router]);

  // ===== HELPERS =====
  async function persist(extra: Partial<{
    completion_status: "in_progress" | "review" | "completed";
    refined_brief: RefinedBrief;
  }> = {}) {
    try {
      const res = await fetch("/api/briefing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_answers: answers,
          refined_brief: extra.refined_brief ?? refined ?? undefined,
          mode,
          completion_status: extra.completion_status ?? "in_progress",
          site_url: siteUrl || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
      throw err;
    }
  }

  // ===== PHASE: WELCOME =====
  if (phase === "welcome") {
    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="ddg-bracket text-ddg-lime mb-4 inline-block">
            BEM-VINDO · 7 MINUTOS PRA TUDO
          </div>
          <h1 className="ddg-display text-4xl md:text-5xl text-ddg-paper mb-3">
            Oi {userName ? `${userName}, ` : ""}bora configurar.
          </h1>
          <p className="text-base md:text-lg text-ddg-paper/70 max-w-xl mx-auto mb-8 leading-relaxed">
            Em ~7 minutos sua engine vai estar entendendo seu negócio. Conta no seu jeito —
            digitando, falando ou os dois.
          </p>

          {/* 3 modos */}
          <div className="grid md:grid-cols-3 gap-3 mb-8">
            <ModeCard
              icon={ListChecks}
              title="Quiz guiado"
              desc="12 perguntas curtas. Pode complementar cada uma com áudio."
              active={mode === "guided"}
              onClick={() => setMode("guided")}
              time="5-10 min"
            />
            <ModeCard
              icon={Mic}
              title="Áudio livre"
              desc="Fala 5-10 min sobre sua empresa. A IA organiza tudo."
              active={mode === "audio_free"}
              onClick={() => setMode("audio_free")}
              time="5-10 min"
              badge="Mais natural"
            />
            <ModeCard
              icon={Zap}
              title="Mínimo viável"
              desc="Só as 4 perguntas essenciais. Resto preenche depois."
              active={mode === "minimal"}
              onClick={() => setMode("minimal")}
              time="2-3 min"
            />
          </div>

          <Magnet strength={0.15}>
            <button
              type="button"
              onClick={() => setPhase("site")}
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              Começar
              <ArrowRight className="w-4 h-4" />
            </button>
          </Magnet>
        </motion.div>
      </Shell>
    );
  }

  // ===== PHASE: CONNECT SITE =====
  if (phase === "site") {
    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto"
        >
          <QuizProgress current={1} total={3 + questions.length} label="Configuração" />

          <div className="mt-8">
            <div className="ddg-bracket text-ddg-lime mb-4 inline-block">PASSO 1 · SEU SITE</div>
            <h2 className="ddg-display text-3xl md:text-4xl text-ddg-paper mb-2">
              Qual o site da sua empresa?
            </h2>
            <p className="text-sm text-ddg-paper/60 mb-6">
              Pode ser o site atual, blog, ou landing. A engine vai analisar pra entender o
              contexto e configurar o reverse proxy depois.
            </p>

            <input
              type="url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://suaempresa.com.br"
              className="w-full h-12 px-4 rounded-lg border-2 border-ddg-paper/15 bg-ddg-paper/[0.04] text-ddg-paper placeholder:text-ddg-paper/30 focus:border-ddg-lime/60 focus:bg-ddg-paper/[0.06] focus:outline-none transition-colors text-base"
              autoFocus
            />

            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => setPhase("welcome")}
                className="inline-flex items-center gap-1.5 text-sm text-ddg-paper/60 hover:text-ddg-paper"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!siteUrl.trim()) return;
                  try {
                    await persist();
                    setPhase("quiz");
                    setStepIndex(0);
                  } catch {
                    // toast já mostrou
                  }
                }}
                disabled={!siteUrl.trim()}
                className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_var(--ddg-ink)] disabled:hover:translate-y-0"
              >
                {mode === "audio_free" ? "Gravar briefing" : "Começar quiz"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </Shell>
    );
  }

  // ===== PHASE: QUIZ =====
  if (phase === "quiz") {
    // Modo audio_free: 1 tela só, gravação livre
    if (mode === "audio_free") {
      return (
        <Shell>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <QuizProgress current={2} total={3} label="Briefing" />

            <div className="mt-8">
              <div className="ddg-bracket text-ddg-lime mb-4 inline-block">ÁUDIO LIVRE</div>
              <h2 className="ddg-display text-3xl md:text-4xl text-ddg-paper mb-3">
                Fala tudo sobre sua empresa.
              </h2>
              <p className="text-sm text-ddg-paper/70 mb-6 leading-relaxed">
                Sem pressa. Pode falar nome, o que faz, quem é o cliente, diferenciais, casos,
                concorrentes, dores que resolve. Quanto mais detalhe, melhor a engine fica.
                <strong className="text-ddg-paper"> A IA organiza depois.</strong>
              </p>

              <AudioRecorder
                onTranscribed={(text) => {
                  setFreeAudioText(text);
                  // Mapeia áudio livre como answer de "what_we_do" pra cair no refine
                  setAnswers((prev) => ({
                    ...prev,
                    company_name: prev.company_name ?? {
                      value: "(extrair do áudio)",
                      source: "audio",
                      updated_at: new Date().toISOString(),
                    },
                    what_we_do: {
                      value: text,
                      source: "audio",
                      audio_transcript: text,
                      updated_at: new Date().toISOString(),
                    } as RawAnswer,
                  }));
                }}
              />

              {freeAudioText && (
                <p className="text-xs text-ddg-paper/50 mt-4">
                  Quando terminar, clica em <strong className="text-ddg-lime">Revisar</strong> abaixo
                  pra ver como a IA organizou.
                </p>
              )}

              <div className="flex items-center justify-between mt-6">
                <button
                  type="button"
                  onClick={() => setPhase("site")}
                  className="inline-flex items-center gap-1.5 text-sm text-ddg-paper/60 hover:text-ddg-paper"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!freeAudioText.trim()) {
                      toast.error("Grave o áudio primeiro");
                      return;
                    }
                    await persist();
                    setPhase("refining");
                  }}
                  disabled={!freeAudioText.trim()}
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_var(--ddg-ink)] disabled:hover:translate-y-0"
                >
                  Revisar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </Shell>
      );
    }

    // Modo guided / minimal — itera perguntas
    const q = questions[stepIndex];
    if (!q) {
      // chegou ao fim
      void persist().then(() => setPhase("refining"));
      return <Shell><LoadingBlock label="Salvando…" /></Shell>;
    }

    return (
      <Shell>
        <div className="max-w-2xl mx-auto">
          <QuizProgress
            current={2 + stepIndex}
            total={3 + questions.length}
            label="Briefing"
          />

          {/* Banner "Continuando de onde parou" — só aparece se voltou com respostas */}
          {isResuming && stepIndex === initialStepIndex && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-3 rounded-lg border border-ddg-lime/30 bg-ddg-lime/5 px-4 py-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-ddg-lime shrink-0" />
              <p className="text-xs text-ddg-paper/80">
                <strong className="text-ddg-paper">Continuando de onde você parou.</strong>{" "}
                {resumedAnswersCount} {resumedAnswersCount === 1 ? "resposta salva" : "respostas salvas"} —
                pode editar voltando se precisar.
              </p>
            </motion.div>
          )}

          <div className="mt-8">
            <AnimatePresence mode="wait">
              <QuizStep
                key={q.id}
                question={q}
                index={stepIndex}
                total={questions.length}
                initial={answers[q.id]}
                onAdvance={async (answer) => {
                  const next = { ...answers, [q.id]: answer };
                  setAnswers(next);
                  if (stepIndex + 1 < questions.length) {
                    setStepIndex(stepIndex + 1);
                    // salva rascunho a cada step
                    try {
                      await fetch("/api/briefing/save", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          raw_answers: next,
                          mode,
                          completion_status: "in_progress",
                          site_url: siteUrl || undefined,
                        }),
                      });
                    } catch {
                      /* silencioso */
                    }
                  } else {
                    // Última pergunta → vai pro refining
                    await persist();
                    setPhase("refining");
                  }
                }}
                onBack={
                  stepIndex > 0
                    ? () => setStepIndex(stepIndex - 1)
                    : () => setPhase("site")
                }
                onSkip={
                  q.required
                    ? undefined
                    : async () => {
                        if (stepIndex + 1 < questions.length) {
                          setStepIndex(stepIndex + 1);
                        } else {
                          await persist();
                          setPhase("refining");
                        }
                      }
                }
              />
            </AnimatePresence>
          </div>
        </div>
      </Shell>
    );
  }

  // ===== PHASE: REFINING (Claude) =====
  if (phase === "refining") {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ddg-lime/20 border-2 border-ddg-lime/40 mb-5">
            <Sparkles className="w-7 h-7 text-ddg-lime ddg-pulse" />
          </div>
          <h2 className="ddg-display text-3xl text-ddg-paper mb-3">
            Organizando tudo…
          </h2>
          <p className="text-sm text-ddg-paper/60 leading-relaxed">
            A IA está estruturando suas respostas em uma ficha limpa.
            Vai levar ~30 segundos.
          </p>
          <div className="mt-6">
            <Loader2 className="w-6 h-6 text-ddg-lime animate-spin mx-auto" />
          </div>
        </div>
      </Shell>
    );
  }

  // ===== PHASE: REVIEW =====
  if (phase === "review" && refined) {
    return (
      <Shell>
        <div className="max-w-3xl mx-auto pb-8">
          <QuizProgress current={3 + questions.length} total={3 + questions.length} label="Quase lá" />

          <div className="mt-8 mb-6 text-center">
            <div className="ddg-bracket text-ddg-lime mb-3 inline-block">REVISÃO FINAL</div>
            <h2 className="ddg-display text-3xl md:text-4xl text-ddg-paper mb-2">
              Sua ficha de marca.
            </h2>
            <p className="text-sm text-ddg-paper/70 max-w-xl mx-auto leading-relaxed">
              A IA organizou suas respostas. Edite qualquer campo clicando em <strong className="text-ddg-lime">Editar</strong>.
              Quando estiver satisfeito, clica em <strong className="text-ddg-lime">Confirmar</strong> e vamos pro painel.
            </p>
          </div>

          {/* Cards de revisão por categoria */}
          <div className="space-y-3">
            <ReviewCard
              label="Empresa"
              value={refined.identity?.company_name ?? ""}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  identity: { ...refined.identity, company_name: v },
                })
              }
            />
            <ReviewCard
              label="O que faz"
              value={refined.identity?.description ?? ""}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  identity: { ...refined.identity, description: v },
                })
              }
              multiline
            />
            <ReviewCard
              label="Pitch expandido"
              value={refined.identity?.elevator_pitch ?? ""}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  identity: { ...refined.identity, elevator_pitch: v },
                })
              }
              multiline
            />
            <ReviewCard
              label="Cliente ideal"
              value={refined.audience?.ideal_customer ?? ""}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  audience: { ...refined.audience, ideal_customer: v },
                })
              }
              multiline
            />
            <ReviewCard
              label="Maior dor que resolve"
              value={refined.audience?.main_pain ?? ""}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  audience: { ...refined.audience, main_pain: v },
                })
              }
              multiline
            />
            <ReviewCard
              label="Diferenciais"
              value={refined.positioning?.differentials ?? []}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  positioning: {
                    ...refined.positioning,
                    differentials: v.split("\n").map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
              multiline
            />
            <ReviewCard
              label="Tom de voz"
              value={refined.voice?.tone ?? ""}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  voice: { ...refined.voice, tone: v },
                })
              }
              multiline
            />
            <ReviewCard
              label="Palavras-chave (SEO)"
              value={refined.seo?.primary_keywords ?? []}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  seo: {
                    ...refined.seo,
                    primary_keywords: v.split("\n").map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
              multiline
            />
            <ReviewCard
              label="Perguntas-alvo em IA"
              value={refined.visibility_goal?.target_questions ?? []}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  visibility_goal: {
                    target_questions: v.split("\n").map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
              multiline
            />
            <ReviewCard
              label="Concorrentes"
              value={refined.market?.competitors ?? []}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  market: {
                    competitors: v.split("\n").map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
              multiline
            />
            <ReviewCard
              label="Cases"
              value={refined.storytelling?.case_summaries ?? []}
              onSave={(v) =>
                setRefined({
                  ...refined,
                  storytelling: {
                    case_summaries: v.split("\n\n").map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
              multiline
            />
          </div>

          {/* Bottom CTA */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-ddg-paper/10">
            <button
              type="button"
              onClick={() => setPhase("quiz")}
              className="inline-flex items-center gap-1.5 text-sm text-ddg-paper/60 hover:text-ddg-paper"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar pro quiz
            </button>
            <Magnet strength={0.15}>
              <button
                type="button"
                onClick={async () => {
                  setSaving(true);
                  try {
                    await persist({
                      completion_status: "completed",
                      refined_brief: refined,
                    });
                    setPhase("done");
                  } catch {
                    /* já mostrou toast */
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 h-12 px-7 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  <>
                    Confirmar e ir pro painel
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </Magnet>
          </div>
        </div>
      </Shell>
    );
  }

  // ===== PHASE: DONE =====
  if (phase === "done") {
    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-md mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-ddg-lime border-2 border-ddg-ink shadow-[4px_4px_0_var(--ddg-ink)] mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-ddg-ink" strokeWidth={2.5} />
          </motion.div>
          <h2 className="ddg-display text-4xl md:text-5xl text-ddg-paper mb-3">
            Tudo pronto!
          </h2>
          <p className="text-base text-ddg-paper/70 leading-relaxed mb-5">
            Sua engine entendeu seu negócio. Próximo passo: ver o painel rodando.
          </p>
          <p className="text-xs font-mono uppercase tracking-widest text-ddg-paper/40">
            Redirecionando em 2 segundos…
          </p>
        </motion.div>
      </Shell>
    );
  }

  return null;
}

// ===== HELPERS =====

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-ddg-ink text-ddg-paper overflow-hidden">
      <AuroraBackground />
      <header className="relative z-10 border-b border-ddg-paper/10 backdrop-blur-sm bg-ddg-ink/40">
        <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <BrandMarkInverted size="md" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40">
            Onboarding
          </span>
        </div>
      </header>
      <main className="relative z-10 container mx-auto max-w-6xl px-4 py-8 md:py-12">
        {children}
      </main>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="text-center py-12">
      <Loader2 className="w-6 h-6 text-ddg-lime animate-spin mx-auto mb-3" />
      <p className="text-sm text-ddg-paper/60">{label}</p>
    </div>
  );
}

function ModeCard({
  icon: Icon,
  title,
  desc,
  active,
  onClick,
  time,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
  time: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left p-5 rounded-xl border-2 transition-all ${
        active
          ? "border-ddg-lime bg-ddg-lime/10 shadow-[3px_3px_0_var(--ddg-lime)]"
          : "border-ddg-paper/15 bg-ddg-paper/[0.03] hover:border-ddg-paper/30 hover:bg-ddg-paper/[0.06]"
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-ddg-lime text-ddg-ink text-[9px] font-mono font-bold uppercase tracking-widest">
          {badge}
        </span>
      )}
      <Icon className={`w-6 h-6 mb-3 ${active ? "text-ddg-lime" : "text-ddg-paper/60"}`} />
      <h3 className={`font-bold text-sm mb-1 ${active ? "text-ddg-paper" : "text-ddg-paper/90"}`}>
        {title}
      </h3>
      <p className="text-xs text-ddg-paper/60 leading-relaxed mb-2">{desc}</p>
      <p className="text-[9px] font-mono uppercase tracking-widest text-ddg-paper/40">{time}</p>
    </button>
  );
}
