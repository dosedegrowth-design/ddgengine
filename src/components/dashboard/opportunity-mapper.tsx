"use client";

/**
 * OpportunityMapper — "mapa de oportunidades" do nicho do cliente.
 *
 * Mostra o resumo do universo de palavra-chave (total / cobertura / em aberto)
 * e um botão pra (re)pesquisar os temas do briefing no Keyword Planner. As
 * oportunidades alimentam as Sugestões em /posts (e, no futuro, o auto-pilot).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Target, CheckCircle2, Gem } from "lucide-react";
import { refreshOpportunitiesAction } from "@/app/(app)/palavras-chave/actions";

interface Summary {
  total: number;
  covered: number;
  opportunities: number;
  coveragePct: number;
}

export function OpportunityMapper({ initial }: { initial: Summary }) {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary>(initial);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      toast.info("Pesquisando o seu nicho no Google… pode levar uns segundos");
      const res = await refreshOpportunitiesAction();
      if (!res.ok) {
        toast.error(res.error ?? "Falha ao mapear oportunidades");
        return;
      }
      toast.success(
        `${res.discovered} palavras mapeadas · ${res.opportunities} oportunidades novas`
      );
      router.refresh();
    });
  }

  const empty = summary.total === 0;

  return (
    <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-cream/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-ddg-ink bg-ddg-lime/20">
            <Target className="w-4 h-4 text-ddg-ink" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-ddg-ink">
              Mapa de oportunidades do seu nicho
            </div>
            <p className="text-xs text-ddg-muted mt-0.5 max-w-md">
              {empty
                ? "Pesquise os temas do seu briefing no Google pra descobrir as palavras com mais busca — elas viram sugestão de post automaticamente."
                : "Palavras do seu nicho com busca real. As melhores aparecem como sugestão em Posts."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isPending}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
          {empty ? "Mapear oportunidades" : "Atualizar"}
        </button>
      </div>

      {!empty && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat icon={Target} label="Palavras mapeadas" value={summary.total} tone="ink" />
          <Stat icon={Gem} label="Oportunidades" value={summary.opportunities} tone="lime" />
          <Stat
            icon={CheckCircle2}
            label="Cobertura"
            value={`${summary.coveragePct}%`}
            tone="emerald"
          />
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: "ink" | "lime" | "emerald";
}) {
  const color =
    tone === "lime" ? "text-ddg-lime-deep" : tone === "emerald" ? "text-emerald-700" : "text-ddg-ink";
  return (
    <div className="rounded-xl border-2 border-ddg-stone bg-ddg-paper p-3 text-center">
      <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${color}`} />
      <div className={`font-black text-lg leading-none ${color}`}>{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-ddg-muted mt-1">
        {label}
      </div>
    </div>
  );
}
