import type { EventRow } from "@/event-cards/types";
import { parseDetailRecord } from "./sessionFilters";

export type SessionExportMeta = {
  label: string | null;
  eventCount: number;
  lastEventAt: string;
};

export function buildSessionExportPayload(
  conversationId: string,
  session: SessionExportMeta,
  events: EventRow[],
) {
  return {
    conversationId,
    exportedAt: new Date().toISOString(),
    session,
    events: events.map((row) => ({
      ...row,
      detail: parseDetailRecord(row.detail),
    })),
  };
}

/** One-shot download via blob URL (no File System Access API — avoids save-picker permission UX). */
export function downloadSessionJson(
  conversationId: string,
  payload: ReturnType<typeof buildSessionExportPayload>,
): void {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${conversationId}.json`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  queueMicrotask(() => URL.revokeObjectURL(url));
}
