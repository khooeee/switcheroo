import { MAX_PINNED_SESSIONS } from "../../shared/maxPinnedSessions";
import type { SessionRailLists } from "./SessionRailLists";
import { prependUnpinnedInLists } from "./prependUnpinnedInLists";

/** Insert at the top of pinned; falls back to unpinned when at the pin cap. */
export function prependPinnedInLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  if (lists.pinnedIds.includes(sessionId)) {
    return {
      pinnedIds: [sessionId, ...lists.pinnedIds.filter((id) => id !== sessionId)],
      unpinnedIds: lists.unpinnedIds,
    };
  }
  if (lists.pinnedIds.length >= MAX_PINNED_SESSIONS) {
    return prependUnpinnedInLists(lists, sessionId);
  }
  return {
    pinnedIds: [sessionId, ...lists.pinnedIds],
    unpinnedIds: lists.unpinnedIds.filter((id) => id !== sessionId),
  };
}
