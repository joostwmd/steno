import { useMemo } from "react";
import { EventCardChrome } from "./EventCardChrome";
import { parseEventDetail } from "./parseDetail";
import { RawEventJson } from "./RawEventJson";
import { renderEventBody } from "./renderEventBody";
import {
  HOOKS_WITH_TOKEN_USAGE,
  pickTokenUsage,
} from "./tokenUsageFromDetail";
import type { EventRow } from "./types";

export function EventCard({
  event,
  selectedConversationId = null,
}: {
  event: EventRow;
  /** When set, session start events can omit redundant session_id. */
  selectedConversationId?: string | null;
}) {
  const detail = useMemo(() => parseEventDetail(event.detail), [event.detail]);

  const tokenUsage = useMemo(() => {
    if (!HOOKS_WITH_TOKEN_USAGE.has(event.hookEventName)) return undefined;
    const p = pickTokenUsage(detail);
    if (p.input == null && p.output == null) return undefined;
    return p;
  }, [detail, event.hookEventName]);

  return (
    <EventCardChrome
      hookEventName={event.hookEventName}
      kind={event.kind}
      model={event.model}
      receivedAt={event.receivedAt}
      tokenUsage={tokenUsage}
    >
      {renderEventBody(event, detail, { selectedConversationId })}
      <RawEventJson detail={detail} event={event} />
    </EventCardChrome>
  );
}
