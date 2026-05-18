"use client";

/**
 * Step do onboarding: cliente escolhe o template visual do blog.
 *
 * Salva via setBlogTemplateAction quando confirma (não no click).
 * Default 'editorial' se o user pular.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { Magnet } from "@/components/landing/motion/magnet";
import { TemplatePicker } from "@/components/blog/template-picker";
import { setBlogTemplateAction } from "@/app/(app)/settings/site/blog-template-actions";
import type { BlogTemplate } from "@/lib/blog/templates";

interface Props {
  onBack: () => void;
  onDone: () => void;
}

export function TemplateStep({ onBack, onDone }: Props) {
  const [selected, setSelected] = useState<BlogTemplate>("editorial");
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      const r = await setBlogTemplateAction(selected);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="text-center mb-6">
        <div className="ddg-bracket text-ddg-lime mb-3 inline-block">
          ESCOLHE A CARA DO SEU BLOG
        </div>
        <h2 className="ddg-display text-3xl md:text-4xl text-ddg-paper mb-2">
          Como seu blog vai aparecer.
        </h2>
        <p className="text-sm text-ddg-paper/70 max-w-xl mx-auto leading-relaxed">
          4 estilos pra escolher. Pode trocar a qualquer momento depois nas
          configurações.
        </p>
      </div>

      <TemplatePicker mode="form" current={selected} onChange={setSelected} />

      <div className="flex items-center justify-between pt-8 mt-8 border-t border-ddg-paper/10">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="inline-flex items-center gap-1.5 text-sm text-ddg-paper/60 hover:text-ddg-paper disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar pras categorias
        </button>
        <Magnet strength={0.15}>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="inline-flex items-center gap-2 h-12 px-7 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Salvando…
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
  );
}
