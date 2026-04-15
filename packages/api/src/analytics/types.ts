/** Minimal event row shape for session analytics (matches DB selection). */
export type EventRowForAnalytics = {
  receivedAt: string;
  kind: string;
  hookEventName: string;
  model: string | null;
  detail: string;
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
