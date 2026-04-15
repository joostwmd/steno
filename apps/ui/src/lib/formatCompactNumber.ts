/** Locale-aware compact notation (e.g. 115M, 894K, 1.2M). */
const compact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 2,
});

const full = new Intl.NumberFormat();

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return compact.format(value);
}

export function formatFullNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return full.format(value);
}

/** Optional title / aria-label for abbreviated displays. */
export function formatNumberTitle(value: number): string | undefined {
  if (!Number.isFinite(value)) return undefined;
  const c = compact.format(value);
  const f = full.format(value);
  return c === f ? undefined : f;
}
