/** Row shape returned by `events.bySession` (Drizzle camelCase). */
export type EventRow = {
  id: number;
  receivedAt: string;
  schemaVersion: number;
  hookEventName: string;
  kind: string;
  conversationId: string | null;
  generationId: string | null;
  model: string | null;
  cursorVersion: string | null;
  workspaceRoots: string | null;
  userEmail: string | null;
  transcriptPath: string | null;
  detail: string;
};

export type ParsedDetail = Record<string, unknown>;
