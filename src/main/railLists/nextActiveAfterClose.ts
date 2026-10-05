import type { SessionRailLists } from "./SessionRailLists";

/** Rail order: next after `sessionId`, else previous, else null (caller uses Switchboard). */
export function nextActiveAfterClose(lists: SessionRailLists, sessionId: string): string | null {
  const order = [...lists.pinnedIds, ...lists.unpinnedIds];
  const index = order.indexOf(sessionId);
  if (index < 0) return null;
  return order[index + 1] ?? order[index - 1] ?? null;
}
