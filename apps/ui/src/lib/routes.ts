/** Home route shows global stats. */
export const HOME_PATH = "/" as const;

export function sessionPath(conversationId: string): string {
  return `/${encodeURIComponent(conversationId)}`;
}
