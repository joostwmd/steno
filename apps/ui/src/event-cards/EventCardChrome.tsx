import { Badge } from "@/components/ui/badge";
import { TokenInOutBadges } from "@/components/token-in-out-badges";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTimestampHuman } from "@/lib/formatTimestamp";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { PickedTokenUsage } from "./tokenUsageFromDetail";

const tokenCountFmt = new Intl.NumberFormat();

const HOOK_TITLES: Record<string, string> = {
  sessionStart: "Session started",
  sessionEnd: "Session ended",
  preToolUse: "Tool (before)",
  postToolUse: "Tool (after)",
  postToolUseFailure: "Tool failed",
  beforeReadFile: "Read file",
  beforeSubmitPrompt: "User prompt",
  afterAgentResponse: "Assistant response",
  afterAgentThought: "Thought",
  beforeShellExecution: "Shell (before)",
  afterShellExecution: "Shell (after)",
  beforeMCPExecution: "MCP (before)",
  afterMCPExecution: "MCP (after)",
  afterFileEdit: "File edited",
  preCompact: "Context compaction",
  stop: "Stop",
  subagentStart: "Subagent started",
  subagentStop: "Subagent finished",
};

export function hookTitle(hookEventName: string): string {
  return HOOK_TITLES[hookEventName] ?? hookEventName;
}

export function EventCardChrome({
  hookEventName,
  kind,
  receivedAt,
  model,
  tokenUsage,
  className,
  children,
}: {
  hookEventName: string;
  kind: string;
  receivedAt: string;
  model: string | null;
  /** Shown in the header row when present (e.g. afterAgentResponse). */
  tokenUsage?: PickedTokenUsage;
  className?: string;
  children: ReactNode;
}) {
  const showTokens =
    tokenUsage &&
    (tokenUsage.input != null || tokenUsage.output != null);
  const estimated = tokenUsage?.source === "estimated";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-b border-border/50 px-3 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default font-medium text-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
                {hookTitle(hookEventName)}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={6}
              hideArrow
              className="max-w-sm flex-col items-stretch gap-1 px-3.5 py-2 text-left font-mono text-[11px] leading-snug [&_p]:m-0"
            >
              <p>
                <span className="text-muted-foreground">kind:</span> {kind}
              </p>
              <p>
                <span className="text-muted-foreground">hook:</span>{" "}
                {hookEventName}
              </p>
            </TooltipContent>
          </Tooltip>
          {showTokens ? (
            <div className="flex flex-wrap items-center gap-2">
              <TokenInOutBadges
                input={tokenUsage.input ?? null}
                output={tokenUsage.output ?? null}
                format={tokenCountFmt}
                size="sm"
                variant="secondary"
              />
              {estimated ? (
                <Badge
                  variant="outline"
                  className="h-6 text-[0.65rem] font-medium uppercase tracking-wide"
                >
                  est.
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <span className="tabular-nums">
            {formatTimestampHuman(receivedAt)}
          </span>
          {model ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className="max-w-[14rem] cursor-default truncate font-mono font-normal"
                  variant="secondary"
                >
                  {model}
                </Badge>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="max-w-md break-all font-mono text-[11px]"
              >
                {model}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
      <div className="px-3 py-3.5">{children}</div>
    </div>
  );
}
