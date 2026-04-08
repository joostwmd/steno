import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EventRow } from "@/event-cards/types";
import { uniqueSortedHooks, toolNamesForHooks } from "@/lib/sessionFilters";
import { Download, Filter } from "lucide-react";

type SessionEventsToolbarProps = {
  events: EventRow[];
  selectedHooks: Set<string>;
  onToggleHook: (hook: string, checked: boolean) => void;
  selectedTools: Set<string>;
  onToggleTool: (tool: string, checked: boolean) => void;
  onExport: () => void;
};

export function SessionEventsToolbar({
  events,
  selectedHooks,
  onToggleHook,
  selectedTools,
  onToggleTool,
  onExport,
}: SessionEventsToolbarProps) {
  const hookOptions = uniqueSortedHooks(events);
  const toolOptions = toolNamesForHooks(events, selectedHooks);

  return (
    <ButtonGroup className="shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={hookOptions.length === 0}
            className="gap-1.5"
          >
            <Filter className="size-3.5" aria-hidden />
            Filters
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="max-h-[min(70vh,24rem)] w-56 overflow-y-auto"
        >
          <DropdownMenuLabel>Hook type</DropdownMenuLabel>
          {hookOptions.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No events to filter.
            </p>
          ) : (
            hookOptions.map((h) => (
              <DropdownMenuCheckboxItem
                key={h}
                checked={selectedHooks.has(h)}
                onCheckedChange={(c) => onToggleHook(h, c === true)}
              >
                <span className="font-mono text-xs">{h}</span>
              </DropdownMenuCheckboxItem>
            ))
          )}
          {toolOptions.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Tool / MCP name</DropdownMenuLabel>
              <p className="px-2 pb-1 text-[0.65rem] leading-snug text-muted-foreground">
                When any are checked, only matching tool/MCP events (among
                selected hooks) are shown.
              </p>
              {toolOptions.map((t) => (
                <DropdownMenuCheckboxItem
                  key={t}
                  checked={selectedTools.has(t)}
                  onCheckedChange={(c) => onToggleTool(t, c === true)}
                >
                  <span className="font-mono text-xs">{t}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onExport}
      >
        <Download className="size-3.5" aria-hidden />
        Export
      </Button>
    </ButtonGroup>
  );
}
