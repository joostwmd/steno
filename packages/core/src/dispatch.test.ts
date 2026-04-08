import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CANONICAL_SCHEMA_VERSION } from "./canonical.js";
import { formatHookPayload } from "./dispatch.js";
import type { FormatContext } from "./formatContext.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

function loadFixture(name: string): unknown {
  const path = join(repoRoot, "fixtures", "hooks", `${name}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function ctx(): FormatContext {
  return { receivedAt: "2026-04-08T12:00:00.000Z" };
}

describe("formatHookPayload", () => {
  it("maps beforeReadFile with full file content", () => {
    const raw = loadFixture("beforeReadFile");
    const out = formatHookPayload(raw, ctx());
    expect(out.schema_version).toBe(CANONICAL_SCHEMA_VERSION);
    expect(out.hook_event_name).toBe("beforeReadFile");
    expect(out.kind).toBe("file_read");
    expect(out.detail).toMatchObject({
      file_path: "/path/to/project/.cursor/sample.md",
      attachment_count: 0,
    });
    expect(out.detail.content).toBe("# Sample file for telemetry fixtures\n");
    expect(out.detail).not.toHaveProperty("content_preview");
  });

  it("maps beforeSubmitPrompt with full prompt text", () => {
    const raw = loadFixture("beforeSubmitPrompt");
    const out = formatHookPayload(raw, ctx());
    expect(out.kind).toBe("prompt_submit");
    expect(String(out.detail.prompt)).toContain("refactor");
    expect(out.detail).not.toHaveProperty("prompt_preview");
    expect(out.detail.token_usage_source).toBe("estimated");
    expect(typeof out.detail.token_usage_input).toBe("number");
    expect(out.detail.token_usage_input as number).toBeGreaterThan(0);
  });

  it("maps afterAgentResponse with provider usage", () => {
    const raw = loadFixture("afterAgentResponseWithUsage");
    const out = formatHookPayload(raw, ctx());
    expect(out.kind).toBe("agent_response");
    expect(out.detail.token_usage_source).toBe("provider");
    expect(out.detail.token_usage_input).toBe(100);
    expect(out.detail.token_usage_output).toBe(25);
  });

  it("maps afterShellExecution output per Cursor docs", () => {
    const raw = loadFixture("afterShellExecution");
    const out = formatHookPayload(raw, ctx());
    expect(out.kind).toBe("shell_after");
    expect(out.detail.duration_ms).toBe(1200);
    expect(out.detail.sandbox).toBe(false);
    expect(String(out.detail.output)).toContain("PASS");
  });

  it("falls back to unknown formatter with full payload fields", () => {
    const raw = loadFixture("unknownHook");
    const out = formatHookPayload(raw, ctx());
    expect(out.hook_event_name).toBe("futureCursorHook");
    expect(out.detail.custom_field).toBe("kept");
    expect(out.detail.prompt).toBe(
      "this should be redacted to preview when not full",
    );
    expect(out.detail).not.toHaveProperty("prompt_preview");
  });
});
