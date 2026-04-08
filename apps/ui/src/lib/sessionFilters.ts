import type { EventRow } from "@/event-cards/types";

/** Hooks whose formatted `detail` includes `tool_name` (tool + MCP). */
export const HOOKS_WITH_TOOL_NAME = new Set<string>([
  "preToolUse",
  "postToolUse",
  "postToolUseFailure",
  "beforeMCPExecution",
  "afterMCPExecution",
]);

export function parseDetailRecord(detail: string): Record<string, unknown> {
  try {
    const v = JSON.parse(detail) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function toolNameFromDetail(detail: string): string | null {
  const t = parseDetailRecord(detail).tool_name;
  return typeof t === "string" && t.length > 0 ? t : null;
}

export function eventPassesFilters(
  event: EventRow,
  selectedHooks: Set<string>,
  selectedTools: Set<string>,
): boolean {
  if (!selectedHooks.has(event.hookEventName)) return false;
  if (selectedTools.size === 0) return true;
  if (!HOOKS_WITH_TOOL_NAME.has(event.hookEventName)) return true;
  const tn = toolNameFromDetail(event.detail);
  if (tn == null) return true;
  return selectedTools.has(tn);
}

export function uniqueSortedHooks(events: EventRow[]): string[] {
  return [...new Set(events.map((e) => e.hookEventName))].sort();
}

export function toolNamesForHooks(
  events: EventRow[],
  selectedHooks: Set<string>,
): string[] {
  const names = new Set<string>();
  for (const e of events) {
    if (!HOOKS_WITH_TOOL_NAME.has(e.hookEventName)) continue;
    if (!selectedHooks.has(e.hookEventName)) continue;
    const tn = toolNameFromDetail(e.detail);
    if (tn) names.add(tn);
  }
  return [...names].sort();
}
