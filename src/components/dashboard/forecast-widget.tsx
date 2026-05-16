import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { forecastTraffic } from "@/lib/forecast/regression";

interface ForecastWidgetProps {
  history: Array<{ date: string; value: number }>;
}

export function ForecastWidget({ history }: ForecastWidgetProps) {
  const forecast = forecastTraffic({ history });

  // Combinar history + previsões pra chart
  const chartData = [
    ...history.map((h) => ({ date: h.date, value: h.value, forecast: undefined as number | undefined })),
    ...forecast.daily_predictions.slice(0, 30).map((p) => ({
      date: p.date,
      value: undefined as number | undefined as any,
      forecast: p.value,
    })),
  ];

  const TrendIcon =
    forecast.trend_direction === "up"
      ? TrendingUp
      : forecast.trend_direction === "down"
      ? TrendingDown
      : Minus;
  const trendColor =
    forecast.trend_direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : forecast.trend_direction === "down"
      ? "text-red-600 dark:text-red-400"
      : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Forecast 30 dias</CardTitle>
          <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="capitalize">{forecast.trend_direction === "up" ? "Crescimento" : forecast.trend_direction === "down" ? "Queda" : "Estável"}</span>
          </div>
        </div>
        <CardDescription>
          Previsão de tráfego com {forecast.confidence_pct}% de confiança
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">30 dias</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">
              {forecast.next30d.toLocaleString("pt-BR")}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">60 dias</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">
              {forecast.next60d.toLocaleString("pt-BR")}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">90 dias</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">
              {forecast.next90d.toLocaleString("pt-BR")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              banda: {forecast.band_low_90d.toLocaleString("pt-BR")} - {forecast.band_high_90d.toLocaleString("pt-BR")}
            </div>
          </div>
        </div>

        {chartData.length > 5 && (
          <div className="text-foreground">
            <LineChart data={chartData} height={180} showForecast label="Visitas" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
