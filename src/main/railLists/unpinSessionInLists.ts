import type { SessionRailLists } from "./SessionRailLists";

export function unpinSessionInLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  if (!lists.pinnedIds.includes(sessionId)) return lists;
  return {
    pinnedIds: lists.pinnedIds.filter((id) => id !== sessionId),
    unpinnedIds: [sessionId, ...lists.unpinnedIds.filter((id) => id !== sessionId)],
  };
}
