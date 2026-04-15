import {
  MessageSquare,
  MessagesSquare,
  Timer,
  Hash,
  AlertTriangle,
} from "lucide-react";
import type { SessionSummary } from "@steno/api";
import {
  Stat,
  StatDescription,
  StatIndicator,
  StatLabel,
  StatValue,
} from "@/components/ui/stat";
import { formatDurationMs } from "./formatDuration";

const numFmt = new Intl.NumberFormat();

type SessionStatGridProps = {
  summary: SessionSummary;
};

export function SessionStatGrid({ summary }: SessionStatGridProps) {
  const tokenTotal = summary.totalInput + summary.totalOutput;
  const wallDesc =
    summary.wallTimeSource === "session_end"
      ? "From session end hook (IDE-reported)."
      : "Span from first to last stored event in this session.";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Stat>
        <StatLabel>Tokens (in + out)</StatLabel>
        <StatIndicator variant="icon" color="info">
          <Hash className="size-3.5" aria-hidden />
        </StatIndicator>
        <StatValue className="tabular-nums">
          {numFmt.format(tokenTotal)}
        </StatValue>
        <StatDescription>
          In {numFmt.format(summary.totalInput)} · Out{" "}
          {numFmt.format(summary.totalOutput)}
          {summary.totalsIncludeEstimated
            ? " · Includes estimated usage where provider totals were missing."
            : null}
        </StatDescription>
      </Stat>

      <Stat>
        <StatLabel>User prompts</StatLabel>
        <StatIndicator variant="icon" color="default">
          <MessageSquare className="size-3.5" aria-hidden />
        </StatIndicator>
        <StatValue className="tabular-nums">
          {numFmt.format(summary.promptSubmitCount)}
        </StatValue>
        <StatDescription>Count of prompt_submit events.</StatDescription>
      </Stat>

      <Stat>
        <StatLabel>Assistant replies</StatLabel>
        <StatIndicator variant="icon" color="default">
          <MessagesSquare className="size-3.5" aria-hidden />
        </StatIndicator>
        <StatValue className="tabular-nums">
          {numFmt.format(summary.agentResponseCount)}
        </StatValue>
        <StatDescription>Count of agent_response events.</StatDescription>
      </Stat>

      <Stat>
        <StatLabel>Session time</StatLabel>
        <StatIndicator variant="icon" color="success">
          <Timer className="size-3.5" aria-hidden />
        </StatIndicator>
        <StatValue>{formatDurationMs(summary.wallTimeMs)}</StatValue>
        <StatDescription>{wallDesc}</StatDescription>
      </Stat>

      <Stat>
        <StatLabel>Tool failures</StatLabel>
        <StatIndicator variant="icon" color="warning">
          <AlertTriangle className="size-3.5" aria-hidden />
        </StatIndicator>
        <StatValue className="tabular-nums">
          {numFmt.format(summary.toolFailureCount)}
        </StatValue>
        <StatDescription>post_tool_use_failure events.</StatDescription>
      </Stat>
    </div>
  );
}
