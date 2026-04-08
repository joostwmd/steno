import {
  AlertTriangle,
  CirclePlay,
  CircleStop,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  syncPending: boolean;
  onSync: () => void;
  /** When set (e.g. Vite dev), shows a control that calls `dev.throwSampleError` on the API. */
  onDevTestErrorToast?: () => void;
};

export function SiteHeader({
  autoRefresh,
  onAutoRefreshChange,
  syncPending,
  onSync,
  onDevTestErrorToast,
}: SiteHeaderProps) {
  return (
    <header className="flex h-14 w-full min-w-0 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <SidebarTrigger size="icon-sm" className="-ml-0.5 shrink-0" />
      <Separator
        orientation="vertical"
        className="mr-1 shrink-0 data-[orientation=vertical]:h-4"
      />

      <div className="ml-auto flex items-center gap-2">
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
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-[color,box-shadow,border-color,background-color]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            autoRefresh
              ? "border-blue-500 bg-background text-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_14px_rgba(59,130,246,0.2)] dark:border-blue-400 dark:text-blue-400 dark:shadow-[0_0_0_1px_rgba(96,165,250,0.4),0_0_16px_rgba(59,130,246,0.25)]"
              : "border-neutral-300 bg-neutral-100 text-neutral-900 hover:bg-neutral-200/80 dark:border-neutral-700 dark:bg-[#1a1a1a] dark:text-white dark:hover:bg-[#222]",
          )}
        >
          {autoRefresh ? (
            <CircleStop className="size-[18px] shrink-0" aria-hidden />
          ) : (
            <CirclePlay className="size-[18px] shrink-0" aria-hidden />
          )}
          <span>Live</span>
        </button>

        {onDevTestErrorToast ? (
          <button
            type="button"
            aria-label="Trigger a deliberate API error to test error toasts"
            onClick={onDevTestErrorToast}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border border-dashed transition-[color,background-color,border-color]",
              "border-amber-500/50 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "dark:border-amber-400/40 dark:text-amber-200 dark:hover:bg-amber-500/15",
            )}
          >
            <AlertTriangle className="size-[18px]" aria-hidden />
          </button>
        ) : null}

        <button
          type="button"
          aria-label="Import latest events from telemetry"
          aria-busy={syncPending}
          disabled={syncPending}
          onClick={onSync}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-[color,background-color,border-color]",
            "border-neutral-300 bg-neutral-100 text-neutral-900 hover:bg-neutral-200/80",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:pointer-events-none disabled:cursor-not-allowed",
            "dark:border-neutral-700 dark:bg-[#1a1a1a] dark:text-neutral-100 dark:hover:bg-[#222]",
          )}
        >
          {syncPending ? (
            <Loader2
              className="size-[18px] animate-spin text-neutral-500 dark:text-neutral-400"
              aria-hidden
            />
          ) : (
            <RefreshCw
              className="size-[18px] text-neutral-700 dark:text-neutral-200"
              aria-hidden
            />
          )}
        </button>

        <ModeToggle />
      </div>
    </header>
  );
}
