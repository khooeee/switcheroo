import type { SessionRailLists } from "./SessionRailLists";

export function removeSessionFromLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  return {
    pinnedIds: lists.pinnedIds.filter((id) => id !== sessionId),
    unpinnedIds: lists.unpinnedIds.filter((id) => id !== sessionId),
  };
}
