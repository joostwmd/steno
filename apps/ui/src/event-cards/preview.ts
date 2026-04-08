import type { ParsedDetail } from "./types";

export function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function num(v: unknown): number | undefined {
  return typeof v === "number" && !Number.isNaN(v) ? v : undefined;
}

export function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

export function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/** Truncate for one-line summaries in cards. */
export function truncateOneLine(s: string, max = 120): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** First N lines of multiline output for previews. */
export function firstLines(s: string, lines = 4, maxChars = 600): string {
  const parts = s.split("\n").slice(0, lines);
  let out = parts.join("\n");
  if (out.length > maxChars) out = `${out.slice(0, maxChars)}…`;
  return out;
}

/** Stringify detail values for display (full content, no truncation). */
export function stringifyDetailValue(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/** Heuristic: string looks like a JS/Node stack trace worth parsing. */
export function looksLikeJsStack(text: string): boolean {
  if (!text || text.length < 40) return false;
  const lines = text.split("\n");
  const atLines = lines.filter((l) => /^\s*at\s+/.test(l));
  if (atLines.length < 2) return false;
  const head = lines[0] ?? "";
  if (/^(\w+Error|Error):\s/.test(head.trim())) return true;
  if (text.includes("Error:") && atLines.length >= 2) return true;
  return false;
}

export function pickPromptText(d: ParsedDetail): string | undefined {
  return str(d.prompt) ?? str(d.prompt_preview);
}

export function pickResponseText(d: ParsedDetail): string | undefined {
  return str(d.text) ?? str(d.text_preview);
}

export function pickThoughtText(d: ParsedDetail): string | undefined {
  return str(d.text) ?? str(d.text_preview);
}
