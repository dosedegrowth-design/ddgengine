"use client";

/**
 * Step do onboarding: cliente confirma/edita as 5 categorias de blog
 * sugeridas pela IA baseado no briefing.
 *
 * Fluxo:
 * 1. mount → POST /api/categories/suggest → 5 sugestões
 * 2. Cliente edita (rename), remove, ou adiciona até 8 categorias
 * 3. "Confirmar" → commitOnboardingCategoriesAction → salva no DB
 * 4. onDone() chama setPhase("done") no parent
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { Magnet } from "@/components/landing/motion/magnet";
import { commitOnboardingCategoriesAction } from "@/app/(app)/settings/categories/actions";
import { slugify } from "@/lib/utils";

interface Category {
  name: string;
  slug: string;
  description: string;
}

interface Props {
  onBack: () => void;
  onDone: () => void;
}

export function CategoriesStep({ onBack, onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");

  // Carrega sugestões da IA no mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories/suggest", { method: "POST" });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { categories: Category[] };
        if (!cancelled) setCategories(data.categories ?? []);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error
              ? `Não conseguimos sugerir categorias: ${err.message}`
              : "Erro ao sugerir categorias"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateName(idx: number, newName: string) {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === idx
          ? { ...c, name: newName, slug: slugify(newName) || c.slug }
          : c
      )
    );
  }

  function removeAt(idx: number) {
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  }

  function addCategory() {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.length >= 8) {
      toast.error("Máximo 8 categorias. Remova alguma antes.");
      return;
    }
    const slug = slugify(name) || `categoria-${categories.length + 1}`;
    if (categories.some((c) => c.slug === slug)) {
      toast.error("Essa categoria já existe.");
      return;
    }
    setCategories((prev) => [...prev, { name, slug, description: "" }]);
    setNewCatName("");
  }

  async function handleConfirm() {
    if (categories.length === 0) {
      toast.error("Tenha pelo menos 1 categoria.");
      return;
    }
    setSaving(true);
    try {
      const r = await commitOnboardingCategoriesAction(categories);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Categorias salvas!");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ddg-lime/20 border-2 border-ddg-lime/40 mb-4">
          <Tag className="w-6 h-6 text-ddg-lime ddg-pulse" />
        </div>
        <h2 className="ddg-display text-2xl text-ddg-paper mb-2">
          Organizando as categorias do seu blog…
        </h2>
        <p className="text-sm text-ddg-paper/60 leading-relaxed mb-4">
          A IA está montando 5 categorias baseadas no seu briefing.
        </p>
        <Loader2 className="w-5 h-5 text-ddg-lime animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <div className="text-center mb-6">
        <div className="ddg-bracket text-ddg-lime mb-3 inline-block">
          CATEGORIAS · 1 CLICK PRA AJUSTAR
        </div>
        <h2 className="ddg-display text-3xl md:text-4xl text-ddg-paper mb-2">
          Como seu blog vai ser organizado.
        </h2>
        <p className="text-sm text-ddg-paper/70 max-w-xl mx-auto leading-relaxed">
          Sugestões da IA baseadas no que você contou.{" "}
          <strong className="text-ddg-paper">Edita, remove ou adiciona</strong>{" "}
          — depois você ainda pode mudar tudo lá no painel.
        </p>
      </div>

      {/* Lista editável */}
      <div className="space-y-2 mb-5">
        {categories.map((c, i) => (
          <div
            key={`${c.slug}-${i}`}
            className="group flex items-center gap-3 p-3 rounded-xl border-2 border-ddg-paper/15 bg-ddg-paper/[0.04] hover:bg-ddg-paper/[0.06] transition-colors"
          >
            <div className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-ddg-lime border-2 border-ddg-ink/40">
              <Tag className="w-4 h-4 text-ddg-ink" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateName(i, e.target.value)}
                className="w-full bg-transparent text-ddg-paper font-bold text-sm focus:outline-none focus:bg-ddg-paper/5 rounded px-1 -mx-1"
                maxLength={50}
              />
              {c.description && (
                <p className="text-xs text-ddg-paper/50 truncate mt-0.5">
                  {c.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Remover categoria"
              className="shrink-0 p-1.5 rounded-md text-ddg-paper/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Adicionar nova */}
      {categories.length < 8 && (
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
            placeholder="Adicionar categoria…"
            maxLength={50}
            className="flex-1 h-10 px-3 rounded-lg border-2 border-ddg-paper/15 bg-ddg-paper/[0.04] text-ddg-paper placeholder:text-ddg-paper/30 focus:border-ddg-lime/60 focus:outline-none transition-colors text-sm"
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={!newCatName.trim()}
            className="inline-flex items-center gap-1.5 px-3 h-10 rounded-lg border-2 border-ddg-paper/20 text-ddg-paper text-sm hover:border-ddg-lime/60 hover:text-ddg-lime transition-colors disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      )}

      {/* Counter */}
      <p className="text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40 text-center mb-6">
        {categories.length}/8 categorias · você pode editar tudo depois em Configurações
      </p>

      {/* Bottom CTA */}
      <div className="flex items-center justify-between pt-6 border-t border-ddg-paper/10">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="inline-flex items-center gap-1.5 text-sm text-ddg-paper/60 hover:text-ddg-paper disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar pra revisão
        </button>
        <Magnet strength={0.15}>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || categories.length === 0}
            className="inline-flex items-center gap-2 h-12 px-7 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Salvando…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
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
