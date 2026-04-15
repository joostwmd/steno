import type { ReactNode } from "react";
import type { GlobalAnalyticsBundle, GlobalSessionHighlight } from "@steno/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Stat,
  StatDescription,
  StatIndicator,
  StatLabel,
  StatValue,
} from "@/components/ui/stat";
import { Clock, Hash, Layers, MessageSquare, Sparkles } from "lucide-react";
import {
  GlobalDailySingleBarChart,
  GlobalDailyStackedPromptsRepliesChart,
} from "./GlobalDailyBarChart";
import { CompositionPieChart } from "./CompositionPieChart";
import {
  formatCompactNumber,
  formatFullNumber,
} from "@/lib/formatCompactNumber";
import { formatDurationMs } from "./formatDuration";
import { pieDataFromSeries } from "./pieDataFromSeries";

function sessionTitle(h: GlobalSessionHighlight | null): string {
  if (!h) return "—";
  return (h.label?.trim() || "Untitled").slice(0, 80);
}

function RecordStat({
  title,
  icon,
  highlight,
  valueLabel,
  valueTitle,
  onSelectSession,
}: {
  title: string;
  icon: ReactNode;
  highlight: GlobalSessionHighlight | null;
  valueLabel: string;
  /** Exact numeric value when `valueLabel` is abbreviated. */
  valueTitle?: string;
  onSelectSession: (id: string) => void;
}) {
  return (
    <Stat>
      <StatLabel>{title}</StatLabel>
      <StatIndicator variant="icon" color="default">
        {icon}
      </StatIndicator>
      <StatValue className="text-xl tabular-nums" title={valueTitle}>
        {valueLabel}
      </StatValue>
      <StatDescription>
        {highlight ? (
          <div className="flex flex-col gap-2">
            <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
              {sessionTitle(highlight)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-fit shrink-0 text-xs"
              onClick={() => onSelectSession(highlight.conversationId)}
            >
              Open session
            </Button>
          </div>
        ) : (
          "No sessions with this metric yet."
        )}
      </StatDescription>
    </Stat>
  );
}

type GlobalStatsSectionProps = {
  data: GlobalAnalyticsBundle | undefined;
  isLoading: boolean;
  errorMessage: string | null;
  onSelectSession: (conversationId: string) => void;
};

export function GlobalStatsSection({
  data,
  isLoading,
  errorMessage,
  onSelectSession,
}: GlobalStatsSectionProps) {
  if (isLoading) {
    return null;
  }

  if (errorMessage) {
    return (
      <section
        aria-label="Global stats"
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
      >
        <h2 className="text-lg font-medium tracking-tight">Global stats</h2>
        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const { overview, pies, records, topByTokens, topByEvents, dailySeries } =
    data;
  const tokensPie = pieDataFromSeries(pies.tokensByModel);
  const kindsPie = pieDataFromSeries(pies.eventKinds);
  const durationPie = pieDataFromSeries(pies.toolDuration);
  const tokenTotal = overview.totalInput + overview.totalOutput;

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-medium tracking-tight">Global stats</h2>
          {overview.totalsIncludeEstimated ? (
            <Badge
              variant="outline"
              title="Some totals include model-reported estimates."
              className="h-5 text-[0.65rem] font-medium uppercase tracking-wide"
            >
              Includes estimates
            </Badge>
          ) : null}
        </div>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Aggregates across every stored session and event on this machine.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat>
            <StatLabel>Sessions</StatLabel>
            <StatIndicator variant="icon" color="info">
              <Layers className="size-3.5" aria-hidden />
            </StatIndicator>
            <StatValue className="tabular-nums">
              {formatCompactNumber(overview.sessionCount)}
            </StatValue>
            <StatDescription>Distinct conversation IDs in the database.</StatDescription>
          </Stat>
          <Stat>
            <StatLabel>Events stored</StatLabel>
            <StatIndicator variant="icon" color="default">
              <Hash className="size-3.5" aria-hidden />
            </StatIndicator>
            <StatValue
              className="tabular-nums"
              title={formatFullNumber(overview.eventCount)}
            >
              {formatCompactNumber(overview.eventCount)}
            </StatValue>
            <StatDescription>
              {overview.orphanedEventCount > 0 ? (
                <span title={formatFullNumber(overview.orphanedEventCount)}>
                  {formatCompactNumber(overview.orphanedEventCount)} without a
                  conversation id.
                </span>
              ) : (
                "All events are tied to a session."
              )}
            </StatDescription>
          </Stat>
          <Stat>
            <StatLabel>Tokens (in + out)</StatLabel>
            <StatIndicator variant="icon" color="info">
              <Sparkles className="size-3.5" aria-hidden />
            </StatIndicator>
            <StatValue
              className="tabular-nums"
              title={formatFullNumber(tokenTotal)}
            >
              {formatCompactNumber(tokenTotal)}
            </StatValue>
            <StatDescription>
              <span title={formatFullNumber(overview.totalInput)}>
                In {formatCompactNumber(overview.totalInput)}
              </span>
              {" · "}
              <span title={formatFullNumber(overview.totalOutput)}>
                Out {formatCompactNumber(overview.totalOutput)}
              </span>
            </StatDescription>
          </Stat>
          <Stat>
            <StatLabel>Prompts · replies · failures</StatLabel>
            <StatIndicator variant="icon" color="default">
              <MessageSquare className="size-3.5" aria-hidden />
            </StatIndicator>
            <StatValue className="text-lg leading-snug tabular-nums">
              <span title={formatFullNumber(overview.totalPromptSubmits)}>
                {formatCompactNumber(overview.totalPromptSubmits)}
              </span>
              <span className="text-muted-foreground/80"> / </span>
              <span title={formatFullNumber(overview.totalAgentResponses)}>
                {formatCompactNumber(overview.totalAgentResponses)}
              </span>
              <span className="text-muted-foreground/80"> / </span>
              <span title={formatFullNumber(overview.totalToolFailures)}>
                {formatCompactNumber(overview.totalToolFailures)}
              </span>
            </StatValue>
            <StatDescription>
              prompt_submit, agent_response, and post_tool_use_failure totals.
            </StatDescription>
          </Stat>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">
          Daily activity
        </h3>
        <p className="mb-3 max-w-2xl text-xs text-muted-foreground">
          Bar charts bucket by your machine&apos;s local calendar day so
          multi-day work shows up as a time series, not a single aggregate bar.
        </p>
        <div className="grid min-w-0 gap-4 xl:grid-cols-2 [&>section]:min-w-0">
          <GlobalDailySingleBarChart buckets={dailySeries} metric="events" />
          <GlobalDailySingleBarChart buckets={dailySeries} metric="tokens" />
          <GlobalDailySingleBarChart buckets={dailySeries} metric="sessions" />
          <GlobalDailyStackedPromptsRepliesChart buckets={dailySeries} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Records</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <RecordStat
            title="Longest session (wall time)"
            icon={<Clock className="size-3.5" aria-hidden />}
            highlight={records.longest}
            valueLabel={
              records.longest
                ? formatDurationMs(records.longest.wallTimeMs)
                : "—"
            }
            onSelectSession={onSelectSession}
          />
          <RecordStat
            title="Most tokens (single session)"
            icon={<Sparkles className="size-3.5" aria-hidden />}
            highlight={records.mostTokens}
            valueLabel={
              records.mostTokens
                ? formatCompactNumber(records.mostTokens.totalTokens)
                : "—"
            }
            valueTitle={
              records.mostTokens
                ? formatFullNumber(records.mostTokens.totalTokens)
                : undefined
            }
            onSelectSession={onSelectSession}
          />
          <RecordStat
            title="Most events (single session)"
            icon={<Layers className="size-3.5" aria-hidden />}
            highlight={records.mostEvents}
            valueLabel={
              records.mostEvents
                ? formatCompactNumber(records.mostEvents.eventCount)
                : "—"
            }
            valueTitle={
              records.mostEvents
                ? formatFullNumber(records.mostEvents.eventCount)
                : undefined
            }
            onSelectSession={onSelectSession}
          />
          <RecordStat
            title="Most user prompts (single session)"
            icon={<MessageSquare className="size-3.5" aria-hidden />}
            highlight={records.mostPrompts}
            valueLabel={
              records.mostPrompts
                ? formatCompactNumber(records.mostPrompts.promptSubmitCount)
                : "—"
            }
            valueTitle={
              records.mostPrompts
                ? formatFullNumber(records.mostPrompts.promptSubmitCount)
                : undefined
            }
            onSelectSession={onSelectSession}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Leaderboards</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-foreground">
              Top sessions by tokens
            </h4>
            <ol className="mt-3 divide-y divide-border/60 text-sm">
              {topByTokens.length === 0 ? (
                <li className="py-2 text-muted-foreground">No sessions yet.</li>
              ) : (
                topByTokens.map((s, i) => (
                  <li key={s.conversationId} className="list-none py-0">
                    <button
                      type="button"
                      onClick={() => onSelectSession(s.conversationId)}
                      aria-label={`Open session: ${sessionTitle(s)}`}
                      className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-3 gap-y-1 rounded-md py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[1.75rem_minmax(0,1fr)_auto] sm:grid-rows-1 sm:items-center"
                    >
                      <span className="hidden text-muted-foreground tabular-nums sm:block sm:row-span-1">
                        {i + 1}
                      </span>
                      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2">
                        <span className="mr-2 text-muted-foreground tabular-nums sm:hidden">
                          {i + 1}.
                        </span>
                        <span className="font-medium leading-snug text-foreground">
                          {sessionTitle(s)}
                        </span>
                      </div>
                      <div
                        className="col-span-2 text-right sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:self-center sm:text-right"
                        title={formatFullNumber(s.totalTokens)}
                      >
                        <span className="tabular-nums text-sm font-semibold text-foreground">
                          {formatCompactNumber(s.totalTokens)}
                        </span>
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          tok
                        </span>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ol>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-foreground">
              Top sessions by event count
            </h4>
            <ol className="mt-3 divide-y divide-border/60 text-sm">
              {topByEvents.length === 0 ? (
                <li className="py-2 text-muted-foreground">No sessions yet.</li>
              ) : (
                topByEvents.map((s, i) => (
                  <li key={s.conversationId} className="list-none py-0">
                    <button
                      type="button"
                      onClick={() => onSelectSession(s.conversationId)}
                      aria-label={`Open session: ${sessionTitle(s)}`}
                      className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-3 gap-y-1 rounded-md py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[1.75rem_minmax(0,1fr)_auto] sm:grid-rows-1 sm:items-center"
                    >
                      <span className="hidden text-muted-foreground tabular-nums sm:block">
                        {i + 1}
                      </span>
                      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2">
                        <span className="mr-2 text-muted-foreground tabular-nums sm:hidden">
                          {i + 1}.
                        </span>
                        <span className="font-medium leading-snug text-foreground">
                          {sessionTitle(s)}
                        </span>
                      </div>
                      <div
                        className="col-span-2 text-right sm:col-span-1 sm:col-start-3 sm:self-center sm:text-right"
                        title={formatFullNumber(s.eventCount)}
                      >
                        <span className="tabular-nums text-sm font-semibold text-foreground">
                          {formatCompactNumber(s.eventCount)}
                        </span>
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          evt
                        </span>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ol>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Composition</h3>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3 [&>section]:min-w-0">
          <CompositionPieChart
            title="Tokens by model (all sessions)"
            description="Share of total tokens; model is forward-filled within each session."
            data={tokensPie.data}
            total={tokensPie.total}
            show={tokensPie.show}
          />
          <CompositionPieChart
            title="Events by kind (all sessions)"
            description="Every stored event kind across the database."
            data={kindsPie.data}
            total={kindsPie.total}
            show={kindsPie.show}
          />
          <CompositionPieChart
            title="Tool time by channel (all sessions)"
            description="Sum of duration_ms from tool, shell, MCP, and subagent stop events."
            data={durationPie.data}
            total={durationPie.total}
            show={durationPie.show}
          />
        </div>
      </div>
    </div>
  );
}
