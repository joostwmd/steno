import type { PieDatum } from "./CompositionPieChart";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

type PieSegment = {
  id: string;
  label: string;
  value: number;
};

type PieSeriesLike = {
  segments: PieSegment[];
  total: number;
};

export function pieDataFromSeries(series: PieSeriesLike): {
  data: PieDatum[];
  total: number;
  show: boolean;
} {
  const data = series.segments.map((s, i) => ({
    name: s.id,
    value: s.value,
    label: s.label,
    fill: CHART_COLORS[i % CHART_COLORS.length]!,
  }));
  const total = series.total;
  return {
    data,
    total,
    show: total > 0 && data.length > 0,
  };
}
