/** Sidebar / selection sentinel for the global stats view (not a real conversation id). */
export const GLOBAL_STATS_ID = "__steno_global_stats__" as const;

export function isGlobalStatsView(selectedId: string | null): boolean {
  return selectedId === GLOBAL_STATS_ID;
}
