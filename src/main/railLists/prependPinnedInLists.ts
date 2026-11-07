import type { SessionRailLists } from "./SessionRailLists";

/** Insert at the top of pinned. */
export function prependPinnedInLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  if (lists.pinnedIds.includes(sessionId)) {
    return {
      pinnedIds: [sessionId, ...lists.pinnedIds.filter((id) => id !== sessionId)],
      unpinnedIds: lists.unpinnedIds,
    };
  }
  return {
    pinnedIds: [sessionId, ...lists.pinnedIds],
    unpinnedIds: lists.unpinnedIds.filter((id) => id !== sessionId),
  };
}
