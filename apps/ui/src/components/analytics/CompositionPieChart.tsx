import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export type PieDatum = {
  name: string;
  value: number;
  label: string;
  fill: string;
};

type CompositionPieChartProps = {
  title: string;
  description?: string;
  data: PieDatum[];
  total: number;
  /** When false, chart is hidden (empty data). */
  show: boolean;
};

export function CompositionPieChart({
  title,
  description,
  data,
  total,
  show,
}: CompositionPieChartProps) {
  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    data.forEach((d, i) => {
      cfg[d.name] = {
        label: d.label,
        color: CHART_COLORS[i % CHART_COLORS.length]!,
      };
    });
    return cfg;
  }, [data]);

  const pctFmt = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      }),
    [],
  );
  const numFmt = useMemo(() => new Intl.NumberFormat(), []);

  if (!show || data.length === 0 || total <= 0) {
    return (
      <section
        aria-label={title}
        className="min-w-0 overflow-x-hidden rounded-lg border border-border bg-card p-4 shadow-sm"
      >
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Not enough data for this chart yet.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={title}
      className="min-w-0 overflow-x-hidden rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <ChartContainer
        config={chartConfig}
        className="mx-auto mt-2 aspect-square w-full min-h-[260px] max-h-[280px]"
      >
        <PieChart accessibilityLayer>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="name"
                formatter={(value, _name, item) => {
                  const n = typeof value === "number" ? value : Number(value);
                  const safe = Number.isFinite(n) ? n : 0;
                  const pct = total > 0 ? (safe / total) * 100 : 0;
                  const payload = item?.payload as PieDatum | undefined;
                  const label = payload?.label ?? String(_name);
                  return (
                    <span className="font-mono tabular-nums text-foreground">
                      {label}: {numFmt.format(safe)} ({pctFmt.format(pct)}%)
                    </span>
                  );
                }}
              />
            }
          />
          <ChartLegend
            content={<ChartLegendContent nameKey="name" />}
            verticalAlign="bottom"
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={52}
            outerRadius={88}
            paddingAngle={1}
            strokeWidth={1}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} stroke="var(--border)" />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    </section>
  );
}
