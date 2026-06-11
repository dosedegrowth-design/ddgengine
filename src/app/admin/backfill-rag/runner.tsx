"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Play, CheckCircle2, XCircle } from "lucide-react";
import { runBackfillRag, type BackfillResult } from "./actions";

interface Props {
  targetCount: number;
}

export function BackfillRunner({ targetCount }: Props) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<BackfillResult | null>(null);

  function run() {
    setResult(null);
    start(async () => {
      const r = await runBackfillRag();
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      setResult(r);
      if (r.failed.length > 0) {
        toast.error(
          `Backfill: ${r.succeeded.length} OK · ${r.failed.length} falharam`
        );
      } else if (r.succeeded.length > 0) {
        toast.success(`Backfill OK em ${r.succeeded.length} briefings`);
      } else {
        toast.info("Nada pra fazer — todos já estavam processados");
      }
    });
  }

  return (
    <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 shadow-[5px_5px_0_var(--ddg-ink)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="ddg-bracket mb-1">RODAR BACKFILL</div>
          <h3 className="font-black text-lg text-ddg-ink">
            {targetCount} briefings esperando RAG
          </h3>
          <p className="text-sm text-ddg-muted mt-1">
            Processa sequencial (evita rate limit OpenAI embeddings). Cada
            briefing leva 5-15s. Total estimado:{" "}
            <strong className="text-ddg-ink">
              ~{Math.ceil(targetCount * 10)}s
            </strong>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={pending || targetCount === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-black text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[2px_2px_0_var(--ddg-stone)]"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Rodar backfill
            </>
          )}
        </button>
      </div>

      {/* Resultado da última run */}
      {result && (
        <div className="mt-5 pt-5 border-t-2 border-ddg-stone">
          <div className="ddg-bracket mb-3">RESULTADO</div>
          <div className="grid grid-cols-3 gap-3 text-sm mb-4">
            <div className="rounded-lg border-2 border-ddg-stone p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                Total
              </div>
              <div className="font-black text-xl">{result.total}</div>
            </div>
            <div className="rounded-lg border-2 border-ddg-lime bg-ddg-lime/15 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                Sucesso
              </div>
              <div className="font-black text-xl text-ddg-lime-deep">
                {result.succeeded.length}
              </div>
            </div>
            <div
              className={`rounded-lg border-2 p-3 ${
                result.failed.length > 0
                  ? "border-red-300 bg-red-50"
                  : "border-ddg-stone"
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                Falhas
              </div>
              <div
                className={`font-black text-xl ${
                  result.failed.length > 0 ? "text-red-700" : "text-ddg-ink"
                }`}
              >
                {result.failed.length}
              </div>
            </div>
          </div>

          {/* Lista falhas (se houver) */}
          {result.failed.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Falhas
              </div>
              <ul className="space-y-1.5 max-h-40 overflow-auto rounded-md border border-red-200 bg-red-50 p-2">
                {result.failed.map((f) => (
                  <li
                    key={f.briefing_id}
                    className="text-xs font-mono text-red-900"
                  >
                    <code className="text-[10px]">{f.briefing_id.slice(0, 8)}</code>{" "}
                    {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lista sucessos compacta */}
          {result.succeeded.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-bold text-ddg-lime-deep flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {result.succeeded.length} processados com sucesso
              </summary>
              <ul className="mt-2 space-y-0.5 max-h-40 overflow-auto pl-5">
                {result.succeeded.map((s) => (
                  <li key={s.briefing_id} className="text-ddg-muted">
                    {s.org_name ?? "—"}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-3 text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
            duração: {(result.duration_ms / 1000).toFixed(1)}s
          </div>
        </div>
      )}
    </section>
  );
}
