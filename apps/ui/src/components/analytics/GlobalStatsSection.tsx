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
import { formatDurationMs } from "./formatDuration";
import { pieDataFromSeries } from "./pieDataFromSeries";

const numFmt = new Intl.NumberFormat();

function sessionTitle(h: GlobalSessionHighlight | null): string {
  if (!h) return "—";
  return (h.label?.trim() || "Untitled").slice(0, 80);
}

function RecordStat({
  title,
  icon,
  highlight,
  valueLabel,
  onSelectSession,
}: {
  title: string;
  icon: ReactNode;
  highlight: GlobalSessionHighlight | null;
  valueLabel: string;
  onSelectSession: (id: string) => void;
}) {
  return (
    <Stat>
      <StatLabel>{title}</StatLabel>
      <StatIndicator variant="icon" color="default">
        {icon}
      </StatIndicator>
      <StatValue className="text-base tabular-nums">{valueLabel}</StatValue>
      <StatDescription className="space-y-1">
        {highlight ? (
          <>
            <div className="line-clamp-2 font-medium text-foreground">
              {sessionTitle(highlight)}
            </div>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => onSelectSession(highlight.conversationId)}
            >
              Open session
            </Button>
          </>
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
    return (
      <section
        aria-label="Global stats"
        className="rounded-lg border border-border bg-card p-4"
      >
        <h2 className="text-lg font-medium tracking-tight">Global stats</h2>
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      </section>
    );
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
              className="h-5 text-[0.65rem] font-medium uppercase tracking-wide"
            >
              Includes est.
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
              {numFmt.format(overview.sessionCount)}
            </StatValue>
            <StatDescription>Distinct conversation IDs in the database.</StatDescription>
          </Stat>
          <Stat>
            <StatLabel>Events stored</StatLabel>
            <StatIndicator variant="icon" color="default">
              <Hash className="size-3.5" aria-hidden />
            </StatIndicator>
            <StatValue className="tabular-nums">
              {numFmt.format(overview.eventCount)}
            </StatValue>
            <StatDescription>
              {overview.orphanedEventCount > 0
                ? `${numFmt.format(overview.orphanedEventCount)} without a conversation id.`
                : "All events are tied to a session."}
            </StatDescription>
          </Stat>
          <Stat>
            <StatLabel>Tokens (in + out)</StatLabel>
            <StatIndicator variant="icon" color="info">
              <Sparkles className="size-3.5" aria-hidden />
            </StatIndicator>
            <StatValue className="tabular-nums">
              {numFmt.format(tokenTotal)}
            </StatValue>
            <StatDescription>
              In {numFmt.format(overview.totalInput)} · Out{" "}
              {numFmt.format(overview.totalOutput)}
            </StatDescription>
          </Stat>
          <Stat>
            <StatLabel>Prompts / replies / tool failures</StatLabel>
            <StatIndicator variant="icon" color="default">
              <MessageSquare className="size-3.5" aria-hidden />
            </StatIndicator>
            <StatValue className="text-sm leading-snug tabular-nums">
              {numFmt.format(overview.totalPromptSubmits)} /{" "}
              {numFmt.format(overview.totalAgentResponses)} /{" "}
              {numFmt.format(overview.totalToolFailures)}
            </StatValue>
            <StatDescription>
              Total prompt_submit, agent_response, and post_tool_use_failure events.
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
                ? numFmt.format(records.mostTokens.totalTokens)
                : "—"
            }
            onSelectSession={onSelectSession}
          />
          <RecordStat
            title="Most events (single session)"
            icon={<Layers className="size-3.5" aria-hidden />}
            highlight={records.mostEvents}
            valueLabel={
              records.mostEvents
                ? numFmt.format(records.mostEvents.eventCount)
                : "—"
            }
            onSelectSession={onSelectSession}
          />
          <RecordStat
            title="Most user prompts (single session)"
            icon={<MessageSquare className="size-3.5" aria-hidden />}
            highlight={records.mostPrompts}
            valueLabel={
              records.mostPrompts
                ? numFmt.format(records.mostPrompts.promptSubmitCount)
                : "—"
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
            <ol className="mt-3 space-y-2 text-sm">
              {topByTokens.length === 0 ? (
                <li className="text-muted-foreground">No sessions yet.</li>
              ) : (
                topByTokens.map((s, i) => (
                  <li
                    key={s.conversationId}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-muted-foreground tabular-nums">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {sessionTitle(s)}
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => onSelectSession(s.conversationId)}
                      >
                        Open
                      </Button>
                    </div>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {numFmt.format(s.totalTokens)} tok
                    </span>
                  </li>
                ))
              )}
            </ol>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-foreground">
              Top sessions by event count
            </h4>
            <ol className="mt-3 space-y-2 text-sm">
              {topByEvents.length === 0 ? (
                <li className="text-muted-foreground">No sessions yet.</li>
              ) : (
                topByEvents.map((s, i) => (
                  <li
                    key={s.conversationId}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-muted-foreground tabular-nums">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {sessionTitle(s)}
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => onSelectSession(s.conversationId)}
                      >
                        Open
                      </Button>
                    </div>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {numFmt.format(s.eventCount)} evt
                    </span>
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
