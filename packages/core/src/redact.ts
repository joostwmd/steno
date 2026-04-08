/**
 * Build a detail object from arbitrary hook payloads when no specific formatter exists.
 * Recurses into nested objects; arrays and attachments are left as-is.
 */
export function redactUnknownDetail(
  o: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      k !== "attachments"
    ) {
      out[k] = redactUnknownDetail(v as Record<string, unknown>);
      continue;
    }
    out[k] = v;
  }
  return out;
}
