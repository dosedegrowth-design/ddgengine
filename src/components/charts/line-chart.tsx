"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  value: number;
  forecast?: number;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  showForecast?: boolean;
  label?: string;
}

export function LineChart({ data, height = 240, color = "currentColor", showForecast, label }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(d) => {
            const date = new Date(d);
            return `${date.getDate()}/${date.getMonth() + 1}`;
          }}
        />
        <YAxis tick={{ fontSize: 11 }} width={32} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelFormatter={(d) => new Date(d).toLocaleDateString("pt-BR")}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          name={label ?? "Valor"}
        />
        {showForecast && (
          <Line
            type="monotone"
            dataKey="forecast"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Previsão"
          />
        )}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
