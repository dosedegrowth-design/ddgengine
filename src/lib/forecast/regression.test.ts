import { describe, it, expect } from "vitest";
import { forecastTraffic } from "./regression";

describe("forecastTraffic", () => {
  it("retorna zero pra histórico curto", () => {
    const result = forecastTraffic({
      history: [
        { date: "2025-01-01", value: 100 },
        { date: "2025-01-02", value: 110 },
      ],
    });
    expect(result.next30d).toBe(0);
    expect(result.trend_direction).toBe("stable");
  });

  it("detecta tendência crescente", () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      value: 100 + i * 10, // crescimento linear
    }));
    const result = forecastTraffic({ history });
    expect(result.trend_direction).toBe("up");
    expect(result.next30d).toBeGreaterThan(0);
    expect(result.confidence_pct).toBeGreaterThan(50);
  });

  it("detecta tendência estável", () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      value: 100, // valor constante
    }));
    const result = forecastTraffic({ history });
    expect(result.trend_direction).toBe("stable");
  });

  it("gera 90 previsões diárias", () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      value: 50 + i,
    }));
    const result = forecastTraffic({ history });
    expect(result.daily_predictions).toHaveLength(90);
  });

  it("banda de confiança contém previsão", () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      value: 100 + i * 5,
    }));
    const result = forecastTraffic({ history });
    expect(result.band_low_90d).toBeLessThanOrEqual(result.next90d);
    expect(result.band_high_90d).toBeGreaterThanOrEqual(result.next90d);
  });
});
