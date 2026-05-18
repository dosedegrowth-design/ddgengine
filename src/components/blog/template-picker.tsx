"use client";

/**
 * 4 cards visuais pra escolher o template do blog.
 * Cada card é um botão. onSelect recebe o id do template.
 *
 * Quando `current` é setado, marca como ativo.
 * Em mode='inline' (settings), aciona save ao clicar.
 * Em mode='form' (onboarding), só seta state — o parent confirma.
 */
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import {
  type BlogTemplate,
  TEMPLATES_META,
} from "@/lib/blog/templates";
import { setBlogTemplateAction } from "@/app/(app)/settings/site/blog-template-actions";

interface Props {
  current?: BlogTemplate;
  mode?: "inline" | "form";
  /** Em mode='form', chamado quando user troca de template */
  onChange?: (t: BlogTemplate) => void;
}

const PREVIEW_BG: Record<BlogTemplate, string> = {
  editorial: "bg-stone-50 text-stone-900",
  magazine: "bg-white text-black",
  minimal: "bg-white text-stone-900",
  bold: "bg-yellow-50 text-black",
};

const PREVIEW_ACCENT: Record<BlogTemplate, string> = {
  editorial: "bg-red-600",
  magazine: "bg-pink-500",
  minimal: "bg-blue-500",
  bold: "bg-lime-400",
};

export function TemplatePicker({ current, mode = "form", onChange }: Props) {
  const [selected, setSelected] = useState<BlogTemplate | undefined>(current);
  const [pending, start] = useTransition();

  function handlePick(id: BlogTemplate) {
    setSelected(id);
    if (mode === "form") {
      onChange?.(id);
      return;
    }
    // inline (settings) — salva direto
    start(async () => {
      const r = await setBlogTemplateAction(id);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Template do blog atualizado");
    });
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {TEMPLATES_META.map((t) => {
        const active = selected === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handlePick(t.id)}
            disabled={pending}
            className={`text-left rounded-xl border-2 overflow-hidden transition-all disabled:opacity-50 ${
              active
                ? "border-ddg-ink shadow-[4px_4px_0_var(--ddg-ink)] -translate-y-0.5"
                : "border-ddg-stone hover:border-ddg-ink/40 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ddg-ink)]"
            }`}
          >
            {/* Preview "miniatura" do template */}
            <div className={`relative h-32 p-3 ${PREVIEW_BG[t.id]} border-b-2 border-ddg-stone`}>
              {/* Header simulado */}
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`h-2 w-12 rounded-full ${
                    t.id === "bold" || t.id === "magazine" ? "bg-black" : "bg-stone-400"
                  }`}
                />
                <div className="h-1.5 w-6 rounded-full bg-stone-300" />
              </div>
              {/* Cards simulados */}
              {t.id === "magazine" ? (
                <>
                  <div className="h-12 w-full rounded mb-1.5 bg-stone-300" />
                  <div className="grid grid-cols-2 gap-1">
                    <div className="h-5 rounded bg-stone-200" />
                    <div className="h-5 rounded bg-stone-200" />
                  </div>
                </>
              ) : t.id === "bold" ? (
                <>
                  <div className="h-5 w-3/4 mb-1.5 bg-black" />
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className={`h-9 rounded border-2 border-black ${PREVIEW_ACCENT[t.id]}/20`} />
                    <div className="h-9 rounded border-2 border-black bg-white" />
                  </div>
                </>
              ) : t.id === "minimal" ? (
                <>
                  <div className="h-2 w-2/3 bg-stone-400 rounded mb-2" />
                  <div className="space-y-1">
                    <div className="h-1 w-full bg-stone-200 rounded" />
                    <div className="h-1 w-5/6 bg-stone-200 rounded" />
                    <div className="h-1 w-4/6 bg-stone-200 rounded" />
                  </div>
                </>
              ) : (
                <>
                  <div className="h-2 w-3/4 bg-stone-700 rounded mb-2" />
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-stone-300 rounded" />
                    <div className="h-1.5 w-5/6 bg-stone-300 rounded" />
                  </div>
                </>
              )}
              {/* Accent dot canto inferior direito */}
              <div
                className={`absolute bottom-2 right-2 w-3 h-3 rounded-full ${PREVIEW_ACCENT[t.id]}`}
              />
              {active && (
                <div className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-ddg-lime border-2 border-ddg-ink">
                  {pending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-ddg-ink" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-ddg-ink" strokeWidth={3} />
                  )}
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="p-3 bg-ddg-paper">
              <div className="font-bold text-sm text-ddg-ink mb-0.5">{t.label}</div>
              <p className="text-xs text-ddg-muted leading-snug mb-1.5 line-clamp-2">
                {t.description}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                {t.bestFor}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
