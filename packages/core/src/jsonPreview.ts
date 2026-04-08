/** Preserve hook payload values for canonical detail (no truncation). */
export function previewJsonish(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value;
}
