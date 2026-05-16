import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, LineChart, TrendingUp } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function MetricsPage() {
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  // Últimos 30 dias de métricas
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: metrics } = await supabase
    .from("metrics_daily")
    .select("*")
    .eq("site_id", site.id)
    .gte("date", thirtyDaysAgo.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  const totals = (metrics ?? []).reduce(
    (acc: any, m: any) => ({
      pageviews: acc.pageviews + (m.pageviews ?? 0),
      sessions: acc.sessions + (m.sessions ?? 0),
      impressions: acc.impressions + (m.gsc_impressions ?? 0),
      clicks: acc.clicks + (m.gsc_clicks ?? 0),
    }),
    { pageviews: 0, sessions: 0, impressions: 0, clicks: 0 }
  );

  const noData = (metrics ?? []).length === 0;

  return (
    <div className="container mx-auto max-w-6xl px-6 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Métricas</h1>
        <p className="text-muted-foreground mt-1">Tráfego, posições e performance do {site.domain}</p>
      </header>

      {noData && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-3">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground" />
            <div>
              <div className="font-medium">Sem dados ainda</div>
              <p className="text-sm text-muted-foreground mt-1">
                Conecte Google Search Console e GA4 nas integrações pra ver métricas reais.
              </p>
            </div>
            <Button asChild>
              <Link href="/settings/integrations">Conectar integrações</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!noData && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Kpi label="Visitas (30d)" value={totals.pageviews.toLocaleString("pt-BR")} icon={LineChart} />
            <Kpi label="Sessões (30d)" value={totals.sessions.toLocaleString("pt-BR")} icon={TrendingUp} />
            <Kpi label="Impressões GSC" value={totals.impressions.toLocaleString("pt-BR")} icon={BarChart3} />
            <Kpi label="Cliques GSC" value={totals.clicks.toLocaleString("pt-BR")} icon={LineChart} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tráfego diário</CardTitle>
              <CardDescription>Últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <MiniChart data={(metrics ?? []).map((m: any) => ({ date: m.date, value: m.pageviews ?? 0 }))} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
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
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function MiniChart({ data }: { data: { date: string; value: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => {
        const h = (d.value / max) * 100;
        return (
          <div
            key={d.date}
            className="flex-1 bg-foreground/80 hover:bg-foreground transition-colors rounded-sm"
            style={{ height: `${Math.max(h, 2)}%` }}
            title={`${d.date}: ${d.value}`}
          />
        );
      })}
    </div>
  );
}
