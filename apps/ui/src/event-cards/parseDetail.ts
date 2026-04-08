import type { ParsedDetail } from "./types";

export function parseEventDetail(detail: string): ParsedDetail {
  try {
    const v = JSON.parse(detail) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as ParsedDetail;
    }
    return { _parsedNonObject: detail };
  } catch {
    return { _raw: detail };
  }
}
