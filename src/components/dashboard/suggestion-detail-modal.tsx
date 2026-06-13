"use client";

/**
 * Modal mostrado quando o user clica em uma sugestão.
 * Permite ele dar contexto adicional (texto OU áudio) antes de gerar.
 *
 * - Texto: textarea livre
 * - Áudio: usa AudioRecorder (mesma do briefing) → Whisper transcreve
 * - Botão "Gerar sem detalhes" pula direto pro generatePostAction
 * - Botão "Gerar com detalhes" envia extraNotes pro action
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Sparkles, Loader2, FileText, HelpCircle, Zap, ArrowRight } from "lucide-react";
import { generatePostAction } from "@/app/(app)/posts/actions";
import { AudioRecorder } from "@/components/briefing/audio-recorder";

interface Suggestion {
  kind: "keyword" | "question" | "differential" | "opportunity";
  label: string;
  description: string;
  metric?: {
    volume: number;
    competition: string | null;
    trend: number | null;
    score: number;
  };
  payload:
    | { type: "long_form"; topic?: string; targetKeyword?: string }
    | { type: "faq_page"; targetQuestion: string };
}

interface Props {
  suggestion: Suggestion;
  onClose: () => void;
}

const ICONS = {
  keyword: FileText,
  question: HelpCircle,
  differential: Zap,
  opportunity: FileText,
} as const;

const KIND_LABEL = {
  keyword: "SEO",
  question: "FAQ pra IAs",
  differential: "Diferencial",
  opportunity: "Oportunidade",
} as const;

export function SuggestionDetailModal({ suggestion, onClose }: Props) {
  const router = useRouter();
  const [extraNotes, setExtraNotes] = useState("");
  const [pending, start] = useTransition();
  const Icon = ICONS[suggestion.kind];

  function handleGenerate(includeNotes: boolean) {
    start(async () => {
      toast.info("Gerando post… pode levar 1-2 minutos.");
      const result = await generatePostAction({
        ...suggestion.payload,
        extraNotes: includeNotes ? extraNotes.trim() || undefined : undefined,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      const post = "post" in result ? (result.post as { id?: string; postId?: string } | null) : null;
      const postId = post?.id ?? post?.postId;
      toast.success("Post gerado! Abrindo editor…");
      onClose();
      if (postId) router.push(`/posts/${postId}`);
      else router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ddg-ink/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border-2 border-ddg-ink bg-ddg-paper shadow-[6px_6px_0_var(--ddg-ink)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 md:p-6 border-b-2 border-ddg-ink">
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-ddg-lime border-2 border-ddg-ink">
              <Icon className="w-5 h-5 text-ddg-ink" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="ddg-bracket mb-1">{KIND_LABEL[suggestion.kind]}</div>
              <h2 className="font-black text-base md:text-lg text-ddg-ink leading-snug">
                {suggestion.label}
              </h2>
              <p className="text-xs text-ddg-muted mt-1">{suggestion.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="shrink-0 p-1.5 rounded-md border-2 border-ddg-ink hover:bg-ddg-ink hover:text-ddg-paper transition-colors disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 md:p-6 space-y-4">
          <div>
            <label htmlFor="extraNotes" className="ddg-bracket text-ddg-muted block mb-2">
              Detalhes do que você quer ver no post (opcional)
            </label>
            <textarea
              id="extraNotes"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Ex: Quero focar no público feminino. Incluir um case da Animale. Não usar 'aluguel de modelos'."
              disabled={pending}
              rows={4}
              className="w-full p-3 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none disabled:opacity-50 transition-colors text-sm resize-none"
            />
            <p className="text-xs text-ddg-muted mt-2">
              A engine vai incorporar isso no post além das informações do briefing.
            </p>
          </div>

          {/* Áudio (alternativa ao texto) */}
          <div className="rounded-xl border-2 border-dashed border-ddg-stone p-4">
            <div className="ddg-bracket mb-2">OU FALE EM ÁUDIO</div>
            <AudioRecorder
              onTranscribed={(text) => {
                // Concatena ao texto existente (se já tem) ou substitui
                setExtraNotes((prev) =>
                  prev.trim() ? `${prev.trim()}\n\n${text}` : text
                );
                toast.success("Áudio transcrito e adicionado!");
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-5 md:p-6 border-t-2 border-ddg-stone">
          <button
            type="button"
            onClick={() => handleGenerate(false)}
            disabled={pending}
            className="text-xs font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink transition-colors disabled:opacity-40"
          >
            Pular e gerar direto
          </button>
          <button
            type="button"
            onClick={() => handleGenerate(true)}
            disabled={pending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-wait disabled:hover:shadow-[3px_3px_0_var(--ddg-ink)] disabled:hover:translate-y-0"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Gerar post
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
