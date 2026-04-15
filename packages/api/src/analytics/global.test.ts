import { describe, expect, it } from "vitest";
import type { EventRowForAnalytics } from "./types.js";
import { computeGlobalAnalytics } from "./global.js";

describe("computeGlobalAnalytics", () => {
  function row(
    partial: Pick<
      EventRowForAnalytics,
      "receivedAt" | "kind" | "conversationId"
    > &
      Partial<Omit<EventRowForAnalytics, "receivedAt" | "kind">> & {
        detailObj?: Record<string, unknown>;
      },
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
      conversationId: partial.conversationId,
    };
  }

  it("builds dailySeries with local calendar buckets", () => {
    const day0 = new Date(2026, 2, 10, 14, 0, 0);
    const day1 = new Date(2026, 2, 11, 9, 0, 0);
    const labels = new Map<string, string | null>([["s1", "Alpha"]]);

    const bundle = computeGlobalAnalytics(
      [
        row({
          receivedAt: day0.toISOString(),
          conversationId: "s1",
          kind: "prompt_submit",
          detailObj: {},
        }),
        row({
          receivedAt: day1.toISOString(),
          conversationId: "s1",
          kind: "agent_response",
          detailObj: {
            token_usage_input: 2,
            token_usage_output: 1,
          },
        }),
      ],
      labels,
    );

    expect(bundle.dailySeries).toHaveLength(2);
    expect(bundle.dailySeries[0]?.day < bundle.dailySeries[1]?.day).toBe(true);
    expect(
      bundle.dailySeries.reduce((s, b) => s + b.eventCount, 0),
    ).toBe(2);
    expect(
      bundle.dailySeries.reduce((s, b) => s + b.tokenTotal, 0),
    ).toBe(3);
    expect(
      bundle.dailySeries.reduce((s, b) => s + b.promptSubmitCount, 0),
    ).toBe(1);
    expect(
      bundle.dailySeries.reduce((s, b) => s + b.agentResponseCount, 0),
    ).toBe(1);
    expect(new Set(bundle.dailySeries.map((b) => b.day)).size).toBe(2);
    expect(
      Math.max(...bundle.dailySeries.map((b) => b.sessionDistinctCount)),
    ).toBe(1);
  });
});
