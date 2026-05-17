/**
 * Visibility — tracking de citações em LLMs com identidade DDG
 */
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/utils";
import { RunVisibilityButton } from "@/components/dashboard/run-visibility-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";

const LLM_DOT: Record<string, string> = {
  chatgpt: "bg-emerald-400",
  perplexity: "bg-sky-400",
  claude: "bg-amber-400",
  gemini: "bg-indigo-400",
};

const LLM_LABEL: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
};

export default async function VisibilityPage() {
  const { site, supabase, org } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const { data: runs } = await supabase
    .from("ai_visibility_runs")
    .select("*")
    .eq("site_id", site.id)
    .order("week_start", { ascending: false })
    .limit(12);

  const latest = runs?.[0];
  const citationsByLlm = (latest?.citations_by_llm ?? {}) as Record<string, number>;
  const shareOfVoice = (latest?.share_of_voice ?? {}) as Record<string, number>;
  const maxCitations = Math.max(...Object.values(citationsByLlm).map(Number), 1);

  return (
    <div>
      <PageHeader
        bracket="APARIÇÕES EM IA"
        title="Sua marca nas IAs"
        subtitle="Quantas vezes você apareceu em ChatGPT, Perplexity, Claude e Gemini esta semana."
        actions={<RunVisibilityButton siteId={site.id} />}
      />

      <div className="container mx-auto max-w-7xl px-6 py-8 space-y-6">
        {!latest ? (
          <EmptyState
            icon={Sparkles}
            title="Ainda não rodamos nenhuma análise"
            description='Clica em "Rodar análise" pra fazer o primeiro mapeamento. Depois, o sistema repete sozinho toda semana.'
          />
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <KpiCard
                label="Citações"
                value={latest.total_citations}
                hint={`em ${latest.total_prompts} perguntas`}
                accent
              />
              <KpiCard
                label="Sua participação"
                value={`${((shareOfVoice.brand ?? 0) * 100).toFixed(1)}%`}
                hint="vs concorrentes"
              />
              <KpiCard
                label="IAs monitoradas"
                value={Object.keys(citationsByLlm).length || "—"}
                hint="nesta análise"
              />
              <KpiCard
                label="Custo da análise"
                value={`US$ ${Number(latest.cost_usd ?? 0).toFixed(2)}`}
                hint={`${formatRelativeTime(latest.completed_at ?? latest.started_at)}`}
              />
            </div>

            {/* Grid: Citações por LLM + Share of voice */}
            <div className="grid lg:grid-cols-2 gap-4 md:gap-5">
              <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 md:p-6">
                <div className="mb-4">
                  <div className="ddg-bracket mb-1">CITAÇÕES POR IA</div>
                  <h2 className="text-lg font-black text-ddg-ink">
                    Distribuição esta semana
                  </h2>
                </div>

                {Object.keys(citationsByLlm).length === 0 ? (
                  <p className="text-sm text-ddg-muted py-4">
                    Nenhuma citação detectada nesta semana.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(citationsByLlm).map(([llm, count]) => {
                      const pct = (Number(count) / maxCitations) * 100;
                      return (
                        <div key={llm} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="inline-flex items-center gap-2 font-medium text-ddg-ink">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  LLM_DOT[llm] ?? "bg-ddg-muted"
                                }`}
                              />
                              {LLM_LABEL[llm] ?? llm}
                            </span>
                            <span className="font-bold tabular-nums text-ddg-ink">
                              {Number(count)}
                            </span>
                          </div>
                          <div className="h-2 bg-ddg-stone rounded-full overflow-hidden">
                            <div
                              className="h-full bg-ddg-lime"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-ink text-ddg-paper p-5 md:p-6 relative overflow-hidden shadow-[6px_6px_0_var(--ddg-lime)]">
                <div
                  className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none opacity-25"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(200,255,61,0.4) 0%, transparent 60%)",
                  }}
                  aria-hidden
                />
                <div className="relative mb-4">
                  <div className="ddg-bracket text-ddg-lime mb-1">PARTICIPAÇÃO</div>
                  <h2 className="text-lg font-black text-ddg-paper">
                    Você vs concorrentes
                  </h2>
                </div>

                <div className="relative space-y-3">
                  {Object.entries(shareOfVoice)
                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                    .map(([key, val]) => {
                      const pct = Number(val) * 100;
                      const isBrand = key === "brand";
                      return (
                        <div key={key} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span
                              className={
                                isBrand
                                  ? "font-bold text-ddg-lime"
                                  : "text-ddg-paper/70"
                              }
                            >
                              {isBrand ? `${org.name} (você)` : key}
                            </span>
                            <span className="font-bold tabular-nums">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-ddg-paper/10 rounded-full overflow-hidden">
                            <div
                              className={isBrand ? "h-full bg-ddg-lime" : "h-full bg-ddg-paper/40"}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Histórico */}
            <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 md:p-6">
              <div className="mb-4">
                <div className="ddg-bracket mb-1">HISTÓRICO</div>
                <h2 className="text-lg font-black text-ddg-ink">Análises anteriores</h2>
              </div>

              <ul className="space-y-2">
                {runs?.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg border-2 border-ddg-stone hover:border-ddg-ink/30 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-sm text-ddg-ink">
                        Semana de{" "}
                        {new Date(r.week_start).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="text-xs font-mono uppercase tracking-widest text-ddg-muted mt-0.5">
                        {r.total_prompts} prompts ● {r.total_citations} citações
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border-2 p-4 md:p-5 ${
        accent
          ? "border-ddg-ink bg-ddg-ink text-ddg-paper"
          : "border-ddg-ink bg-ddg-paper"
      }`}
    >
      <div className={`ddg-bracket mb-2 ${accent ? "text-ddg-lime" : ""}`}>
        {label}
      </div>
      <div
        className={`text-3xl md:text-4xl font-black tabular-nums leading-none ${
          accent ? "text-ddg-paper" : "text-ddg-ink"
        }`}
      >
        {value}
      </div>
      <div
        className={`text-[10px] font-mono uppercase tracking-widest mt-2 ${
          accent ? "text-ddg-paper/60" : "text-ddg-muted"
        }`}
      >
        {hint}
      </div>
    </div>
  );
}
