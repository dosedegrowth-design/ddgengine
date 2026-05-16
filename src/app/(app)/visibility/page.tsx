import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { RunVisibilityButton } from "@/components/dashboard/run-visibility-button";

const LLM_LABELS: Record<string, { label: string; color: string }> = {
  chatgpt: { label: "ChatGPT", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  perplexity: { label: "Perplexity", color: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  claude: { label: "Claude", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  gemini: { label: "Gemini", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400" },
};

export default async function VisibilityPage() {
  const { site, supabase, org } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  // Pega últimos 12 runs
  const { data: runs } = await supabase
    .from("ai_visibility_runs")
    .select("*")
    .eq("site_id", site.id)
    .order("week_start", { ascending: false })
    .limit(12);

  const latest = runs?.[0];

  return (
    <div className="container mx-auto max-w-6xl px-6 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Visibility</h1>
          <p className="text-muted-foreground mt-1">
            Quantas vezes você apareceu em ChatGPT, Perplexity, Claude e Gemini.
          </p>
        </div>
        <RunVisibilityButton siteId={site.id} />
      </header>

      {!latest && (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <Sparkles className="w-6 h-6 mx-auto text-muted-foreground mb-3" />
            <CardTitle>Nenhum tracking rodado ainda</CardTitle>
            <CardDescription>
              Clique em &quot;Rodar tracking&quot; pra fazer o primeiro snapshot.
              <br />
              Toda semana o sistema vai rodar automaticamente.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {latest && (
        <>
          {/* KPIs do último run */}
          <div className="grid md:grid-cols-4 gap-4">
            <KpiCard
              label="Citações esta semana"
              value={latest.total_citations}
              hint={`em ${latest.total_prompts} perguntas`}
            />
            <KpiCard
              label="Share of voice"
              value={`${(((latest.share_of_voice as any)?.brand ?? 0) * 100).toFixed(1)}%`}
              hint="vs concorrentes"
            />
            <KpiCard
              label="LLMs monitoradas"
              value={Object.keys(latest.citations_by_llm as any ?? {}).length || "—"}
              hint="ChatGPT, Perplexity..."
            />
            <KpiCard
              label="Custo do run"
              value={`US$ ${Number(latest.cost_usd ?? 0).toFixed(2)}`}
              hint={`Rodado ${formatRelativeTime(latest.completed_at ?? latest.started_at)}`}
            />
          </div>

          {/* Citações por LLM */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Citações por LLM</CardTitle>
              <CardDescription>Distribuição de menções da sua marca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries((latest.citations_by_llm as any) ?? {}).map(([llm, count]) => {
                const max = Math.max(...Object.values((latest.citations_by_llm as any) ?? {}).map(Number));
                const pct = max > 0 ? (Number(count) / max) * 100 : 0;
                const conf = LLM_LABELS[llm] ?? { label: llm, color: "bg-gray-500/15" };
                return (
                  <div key={llm} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded ${conf.color}`}>{conf.label}</span>
                      <span className="font-medium tabular-nums">{Number(count)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys((latest.citations_by_llm as any) ?? {}).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma citação detectada nesta semana.</p>
              )}
            </CardContent>
          </Card>

          {/* Share of voice */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Share of voice</CardTitle>
              <CardDescription>Você vs concorrentes mencionados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries((latest.share_of_voice as any) ?? {})
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .map(([key, val]) => {
                  const pct = Number(val) * 100;
                  const isBrand = key === "brand";
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={isBrand ? "font-semibold" : ""}>
                          {isBrand ? `${org.name} (você)` : key}
                        </span>
                        <span className="font-medium tabular-nums">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={isBrand ? "h-full bg-foreground" : "h-full bg-muted-foreground/40"}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico semanal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {runs?.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <div className="font-medium text-sm">Semana de {new Date(r.week_start).toLocaleDateString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.total_prompts} prompts · {r.total_citations} citações
                    </div>
                  </div>
                  <Badge variant={r.status === "completed" ? "success" : r.status === "failed" ? "destructive" : "warning"}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
