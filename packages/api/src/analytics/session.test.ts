import { describe, expect, it } from "vitest";
import type { EventRowForAnalytics } from "./types.js";
import { computeSessionAnalytics, PIE_MAX_SEGMENTS } from "./session.js";

describe("computeSessionAnalytics", () => {
  function row(
    partial: Pick<EventRowForAnalytics, "receivedAt" | "kind" | "model"> &
      Partial<Omit<EventRowForAnalytics, "receivedAt" | "kind" | "model">> &
      { detailObj?: Record<string, unknown> },
  ): EventRowForAnalytics {
    const detail =
      partial.detail ??
      JSON.stringify(partial.detailObj ?? {});
    return {
      receivedAt: partial.receivedAt,
      kind: partial.kind,
      hookEventName: partial.hookEventName ?? partial.kind,
      model: partial.model ?? null,
      detail,
    };
  }

  it("forward-fills model for token rows missing model", () => {
    const bundle = computeSessionAnalytics([
      row({
        receivedAt: "2026-01-01T10:00:00.000Z",
        kind: "session_start",
        model: "model-a",
        detailObj: {},
      }),
      row({
        receivedAt: "2026-01-01T11:00:00.000Z",
        kind: "agent_response",
        model: null,
        detailObj: {
          token_usage_input: 10,
          token_usage_output: 5,
        },
      }),
    ]);
    const m = bundle.pies.tokensByModel.segments.find((s) => s.label === "model-a");
    expect(m?.value).toBe(15);
    expect(bundle.summary.totalInput).toBe(10);
    expect(bundle.summary.totalOutput).toBe(5);
  });

  it("merges excess token-by-model slices into Other (cap)", () => {
    const rows: EventRowForAnalytics[] = [];
    for (let i = 0; i < PIE_MAX_SEGMENTS + 2; i++) {
      rows.push(
        row({
          receivedAt: `2026-05-01T${String(10 + i).padStart(2, "0")}:00:00.000Z`,
          kind: "agent_response",
          model: `model-${i}`,
          detailObj: {
            token_usage_input: 1,
            token_usage_output: 0,
          },
        }),
      );
    }
    const bundle = computeSessionAnalytics(rows);
    expect(bundle.pies.tokensByModel.segments.length).toBeLessThanOrEqual(
      PIE_MAX_SEGMENTS,
    );
    const other = bundle.pies.tokensByModel.segments.find((s) => s.id === "other");
    expect(other).toBeDefined();
    expect(bundle.pies.tokensByModel.total).toBe(PIE_MAX_SEGMENTS + 2);
  });
});
