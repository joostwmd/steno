import type {
  EventRowForAnalytics,
  PieSegment,
  PieSeries,
  SessionAnalyticsBundle,
  SessionPieCharts,
  SessionSummary,
} from "./types.js";

/** Max visible pie slices before merging into `other`. */
export const PIE_MAX_SEGMENTS = 8;

function parseDetail(detail: string): Record<string, unknown> | null {
  try {
    return JSON.parse(detail) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function nonNegInt(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
    return 0;
  }
  return v;
}

function nonNegNumber(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return 0;
  return Math.floor(v);
}

function modelKeyFromRow(model: string | null): string {
  const t = model?.trim();
  return t && t.length > 0 ? t : "unknown";
}

function mergeTailToOther(
  entries: [string, number][],
  maxSegments: number,
): PieSegment[] {
  if (entries.length === 0) {
    return [];
  }
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const cap = Math.max(1, maxSegments);
  if (sorted.length <= cap) {
    return sorted.map(([id, value]) => ({
      id: sanitizePieId(id),
      label: id,
      value,
    }));
  }
  const head = sorted.slice(0, cap - 1);
  const tailSum = sorted.slice(cap - 1).reduce((s, [, v]) => s + v, 0);
  const segments: PieSegment[] = head.map(([id, value]) => ({
    id: sanitizePieId(id),
    label: id,
    value,
  }));
  segments.push({ id: "other", label: "Other", value: tailSum });
  return segments;
}

function sanitizePieId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "segment";
}

const DURATION_KINDS = new Set([
  "post_tool_use",
  "shell_after",
  "mcp_after",
  "post_tool_use_failure",
  "subagent_stop",
]);

function toolDurationLabel(kind: string, detail: Record<string, unknown>): string {
  const toolName =
    typeof detail.tool_name === "string" && detail.tool_name.trim().length > 0
      ? detail.tool_name.trim()
      : null;
  if (kind === "shell_after") return toolName ? `Shell: ${toolName}` : "Shell";
  if (kind === "mcp_after") return toolName ? `MCP: ${toolName}` : "MCP";
  if (kind === "subagent_stop") {
    const st =
      typeof detail.subagent_type === "string" && detail.subagent_type.trim()
        ? detail.subagent_type.trim()
        : "subagent";
    return `Subagent: ${st}`;
  }
  if (toolName) return toolName;
  return kind;
}

/**
 * Session analytics: summary + pie series.
 * Mutates nothing; sorts a copy of rows by `receivedAt` ascending.
 */
export function computeSessionAnalytics(
  rows: EventRowForAnalytics[],
): SessionAnalyticsBundle {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime(),
  );

  let lastModel = "unknown";
  let totalsIncludeEstimated = false;

  const tokensByModelMap = new Map<string, number>();
  const kindCounts = new Map<string, number>();
  const toolDurationMap = new Map<string, number>();

  let totalInput = 0;
  let totalOutput = 0;
  let promptSubmitCount = 0;
  let agentResponseCount = 0;
  let toolFailureCount = 0;

  let wallFromSessionEnd: number | undefined;
  let firstTs = Number.POSITIVE_INFINITY;
  let lastTs = Number.NEGATIVE_INFINITY;

  for (const row of sorted) {
    const t = new Date(row.receivedAt).getTime();
    if (!Number.isNaN(t)) {
      if (t < firstTs) firstTs = t;
      if (t > lastTs) lastTs = t;
    }

    const mk = modelKeyFromRow(row.model);
    if (row.model?.trim()) {
      lastModel = mk;
    }

    kindCounts.set(row.kind, (kindCounts.get(row.kind) ?? 0) + 1);
    if (row.kind === "prompt_submit") promptSubmitCount += 1;
    if (row.kind === "agent_response") agentResponseCount += 1;
    if (row.kind === "post_tool_use_failure") toolFailureCount += 1;

    const detail = parseDetail(row.detail);
    if (!detail) continue;

    if (row.kind === "session_end") {
      const d = nonNegNumber(detail.duration_ms);
      if (d > 0) wallFromSessionEnd = d;
    }

    if (detail.token_usage_source === "estimated") {
      totalsIncludeEstimated = true;
    }
    const inN = nonNegInt(detail.token_usage_input);
    const outN = nonNegInt(detail.token_usage_output);
    if (inN > 0 || outN > 0) {
      totalInput += inN;
      totalOutput += outN;
      const sum = inN + outN;
      tokensByModelMap.set(lastModel, (tokensByModelMap.get(lastModel) ?? 0) + sum);
    }

    if (DURATION_KINDS.has(row.kind)) {
      const dur = nonNegNumber(detail.duration_ms);
      if (dur > 0) {
        const label = toolDurationLabel(row.kind, detail);
        toolDurationMap.set(label, (toolDurationMap.get(label) ?? 0) + dur);
      }
    }
  }

  const spanMs =
    firstTs !== Number.POSITIVE_INFINITY && lastTs !== Number.NEGATIVE_INFINITY
      ? Math.max(0, lastTs - firstTs)
      : 0;

  const summary: SessionSummary = {
    totalInput,
    totalOutput,
    totalsIncludeEstimated,
    promptSubmitCount,
    agentResponseCount,
    toolFailureCount,
    wallTimeMs: wallFromSessionEnd ?? spanMs,
    wallTimeSource: wallFromSessionEnd !== undefined ? "session_end" : "received_at_span",
  };

  const tokensByModel: PieSeries = {
    segments: mergeTailToOther(
      [...tokensByModelMap.entries()],
      PIE_MAX_SEGMENTS,
    ),
    total: [...tokensByModelMap.values()].reduce((a, b) => a + b, 0),
    meta: { includesEstimated: totalsIncludeEstimated },
  };

  const eventKinds: PieSeries = {
    segments: mergeTailToOther([...kindCounts.entries()], PIE_MAX_SEGMENTS),
    total: sorted.length,
  };

  const toolDuration: PieSeries = {
    segments: mergeTailToOther([...toolDurationMap.entries()], PIE_MAX_SEGMENTS),
    total: [...toolDurationMap.values()].reduce((a, b) => a + b, 0),
  };

  const pies: SessionPieCharts = {
    tokensByModel,
    eventKinds,
    toolDuration,
  };

  return { summary, pies };
}
