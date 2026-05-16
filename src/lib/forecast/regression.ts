/**
 * Forecast simples de tráfego via regressão linear + ajuste sazonal.
 *
 * Pra MVP usa regressão linear simples nos últimos 30 dias.
 * Próximas versões: ARIMA, Prophet, ou regressão multi-fator
 * (domain age + DA + posts published + visibility lift).
 */

export interface ForecastInput {
  history: Array<{ date: string; value: number }>;
}

export interface ForecastResult {
  next30d: number;
  next60d: number;
  next90d: number;
  band_low_90d: number;
  band_high_90d: number;
  confidence_pct: number;
  trend_direction: "up" | "stable" | "down";
  daily_predictions: Array<{ date: string; value: number; lower: number; upper: number }>;
}

export function forecastTraffic(input: ForecastInput): ForecastResult {
  const history = input.history.filter((h) => h.value >= 0);

  if (history.length < 7) {
    return {
      next30d: 0,
      next60d: 0,
      next90d: 0,
      band_low_90d: 0,
      band_high_90d: 0,
      confidence_pct: 0,
      trend_direction: "stable",
      daily_predictions: [],
    };
  }

  // Regressão linear simples y = a*x + b
  const n = history.length;
  const xs = history.map((_, i) => i);
  const ys = history.map((h) => h.value);

  const sumX = xs.reduce((s, x) => s + x, 0);
  const sumY = ys.reduce((s, y) => s + y, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);

  const a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - a * sumX) / n;

  // Erro residual pra banda de confiança
  const residuals = ys.map((y, i) => y - (a * i + b));
  const meanRes = residuals.reduce((s, r) => s + r, 0) / n;
  const stdRes = Math.sqrt(
    residuals.reduce((s, r) => s + (r - meanRes) ** 2, 0) / Math.max(1, n - 2)
  );

  const dayMs = 24 * 60 * 60 * 1000;
  const lastDate = new Date(history[history.length - 1].date);

  const dailyPredictions: ForecastResult["daily_predictions"] = [];
  for (let i = 1; i <= 90; i++) {
    const x = n - 1 + i;
    const predicted = Math.max(0, a * x + b);
    const date = new Date(lastDate.getTime() + i * dayMs);
    dailyPredictions.push({
      date: date.toISOString().slice(0, 10),
      value: Math.round(predicted),
      lower: Math.max(0, Math.round(predicted - 1.96 * stdRes)),
      upper: Math.round(predicted + 1.96 * stdRes),
    });
  }

  const next30 = dailyPredictions.slice(0, 30).reduce((s, p) => s + p.value, 0);
  const next60 = dailyPredictions.slice(0, 60).reduce((s, p) => s + p.value, 0);
  const next90 = dailyPredictions.reduce((s, p) => s + p.value, 0);

  const bandLow90 = dailyPredictions.reduce((s, p) => s + p.lower, 0);
  const bandHigh90 = dailyPredictions.reduce((s, p) => s + p.upper, 0);

  // Confiança: 100 - (variação relativa em %)
  const meanY = sumY / n;
  const relativeStd = meanY > 0 ? stdRes / meanY : 1;
  const confidence = Math.max(0, Math.min(95, 100 - relativeStd * 100));

  const trend: ForecastResult["trend_direction"] = a > 0.5 ? "up" : a < -0.5 ? "down" : "stable";

  return {
    next30d: next30,
    next60d: next60,
    next90d: next90,
    band_low_90d: bandLow90,
    band_high_90d: bandHigh90,
    confidence_pct: Math.round(confidence),
    trend_direction: trend,
    daily_predictions: dailyPredictions,
  };
}
