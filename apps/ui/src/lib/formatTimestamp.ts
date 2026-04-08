/**
 * Formats an ISO-8601 instant for display in the user's locale and timezone.
 */
export function formatTimestampHuman(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
