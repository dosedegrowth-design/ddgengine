import Link from "next/link";
import { ArrowRight, BarChart3, FileText, Sparkles, Zap } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ForecastWidget } from "@/components/dashboard/forecast-widget";
import { formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const { site, supabase, org } = await getCurrentSite();

  if (!site) {
    return (
      <div className="container mx-auto max-w-4xl px-6 py-10">
        <Card className="border-dashed">
          <CardHeader>
            <Badge variant="secondary" className="w-fit mb-2">
              Setup pendente
            </Badge>
            <CardTitle>Bem-vindo ao DDG Engine</CardTitle>
            <CardDescription>
              Você ainda não conectou seu site. Vamos começar?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/onboarding">
                Começar setup <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Contadores
  const { count: totalPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("site_id", site.id);

  const { count: publishedPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("site_id", site.id)
    .eq("status", "published");

  const { count: draftPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("site_id", site.id)
    .in("status", ["draft", "generating", "in_review"]);

  const { count: pendingReview } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("site_id", site.id)
    .eq("status", "in_review");

  // Posts recentes
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, title, type, status, created_at, published_at")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Último visibility run
  const { data: latestVisibility } = await supabase
    .from("ai_visibility_runs")
    .select("total_citations, citations_by_llm, share_of_voice, completed_at")
    .eq("site_id", site.id)
    .eq("status", "completed")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Histórico de tráfego pra forecast
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: metrics } = await supabase
    .from("metrics_daily")
    .select("date, pageviews")
    .eq("site_id", site.id)
    .gte("date", thirtyDaysAgo.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  const trafficHistory = (metrics ?? []).map((m: any) => ({
    date: m.date,
    value: m.pageviews ?? 0,
  }));

  const brandSov = ((latestVisibility?.share_of_voice as any) ?? {}).brand ?? 0;

  return (
    <div className="container mx-auto max-w-6xl px-6 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Visão geral</h1>
          <p className="text-muted-foreground mt-1">
            {site.domain} · Status: <span className="capitalize">{site.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {(pendingReview ?? 0) > 0 && (
            <Button asChild>
              <Link href="/inbox">
                Aprovar {pendingReview} <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/posts">
              Ver conteúdo <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid md:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          label="Publicados"
          value={publishedPosts ?? 0}
          hint="todos os tempos"
        />
        <KpiCard
          icon={Zap}
          label="Em produção"
          value={draftPosts ?? 0}
          hint="gerando + aguardando"
        />
        <KpiCard
          icon={BarChart3}
          label="Total"
          value={totalPosts ?? 0}
          hint="incluindo arquivados"
        />
        <KpiCard
          icon={Sparkles}
          label="Share of Voice IA"
          value={`${(brandSov * 100).toFixed(0)}%`}
          hint={latestVisibility ? `${latestVisibility.total_citations} citações` : "Ative tracking"}
        />
      </div>

      {/* Forecast — só se tiver dados */}
      {trafficHistory.length >= 7 && <ForecastWidget history={trafficHistory} />}

      {/* Grid: Posts recentes + Visibility */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Posts recentes</CardTitle>
              <Link href="/posts" className="text-xs text-muted-foreground hover:text-foreground">
                Ver todos →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!recentPosts || recentPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum post ainda.</p>
            ) : (
              recentPosts.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/posts/${p.id}`}
                  className="block p-3 rounded-md hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {p.type === "long_form" ? "Artigo" : "FAQ"}
                    </Badge>
                    <Badge
                      variant={
                        p.status === "published"
                          ? "success"
                          : p.status === "in_review"
                          ? "warning"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium truncate">{p.title ?? "Sem título"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(p.created_at)}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">AI Visibility</CardTitle>
              <Link href="/visibility" className="text-xs text-muted-foreground hover:text-foreground">
                Ver detalhes →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!latestVisibility ? (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Nenhum tracking rodado ainda.</p>
                <Button asChild size="sm">
                  <Link href="/visibility">Rodar primeiro tracking</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="text-3xl font-semibold tabular-nums">
                  {latestVisibility.total_citations}
                </div>
                <div className="text-xs text-muted-foreground">
                  citações na última semana ·{" "}
                  {latestVisibility.completed_at &&
                    formatRelativeTime(latestVisibility.completed_at)}
                </div>
                <div className="space-y-1 pt-2">
                  {Object.entries((latestVisibility.citations_by_llm as any) ?? {})
                    .slice(0, 4)
                    .map(([llm, count]) => (
                      <div key={llm} className="flex items-center justify-between text-xs">
                        <span className="capitalize">{llm}</span>
                        <span className="font-medium tabular-nums">{Number(count)}</span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trial banner */}
      {org.plan === "trial" && (
        <Card className="border-foreground/30 bg-muted/30">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">Você está no período de teste</div>
              <div className="text-sm text-muted-foreground">
                {org.trial_ends_at && (
                  <>Trial expira em {new Date(org.trial_ends_at).toLocaleDateString("pt-BR")}</>
                )}
              </div>
            </div>
            <Button asChild>
              <Link href="/settings/billing">Escolher plano</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
