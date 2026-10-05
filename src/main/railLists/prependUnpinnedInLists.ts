import type { SessionRailLists } from "./SessionRailLists";

export function prependUnpinnedInLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  if (lists.pinnedIds.includes(sessionId)) return lists;
  return {
    pinnedIds: lists.pinnedIds,
    unpinnedIds: [sessionId, ...lists.unpinnedIds.filter((id) => id !== sessionId)],
  };
}
