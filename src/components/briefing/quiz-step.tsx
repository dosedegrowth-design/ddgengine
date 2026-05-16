/**
 * QuizStep — uma pergunta do quiz com 3 modos de input
 *
 * Modos:
 * - Texto digitado
 * - Áudio gravado (Whisper transcreve)
 * - Combinado (escreve + complementa por áudio)
 *
 * Mostra o label, hint, exemplos opcionais, e botão Avançar
 */
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import type { BriefingQuestion, RawAnswer } from "@/lib/briefing/questions";
import { AudioRecorder } from "./audio-recorder";
import { cn } from "@/lib/utils";

interface Props {
  question: BriefingQuestion;
  index: number;
  total: number;
  initial?: RawAnswer;
  onAdvance: (answer: RawAnswer) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

export function QuizStep({ question, index, total, initial, onAdvance, onBack, onSkip }: Props) {
  const [textValue, setTextValue] = useState(initial?.value ?? "");
  const [audioTranscript, setAudioTranscript] = useState(initial?.audio_transcript ?? "");
  const [multiValue, setMultiValue] = useState<string[]>(
    question.type === "multichoice" && initial?.value
      ? initial.value.split(",").map((s) => s.trim()).filter(Boolean)
      : []
  );
  const [showAudio, setShowAudio] = useState(false);

  function handleAdvance() {
    let value = "";
    let source: RawAnswer["source"] = "text";

    if (question.type === "multichoice") {
      value = multiValue.join(", ");
      source = "text";
    } else {
      // Combina texto + áudio
      const hasText = textValue.trim().length > 0;
      const hasAudio = audioTranscript.trim().length > 0;
      if (hasText && hasAudio) {
        value = `${textValue.trim()}\n\n[Complemento por áudio]: ${audioTranscript.trim()}`;
        source = "mixed";
      } else if (hasAudio) {
        value = audioTranscript.trim();
        source = "audio";
      } else {
        value = textValue.trim();
        source = "text";
      }
    }

    if (question.required && !value.trim()) {
      return; // botão fica disabled
    }

    onAdvance({
      value,
      source,
      audio_transcript: audioTranscript || undefined,
      updated_at: new Date().toISOString(),
    });
  }

  function toggleMultiChoice(val: string) {
    setMultiValue((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }

  const canAdvance =
    !question.required ||
    (question.type === "multichoice"
      ? multiValue.length > 0
      : (textValue.trim() + audioTranscript.trim()).length > 0);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      {/* Meta */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-lime">
          Pergunta {index + 1} de {total}
        </span>
        {!question.required && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40">
            Opcional
          </span>
        )}
        {question.audioRecommended && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-ddg-paper/60">
            <Sparkles className="w-3 h-3 text-ddg-lime" />
            Áudio recomendado
          </span>
        )}
      </div>

      {/* Pergunta */}
      <h2 className="text-2xl md:text-3xl font-black text-ddg-paper leading-tight mb-2">
        {question.label}
      </h2>
      {question.hint && (
        <p className="text-sm text-ddg-paper/60 mb-5 leading-relaxed">{question.hint}</p>
      )}

      {/* Inputs */}
      {question.type === "text" && (
        <input
          type="text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder={question.placeholder}
          className="w-full h-12 px-4 rounded-lg border-2 border-ddg-paper/15 bg-ddg-paper/[0.04] text-ddg-paper placeholder:text-ddg-paper/30 focus:border-ddg-lime/60 focus:bg-ddg-paper/[0.06] focus:outline-none transition-colors text-base"
        />
      )}

      {question.type === "textarea" && (
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder={question.placeholder}
          rows={5}
          className="w-full px-4 py-3 rounded-lg border-2 border-ddg-paper/15 bg-ddg-paper/[0.04] text-ddg-paper placeholder:text-ddg-paper/30 focus:border-ddg-lime/60 focus:bg-ddg-paper/[0.06] focus:outline-none transition-colors text-base resize-none leading-relaxed"
        />
      )}

      {question.type === "list" && (
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder={question.placeholder}
          rows={4}
          className="w-full px-4 py-3 rounded-lg border-2 border-ddg-paper/15 bg-ddg-paper/[0.04] text-ddg-paper placeholder:text-ddg-paper/30 focus:border-ddg-lime/60 focus:bg-ddg-paper/[0.06] focus:outline-none transition-colors text-base resize-none leading-relaxed"
        />
      )}

      {question.type === "multichoice" && question.choices && (
        <div className="flex flex-wrap gap-2">
          {question.choices.map((c) => {
            const active = multiValue.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleMultiChoice(c.value)}
                className={cn(
                  "px-4 py-2 rounded-full border-2 text-sm font-medium transition-all",
                  active
                    ? "border-ddg-lime bg-ddg-lime/20 text-ddg-lime"
                    : "border-ddg-paper/15 bg-ddg-paper/[0.04] text-ddg-paper/80 hover:border-ddg-paper/30 hover:bg-ddg-paper/[0.08]"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Áudio (oculto pra multichoice) */}
      {question.type !== "multichoice" && (
        <div className="mt-3">
          {!showAudio ? (
            <button
              type="button"
              onClick={() => setShowAudio(true)}
              className="text-xs text-ddg-paper/60 hover:text-ddg-lime transition-colors inline-flex items-center gap-1.5 font-mono uppercase tracking-widest"
            >
              <span className="text-ddg-lime">+</span>
              Falar em vez de digitar
            </button>
          ) : (
            <AudioRecorder
              compact
              initialText={audioTranscript}
              onTranscribed={(text) => setAudioTranscript(text)}
            />
          )}
        </div>
      )}

      {/* Examples opcional */}
      {question.examples && question.examples.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40 mb-1">
            Exemplos
          </p>
          <ul className="text-xs text-ddg-paper/50 leading-relaxed list-disc list-inside space-y-0.5">
            {question.examples.map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Navegação */}
      <div className="flex items-center gap-3 mt-7">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-ddg-paper/60 hover:text-ddg-paper text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        )}

        {onSkip && !question.required && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-ddg-paper/40 hover:text-ddg-paper transition-colors font-mono uppercase tracking-widest"
          >
            Pular
          </button>
        )}

        <div className="ml-auto">
          <button
            type="button"
            onClick={handleAdvance}
            disabled={!canAdvance}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[1px_1px_0_var(--ddg-ink)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_var(--ddg-ink)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            {index + 1 === total ? "Revisar" : "Avançar"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
