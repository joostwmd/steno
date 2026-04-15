import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatCompactNumber,
  formatFullNumber,
} from "@/lib/formatCompactNumber";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

const defaultFormat = new Intl.NumberFormat();

type TokenInOutBadgesProps = {
  /** Omit a badge when undefined (e.g. estimated output-only). */
  input?: number | null;
  output?: number | null;
  /** Full precision with grouping (overrides compact display). */
  format?: Intl.NumberFormat;
  /** When true (default), show compact tokens with full value on hover. */
  compact?: boolean;
  className?: string;
  size?: "default" | "sm";
  variant?: "secondary" | "outline";
};

export function TokenInOutBadges({
  input,
  output,
  format,
  compact = true,
  className,
  size = "default",
  variant = "secondary",
}: TokenInOutBadgesProps) {
  const sm = size === "sm";
  const showIn = input != null;
  const showOut = output != null;
  if (!showIn && !showOut) return null;

  const fmtIn = (n: number) =>
    format ? format.format(n) : compact ? formatCompactNumber(n) : defaultFormat.format(n);
  const fmtOut = fmtIn;
  const titleFor = (n: number) =>
    format ? undefined : compact ? formatFullNumber(n) : undefined;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="Token totals"
    >
      {showIn ? (
        <Badge
          variant={variant}
          title={titleFor(input)}
          className={cn(
            "gap-1 tabular-nums font-medium",
            sm ? "h-6 px-2.5 text-[0.65rem]" : "px-3 text-xs",
          )}
        >
          <ArrowDownToLine
            className={cn(
              "shrink-0 text-muted-foreground",
              sm ? "size-2.5" : "size-3",
            )}
            aria-hidden
          />
          <span className="sr-only">Input tokens: </span>
          {fmtIn(input)} in
        </Badge>
      ) : null}
      {showOut ? (
        <Badge
          variant={variant}
          title={titleFor(output)}
          className={cn(
            "gap-1 tabular-nums font-medium",
            sm ? "h-6 px-2.5 text-[0.65rem]" : "px-3 text-xs",
          )}
        >
          <ArrowUpFromLine
            className={cn(
              "shrink-0 text-muted-foreground",
              sm ? "size-2.5" : "size-3",
            )}
            aria-hidden
          />
          <span className="sr-only">Output tokens: </span>
          {fmtOut(output)} out
        </Badge>
      ) : null}
    </div>
  );
}
