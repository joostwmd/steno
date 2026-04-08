import { describe, expect, it } from "vitest";
import {
  countTokensForModelEstimate,
  extractTokenUsage,
  mergeResponseTokenUsage,
} from "./tokenUsage.js";

describe("extractTokenUsage", () => {
  it("reads OpenAI-style usage object", () => {
    expect(
      extractTokenUsage({
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }),
    ).toEqual({ input: 10, output: 20 });
  });

  it("reads Anthropic-style usage object", () => {
    expect(
      extractTokenUsage({
        usage: { input_tokens: 5, output_tokens: 7 },
      }),
    ).toEqual({ input: 5, output: 7 });
  });

  it("reads flat prompt/completion keys", () => {
    expect(
      extractTokenUsage({
        prompt_tokens: 3,
        completion_tokens: 4,
      }),
    ).toEqual({ input: 3, output: 4 });
  });

  it("merges top-level with nested usage (nested fills gaps)", () => {
    expect(
      extractTokenUsage({
        prompt_tokens: 1,
        usage: { completion_tokens: 2 },
      }),
    ).toEqual({ input: 1, output: 2 });
  });

  it("returns undefined when incomplete", () => {
    expect(extractTokenUsage({ usage: { prompt_tokens: 1 } })).toBeUndefined();
    expect(extractTokenUsage({})).toBeUndefined();
  });

  it("rejects negative numbers", () => {
    expect(
      extractTokenUsage({
        prompt_tokens: -1,
        completion_tokens: 1,
      }),
    ).toBeUndefined();
  });
});

describe("countTokensForModelEstimate", () => {
  it("returns positive count for non-empty text", () => {
    const n = countTokensForModelEstimate("gpt-4o", "hello world");
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(100);
  });
});

describe("mergeResponseTokenUsage", () => {
  it("sets provider fields when extract succeeds", () => {
    const detail: Record<string, unknown> = { text: "hi" };
    mergeResponseTokenUsage(
      {
        model: "gpt-4o",
        usage: { prompt_tokens: 9, completion_tokens: 1 },
      },
      detail,
      "hi",
    );
    expect(detail.token_usage_source).toBe("provider");
    expect(detail.token_usage_input).toBe(9);
    expect(detail.token_usage_output).toBe(1);
  });

  it("estimates output when provider missing", () => {
    const detail: Record<string, unknown> = { text: "alpha beta" };
    mergeResponseTokenUsage({ model: "gpt-4o" }, detail, "alpha beta");
    expect(detail.token_usage_source).toBe("estimated");
    expect(detail.token_usage_input).toBeUndefined();
    expect(typeof detail.token_usage_output).toBe("number");
    expect(detail.token_usage_output as number).toBeGreaterThan(0);
  });
});
