import type {
  EventRowForAnalytics,
  GlobalAnalyticsBundle,
  GlobalDailyBucket,
  GlobalOverview,
  GlobalRecords,
  GlobalSessionHighlight,
  PieSeries,
  SessionPieCharts,
} from "./types.js";
import {
  DURATION_KINDS,
  mergeTailToOther,
  PIE_MAX_SEGMENTS,
  toolDurationLabel,
} from "./session.js";

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

function sortKeyCid(id: string | null | undefined): string {
  const t = id?.trim();
  return t && t.length > 0 ? t : "\uFFFF_orphan";
}

/** Local calendar day for bucketing (matches how users think about “each day”). */
function localDayKeyFromReceivedAt(iso: string): string | null {
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DailyScratch = {
  eventCount: number;
  tokenTotal: number;
  promptSubmitCount: number;
  agentResponseCount: number;
  sessionIds: Set<string>;
};

function emptyDailyScratch(): DailyScratch {
  return {
    eventCount: 0,
    tokenTotal: 0,
    promptSubmitCount: 0,
    agentResponseCount: 0,
    sessionIds: new Set(),
  };
}

type SessionAgg = {
  wallEndFromHook?: number;
  minTs: number;
  maxTs: number;
  events: number;
  prompts: number;
  responses: number;
  failures: number;
  input: number;
  output: number;
};

function emptyAgg(): SessionAgg {
  return {
    minTs: Number.POSITIVE_INFINITY,
    maxTs: Number.NEGATIVE_INFINITY,
    events: 0,
    prompts: 0,
    responses: 0,
    failures: 0,
    input: 0,
    output: 0,
  };
}

function finalizeWall(a: SessionAgg): {
  wallTimeMs: number;
  wallTimeSource: "session_end" | "received_at_span";
} {
  const span =
    a.minTs !== Number.POSITIVE_INFINITY && a.maxTs !== Number.NEGATIVE_INFINITY
      ? Math.max(0, a.maxTs - a.minTs)
      : 0;
  if (a.wallEndFromHook !== undefined && a.wallEndFromHook > 0) {
    return { wallTimeMs: a.wallEndFromHook, wallTimeSource: "session_end" };
  }
  return { wallTimeMs: span, wallTimeSource: "received_at_span" };
}

function toHighlight(
  cid: string,
  labels: Map<string, string | null>,
  a: SessionAgg,
): GlobalSessionHighlight {
  const { wallTimeMs, wallTimeSource } = finalizeWall(a);
  return {
    conversationId: cid,
    label: labels.get(cid) ?? null,
    wallTimeMs,
    wallTimeSource,
    totalTokens: a.input + a.output,
    eventCount: a.events,
    promptSubmitCount: a.prompts,
    agentResponseCount: a.responses,
  };
}

/**
 * Aggregate all stored events across sessions (forward-fill model per session).
 */
export function computeGlobalAnalytics(
  rows: EventRowForAnalytics[],
  sessionLabels: Map<string, string | null>,
): GlobalAnalyticsBundle {
  const sorted = [...rows].sort((a, b) => {
    const ca = sortKeyCid(a.conversationId);
    const cb = sortKeyCid(b.conversationId);
    if (ca !== cb) return ca.localeCompare(cb);
    return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
  });

  const bySession = new Map<string, SessionAgg>();
  const tokensByModelMap = new Map<string, number>();
  const kindCounts = new Map<string, number>();
  const toolDurationMap = new Map<string, number>();
  const dailyScratch = new Map<string, DailyScratch>();

  let orphanedEventCount = 0;
  let totalsIncludeEstimated = false;
  let totalInput = 0;
  let totalOutput = 0;
  let totalPromptSubmits = 0;
  let totalAgentResponses = 0;
  let totalToolFailures = 0;

  let lastCid: string | null = null;
  let lastModel = "unknown";

  for (const row of sorted) {
    const cidRaw = row.conversationId?.trim();
    const cid = cidRaw && cidRaw.length > 0 ? cidRaw : null;

    const dayKey = localDayKeyFromReceivedAt(row.receivedAt);
    if (dayKey) {
      let d = dailyScratch.get(dayKey);
      if (!d) {
        d = emptyDailyScratch();
        dailyScratch.set(dayKey, d);
      }
      d.eventCount += 1;
      if (row.kind === "prompt_submit") d.promptSubmitCount += 1;
      if (row.kind === "agent_response") d.agentResponseCount += 1;
      if (cid) d.sessionIds.add(cid);
    }

    kindCounts.set(row.kind, (kindCounts.get(row.kind) ?? 0) + 1);
    if (row.kind === "prompt_submit") totalPromptSubmits += 1;
    if (row.kind === "agent_response") totalAgentResponses += 1;
    if (row.kind === "post_tool_use_failure") totalToolFailures += 1;

    const detail = parseDetail(row.detail);
    if (!detail) continue;

    if (DURATION_KINDS.has(row.kind)) {
      const dur = nonNegNumber(detail.duration_ms);
      if (dur > 0) {
        const label = toolDurationLabel(row.kind, detail);
        toolDurationMap.set(label, (toolDurationMap.get(label) ?? 0) + dur);
      }
    }

    if (detail.token_usage_source === "estimated") {
      totalsIncludeEstimated = true;
    }
    const inN = nonNegInt(detail.token_usage_input);
    const outN = nonNegInt(detail.token_usage_output);
    const tokenSum = inN + outN;

    if (cid === null) {
      orphanedEventCount += 1;
      if (tokenSum > 0) {
        const om = modelKeyFromRow(row.model);
        totalInput += inN;
        totalOutput += outN;
        tokensByModelMap.set(om, (tokensByModelMap.get(om) ?? 0) + tokenSum);
        if (dayKey) {
          const d = dailyScratch.get(dayKey);
          if (d) d.tokenTotal += tokenSum;
        }
      }
      continue;
    }

    if (cid !== lastCid) {
      lastCid = cid;
      lastModel = "unknown";
    }
    if (row.model?.trim()) {
      lastModel = modelKeyFromRow(row.model);
    }

    let agg = bySession.get(cid);
    if (!agg) {
      agg = emptyAgg();
      bySession.set(cid, agg);
    }

    const t = new Date(row.receivedAt).getTime();
    if (!Number.isNaN(t)) {
      if (t < agg.minTs) agg.minTs = t;
      if (t > agg.maxTs) agg.maxTs = t;
    }
    agg.events += 1;
    if (row.kind === "prompt_submit") agg.prompts += 1;
    if (row.kind === "agent_response") agg.responses += 1;
    if (row.kind === "post_tool_use_failure") agg.failures += 1;

    if (row.kind === "session_end") {
      const d = nonNegNumber(detail.duration_ms);
      if (d > 0) agg.wallEndFromHook = d;
    }

    if (tokenSum > 0) {
      agg.input += inN;
      agg.output += outN;
      totalInput += inN;
      totalOutput += outN;
      tokensByModelMap.set(lastModel, (tokensByModelMap.get(lastModel) ?? 0) + tokenSum);
      if (dayKey) {
        const d = dailyScratch.get(dayKey);
        if (d) d.tokenTotal += tokenSum;
      }
    }
  }

  const sessionCount = bySession.size;
  const eventCount = sorted.length;

  const overview: GlobalOverview = {
    sessionCount,
    eventCount,
    orphanedEventCount,
    totalInput,
    totalOutput,
    totalsIncludeEstimated,
    totalPromptSubmits,
    totalAgentResponses,
    totalToolFailures,
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
    total: eventCount,
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

  const highlights: GlobalSessionHighlight[] = [...bySession.entries()].map(
    ([id, agg]) => toHighlight(id, sessionLabels, agg),
  );

  const byWall = [...highlights].sort((a, b) => b.wallTimeMs - a.wallTimeMs);
  const byTokens = [...highlights].sort(
    (a, b) => b.totalTokens - a.totalTokens,
  );
  const byEvents = [...highlights].sort((a, b) => b.eventCount - a.eventCount);
  const byPrompts = [...highlights].sort(
    (a, b) => b.promptSubmitCount - a.promptSubmitCount,
  );

  const records: GlobalRecords = {
    longest: byWall[0] ?? null,
    mostTokens: byTokens[0] ?? null,
    mostEvents: byEvents[0] ?? null,
    mostPrompts: byPrompts[0] ?? null,
  };

  const topByTokens = byTokens.slice(0, 5);
  const topByEvents = byEvents.slice(0, 5);

  const dailySeries: GlobalDailyBucket[] = [...dailyScratch.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, d]) => ({
      day,
      eventCount: d.eventCount,
      tokenTotal: d.tokenTotal,
      promptSubmitCount: d.promptSubmitCount,
      agentResponseCount: d.agentResponseCount,
      sessionDistinctCount: d.sessionIds.size,
    }));

  return { overview, pies, records, topByTokens, topByEvents, dailySeries };
}
