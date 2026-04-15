import { CirclePlay, CircleStop, Loader2, RefreshCw } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  syncPending: boolean;
  onSync: () => void;
};

export function SiteHeader({
  autoRefresh,
  onAutoRefreshChange,
  syncPending,
  onSync,
}: SiteHeaderProps) {
  return (
    <header className="flex h-14 w-full min-w-0 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <SidebarTrigger size="icon-sm" className="-ml-0.5 shrink-0" />
      <Separator
        orientation="vertical"
        className="mr-1 shrink-0 data-[orientation=vertical]:h-4"
      />

      <div className="ml-auto flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-pressed={autoRefresh}
              aria-label={
                autoRefresh
                  ? "Live updates on — polling every 5 seconds. Click to pause."
                  : "Live updates off. Click to stream new events every 5 seconds."
              }
              onClick={() => onAutoRefreshChange(!autoRefresh)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-[color,box-shadow,border-color,background-color,transform] active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                autoRefresh
                  ? "border-blue-500 bg-background text-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_14px_rgba(59,130,246,0.2)] dark:border-blue-400 dark:text-blue-400 dark:shadow-[0_0_0_1px_rgba(96,165,250,0.4),0_0_16px_rgba(59,130,246,0.25)]"
                  : "border-border bg-muted text-foreground hover:bg-muted/80",
              )}
            >
              {autoRefresh ? (
                <CircleStop className="size-[18px] shrink-0" aria-hidden />
              ) : (
                <CirclePlay className="size-[18px] shrink-0" aria-hidden />
              )}
              <span>Live</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-center">
            {autoRefresh
              ? "Polling every 5s. Click to pause."
              : "Paused. Click to poll every 5s."}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Import latest events from telemetry"
              aria-busy={syncPending}
              disabled={syncPending}
              onClick={onSync}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-foreground transition-[color,background-color,border-color,transform] hover:bg-muted/80 active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {syncPending ? (
                <Loader2
                  className="size-[18px] animate-spin text-muted-foreground"
                  aria-hidden
                />
              ) : (
                <RefreshCw
                  className="size-[18px] text-muted-foreground"
                  aria-hidden
                />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-center">
            Pull the newest Cursor hook events from disk into this app.
          </TooltipContent>
        </Tooltip>

        <ModeToggle />
      </div>
    </header>
  );
}
