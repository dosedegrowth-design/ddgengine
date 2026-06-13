"use client";

/**
 * AutopilotPanel — liga o piloto automático: o sistema escolhe a melhor
 * palavra-chave da fila e gera o post sozinho, na cadência escolhida.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Rocket, Loader2 } from "lucide-react";
import { setAutopilotAction } from "@/app/(app)/palavras-chave/actions";

export function AutopilotPanel({
  initialEnabled,
  initialPerWeek,
}: {
  initialEnabled: boolean;
  initialPerWeek: number;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [perWeek, setPerWeek] = useState(initialPerWeek || 3);
  const [isPending, startTransition] = useTransition();

  function save(nextEnabled: boolean, nextPerWeek: number) {
    setEnabled(nextEnabled);
    setPerWeek(nextPerWeek);
    startTransition(async () => {
      const res = await setAutopilotAction({ enabled: nextEnabled, postsPerWeek: nextPerWeek });
      if (!res.ok) {
        toast.error(res.error ?? "Falha ao salvar");
        setEnabled(initialEnabled);
        return;
      }
      toast.success(
        nextEnabled
          ? `Piloto automático ligado · ${nextPerWeek} posts/semana`
          : "Piloto automático desligado"
      );
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-2xl border-2 p-5 transition-colors ${
        enabled ? "border-ddg-ink bg-ddg-lime/10" : "border-ddg-stone bg-ddg-paper"
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-ddg-ink bg-ddg-lime/20">
            <Rocket className="w-4 h-4 text-ddg-ink" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-ddg-ink flex items-center gap-2">
              Piloto automático
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-ddg-muted" />}
            </div>
            <p className="text-xs text-ddg-muted mt-0.5 max-w-md">
              Liga e o sistema escolhe sozinho a melhor palavra-chave (volume ×
              ganhabilidade), escreve e publica — sem repetir tema.
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={() => save(!enabled, perWeek)}
          disabled={isPending}
          aria-pressed={enabled}
          className={`shrink-0 relative inline-flex h-7 w-12 items-center rounded-full border-2 border-ddg-ink transition-colors disabled:opacity-50 ${
            enabled ? "bg-ddg-lime" : "bg-ddg-stone"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-ddg-ink transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-ddg-ink">Cadência:</span>
          {[
            { label: "3/semana", v: 3 },
            { label: "5/semana", v: 5 },
            { label: "1/dia", v: 7 },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => save(true, opt.v)}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                perWeek === opt.v
                  ? "border-ddg-ink bg-ddg-lime text-ddg-ink"
                  : "border-ddg-stone bg-ddg-paper text-ddg-muted hover:border-ddg-ink/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
