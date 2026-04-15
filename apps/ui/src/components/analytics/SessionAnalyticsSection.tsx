import type { SessionAnalyticsBundle } from "@steno/api";
import { Badge } from "@/components/ui/badge";
import { CompositionPieChart } from "./CompositionPieChart";
import { pieDataFromSeries } from "./pieDataFromSeries";
import { SessionStatGrid } from "./SessionStatGrid";

export type SessionAnalyticsPayload = SessionAnalyticsBundle;

type SessionAnalyticsSectionProps = {
  data: SessionAnalyticsPayload | undefined;
  isLoading: boolean;
  errorMessage: string | null;
};

export function SessionAnalyticsSection({
  data,
  isLoading,
  errorMessage,
}: SessionAnalyticsSectionProps) {
  if (isLoading) {
    return (
      <section
        aria-label="Session analytics"
        className="rounded-lg border border-border bg-card p-4"
      >
        <h3 className="text-xs font-semibold text-foreground">Analytics</h3>
        <p className="mt-2 text-xs text-muted-foreground">Loading analytics…</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section
        aria-label="Session analytics"
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
      >
        <h3 className="text-xs font-semibold text-foreground">Analytics</h3>
        <p className="mt-2 text-xs text-destructive">{errorMessage}</p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const tokensPie = pieDataFromSeries(data.pies.tokensByModel);
  const kindsPie = pieDataFromSeries(data.pies.eventKinds);
  const durationPie = pieDataFromSeries(data.pies.toolDuration);

  return (
    <div className="space-y-4">
      <section aria-label="Session analytics" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold text-foreground">Analytics</h3>
          {data.summary.totalsIncludeEstimated ? (
            <Badge
              variant="outline"
              title="Some totals include model-reported estimates."
              className="h-5 text-[0.65rem] font-medium uppercase tracking-wide"
            >
              Includes estimates
            </Badge>
          ) : null}
        </div>
        <SessionStatGrid summary={data.summary} />
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3 [&>section]:min-w-0">
        <CompositionPieChart
          title="Tokens by model"
          description="Share of total tokens (in + out), attributed with forward-filled model."
          data={tokensPie.data}
          total={tokensPie.total}
          show={tokensPie.show}
        />
        <CompositionPieChart
          title="Events by kind"
          description="Each slice is one canonical event kind in this session."
          data={kindsPie.data}
          total={kindsPie.total}
          show={kindsPie.show}
        />
        <CompositionPieChart
          title="Tool time by channel"
          description="Sum of duration_ms from tool, shell, MCP, and subagent stop events."
          data={durationPie.data}
          total={durationPie.total}
          show={durationPie.show}
        />
      </div>
    </div>
  );
}
