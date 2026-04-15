/** Minimal event row shape for session analytics (matches DB selection). */
export type EventRowForAnalytics = {
  receivedAt: string;
  kind: string;
  hookEventName: string;
  model: string | null;
  detail: string;
  /** Present when aggregating across sessions (`analytics.global`). */
  conversationId?: string | null;
};

export type PieSegment = {
  id: string;
  label: string;
  value: number;
};

export type PieSeries = {
  segments: PieSegment[];
  total: number;
  meta?: {
    includesEstimated?: boolean;
  };
};

export type SessionSummary = {
  totalInput: number;
  totalOutput: number;
  totalsIncludeEstimated: boolean;
  promptSubmitCount: number;
  agentResponseCount: number;
  toolFailureCount: number;
  /** Wall time: `session_end.duration_ms` when present, else span of first/last `receivedAt`. */
  wallTimeMs: number;
  wallTimeSource: "session_end" | "received_at_span";
};

export type SessionPieCharts = {
  tokensByModel: PieSeries;
  eventKinds: PieSeries;
  toolDuration: PieSeries;
};

/** Return shape of `analytics.session` and `computeSessionAnalytics`. */
export type SessionAnalyticsBundle = {
  summary: SessionSummary;
  pies: SessionPieCharts;
};

export type GlobalSessionHighlight = {
  conversationId: string;
  label: string | null;
  wallTimeMs: number;
  wallTimeSource: "session_end" | "received_at_span";
  totalTokens: number;
  eventCount: number;
  promptSubmitCount: number;
  agentResponseCount: number;
};

export type GlobalOverview = {
  sessionCount: number;
  eventCount: number;
  orphanedEventCount: number;
  totalInput: number;
  totalOutput: number;
  totalsIncludeEstimated: boolean;
  totalPromptSubmits: number;
  totalAgentResponses: number;
  totalToolFailures: number;
};

export type GlobalRecords = {
  longest: GlobalSessionHighlight | null;
  mostTokens: GlobalSessionHighlight | null;
  mostEvents: GlobalSessionHighlight | null;
  mostPrompts: GlobalSessionHighlight | null;
};

/** One calendar day in the **local** timezone (`YYYY-MM-DD`). */
export type GlobalDailyBucket = {
  day: string;
  eventCount: number;
  tokenTotal: number;
  promptSubmitCount: number;
  agentResponseCount: number;
  /** Distinct `conversation_id` values with ≥1 event that day. */
  sessionDistinctCount: number;
};

/** Return shape of `analytics.global`. */
export type GlobalAnalyticsBundle = {
  overview: GlobalOverview;
  pies: SessionPieCharts;
  records: GlobalRecords;
  topByTokens: GlobalSessionHighlight[];
  topByEvents: GlobalSessionHighlight[];
  /** Sorted ascending by `day` (local calendar). */
  dailySeries: GlobalDailyBucket[];
};
