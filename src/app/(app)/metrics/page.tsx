/**
 * Metrics — GSC + GA4 metrics com identidade DDG
 */
import { redirect } from "next/navigation";
import { BarChart3, LineChart as LineIcon, TrendingUp, MousePointerClick } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { LineChart } from "@/components/charts/line-chart";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";

export default async function MetricsPage() {
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: metrics } = await supabase
    .from("metrics_daily")
    .select("*")
    .eq("site_id", site.id)
    .gte("date", thirtyDaysAgo.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  const list = (metrics ?? []) as Array<{
    date: string;
    pageviews?: number;
    sessions?: number;
    gsc_impressions?: number;
    gsc_clicks?: number;
  }>;

  const totals = list.reduce(
    (acc, m) => ({
      pageviews: acc.pageviews + (m.pageviews ?? 0),
      sessions: acc.sessions + (m.sessions ?? 0),
      impressions: acc.impressions + (m.gsc_impressions ?? 0),
      clicks: acc.clicks + (m.gsc_clicks ?? 0),
    }),
    { pageviews: 0, sessions: 0, impressions: 0, clicks: 0 }
  );

  const noData = list.length === 0;
  const trafficSeries = list.map((m) => ({ date: m.date, value: m.pageviews ?? 0 }));
  const impressionsSeries = list.map((m) => ({ date: m.date, value: m.gsc_impressions ?? 0 }));

  return (
    <div>
      <PageHeader
        bracket="MÉTRICAS"
        title="Performance"
        subtitle={`Tráfego, impressões e cliques de ${site.domain ?? "seu site"} nos últimos 30 dias.`}
      />

      <div className="container mx-auto max-w-7xl px-6 py-8 space-y-6">
        {noData ? (
          <EmptyState
            icon={BarChart3}
            title="Sem dados ainda"
            description="Conecta Google Search Console e GA4 nas integrações pra ver métricas reais. Os dados aparecem aqui a cada 24h."
            cta={{ label: "Conectar integrações", href: "/settings/integrations" }}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Kpi
                label="Visitas (30d)"
                value={totals.pageviews.toLocaleString("pt-BR")}
                icon={LineIcon}
              />
              <Kpi
                label="Sessões (30d)"
                value={totals.sessions.toLocaleString("pt-BR")}
                icon={TrendingUp}
              />
              <Kpi
                label="Impressões GSC"
                value={totals.impressions.toLocaleString("pt-BR")}
                icon={BarChart3}
                accent
              />
              <Kpi
                label="Cliques GSC"
                value={totals.clicks.toLocaleString("pt-BR")}
                icon={MousePointerClick}
              />
            </div>

            <ChartCard title="Tráfego diário" subtitle="Últimos 30 dias">
              <LineChart data={trafficSeries} height={240} label="Visitas" />
            </ChartCard>

            <ChartCard title="Impressões no Google" subtitle="Search Console">
              <LineChart data={impressionsSeries} height={200} label="Impressões" />
            </ChartCard>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
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
      <div className="flex items-start justify-between mb-3">
        <div className={`ddg-bracket ${accent ? "text-ddg-lime" : ""}`}>
          {label}
        </div>
        <Icon
          className={`w-4 h-4 ${accent ? "text-ddg-lime" : "text-ddg-muted"}`}
        />
      </div>
      <div
        className={`text-3xl md:text-4xl font-black tabular-nums leading-none ${
          accent ? "text-ddg-paper" : "text-ddg-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 md:p-6">
      <div className="mb-4">
        <div className="ddg-bracket mb-1">{subtitle.toUpperCase()}</div>
        <h2 className="text-lg font-black text-ddg-ink">{title}</h2>
      </div>
      <div className="text-ddg-ink">{children}</div>
    </div>
  );
}
