import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { GlobalDailyBucket } from "@steno/api";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  formatCompactNumber,
  formatFullNumber,
} from "@/lib/formatCompactNumber";
function formatShortDay(isoDay: string): string {
  const parts = isoDay.split("-");
  if (parts.length !== 3) return isoDay;
  const y = Number(parts[0]);
  const mo = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return isoDay;
  }
  return new Date(y, mo, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function rowsFromBuckets(buckets: GlobalDailyBucket[]) {
  return buckets.map((b) => ({
    day: b.day,
    dayLabel: formatShortDay(b.day),
    events: b.eventCount,
    tokens: b.tokenTotal,
    sessions: b.sessionDistinctCount,
    prompts: b.promptSubmitCount,
    replies: b.agentResponseCount,
  }));
}

type SingleMetric = "events" | "tokens" | "sessions";

const SINGLE_CONFIG: Record<
  SingleMetric,
  { title: string; description: string; dataKey: keyof ReturnType<typeof rowsFromBuckets>[number]; chartKey: string; label: string }
> = {
  events: {
    title: "Events per day",
    description:
      "Count of stored events per local calendar day (all sessions).",
    dataKey: "events",
    chartKey: "events",
    label: "Events",
  },
  tokens: {
    title: "Tokens per day",
    description:
      "Sum of input + output tokens attributed that day (same rules as global totals).",
    dataKey: "tokens",
    chartKey: "tokens",
    label: "Tokens",
  },
  sessions: {
    title: "Sessions per day",
    description:
      "Distinct conversations with at least one event that day (local calendar).",
    dataKey: "sessions",
    chartKey: "sessions",
    label: "Sessions",
  },
};

export function GlobalDailySingleBarChart({
  buckets,
  metric,
}: {
  buckets: GlobalDailyBucket[];
  metric: SingleMetric;
}) {
  const spec = SINGLE_CONFIG[metric];
  const data = useMemo(() => rowsFromBuckets(buckets), [buckets]);

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      [spec.chartKey]: {
        label: spec.label,
        color:
          metric === "tokens"
            ? "var(--chart-2)"
            : metric === "sessions"
              ? "var(--chart-3)"
              : "var(--chart-1)",
      },
    }),
    [metric, spec.chartKey, spec.label],
  );

  const maxVal = useMemo(() => {
    const key = spec.dataKey as "events" | "tokens" | "sessions";
    return data.reduce((m, r) => Math.max(m, r[key]), 0);
  }, [data, spec.dataKey]);

  const minWidthPx = Math.max(360, data.length * 14);

  if (data.length === 0 || maxVal <= 0) {
    return (
      <section
        aria-label={spec.title}
        className="min-w-0 overflow-x-hidden rounded-lg border border-border bg-card p-4 shadow-sm"
      >
        <h3 className="text-xs font-semibold text-foreground">{spec.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{spec.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Not enough spread over multiple days yet.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={spec.title}
      className="min-w-0 overflow-x-hidden rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <h3 className="text-xs font-semibold text-foreground">{spec.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{spec.description}</p>
      <div className="mt-2 min-w-0 overflow-x-auto pb-1">
        <div style={{ minWidth: minWidthPx }} className="mx-auto max-w-full">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[260px] w-full min-h-[220px]"
          >
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ left: 4, right: 8, top: 8, bottom: 28 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="dayLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={10}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={48}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) =>
                  typeof v === "number" ? formatCompactNumber(v) : String(v)
                }
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const raw = payload[0]?.value;
                  const n = typeof raw === "number" ? raw : Number(raw);
                  if (!Number.isFinite(n)) return null;
                  return (
                    <div className="grid min-w-[10rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                      <div className="font-medium text-foreground">{label}</div>
                      <div className="flex items-center justify-between gap-6 tabular-nums">
                        <span className="text-muted-foreground">
                          {spec.label}
                        </span>
                        <span
                          className="font-medium text-foreground"
                          title={formatFullNumber(n)}
                        >
                          {formatCompactNumber(n)}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey={spec.dataKey}
                name={spec.chartKey}
                fill={`var(--color-${spec.chartKey})`}
                radius={[3, 3, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </section>
  );
}

export function GlobalDailyStackedPromptsRepliesChart({
  buckets,
}: {
  buckets: GlobalDailyBucket[];
}) {
  const data = useMemo(() => rowsFromBuckets(buckets), [buckets]);

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      prompts: { label: "User prompts", color: "var(--chart-1)" },
      replies: { label: "Agent replies", color: "var(--chart-4)" },
    }),
    [],
  );

  const maxVal = useMemo(
    () => data.reduce((m, r) => Math.max(m, r.prompts + r.replies), 0),
    [data],
  );

  const minWidthPx = Math.max(360, data.length * 14);

  if (data.length === 0 || maxVal <= 0) {
    return (
      <section
        aria-label="Prompts and replies per day"
        className="min-w-0 overflow-x-hidden rounded-lg border border-border bg-card p-4 shadow-sm"
      >
        <h3 className="text-xs font-semibold text-foreground">
          Prompts &amp; replies per day
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Stacked prompt_submit vs agent_response counts by local day.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Not enough spread over multiple days yet.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Prompts and replies per day"
      className="min-w-0 overflow-x-hidden rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <h3 className="text-xs font-semibold text-foreground">
        Prompts &amp; replies per day
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Stacked prompt_submit vs agent_response counts by local day.
      </p>
      <div className="mt-2 min-w-0 overflow-x-auto pb-1">
        <div style={{ minWidth: minWidthPx }} className="mx-auto max-w-full">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[260px] w-full min-h-[220px]"
          >
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ left: 4, right: 8, top: 8, bottom: 28 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="dayLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={10}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={44}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) =>
                  typeof v === "number" ? formatCompactNumber(v) : String(v)
                }
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="grid min-w-[10rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                      <div className="font-medium text-foreground">{label}</div>
                      {payload.map((p) => {
                        const raw = p.value;
                        const n =
                          typeof raw === "number" ? raw : Number(raw ?? 0);
                        const name =
                          p.dataKey === "prompts"
                            ? "User prompts"
                            : p.dataKey === "replies"
                              ? "Agent replies"
                              : String(p.name ?? p.dataKey);
                        return (
                          <div
                            key={String(p.dataKey)}
                            className="flex items-center justify-between gap-6 tabular-nums"
                          >
                            <span className="text-muted-foreground">
                              {name}
                            </span>
                            <span
                              className="font-medium text-foreground"
                              title={formatFullNumber(n)}
                            >
                              {formatCompactNumber(n)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="prompts"
                stackId="activity"
                fill="var(--color-prompts)"
                radius={[0, 0, 0, 0]}
                maxBarSize={48}
              />
              <Bar
                dataKey="replies"
                stackId="activity"
                fill="var(--color-replies)"
                radius={[3, 3, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </section>
  );
}
